#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { validateJobId } = require('./lib/nlm_common');

function locateNlm() {
  const res = spawnSync('nlm', ['--version'], { encoding: 'utf8' });
  if (res.status === 0) {
    return 'nlm';
  }

  const userProfile = process.env.USERPROFILE || 'C:\\Users\\User';
  const defaultPath = path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', 'nlm.exe');
  const resDefault = spawnSync(defaultPath, ['--version'], { encoding: 'utf8' });
  if (resDefault.status === 0) {
    return defaultPath;
  }

  return 'nlm';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripAnsi(text) {
  return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/** Map research_profile.depth to nlm CLI mode. nlm only supports 'fast' or 'deep'. */
function mapDepthToMode(depth) {
  switch (depth) {
    case 'quick': return 'fast';
    case 'standard': return 'deep';
    case 'deep': return 'deep';
    default: return 'deep';
  }
}

/**
 * research start --wait-and-import blocks until the research task completes
 * and its sources are imported, then prints a summary. This replaces the old
 * manual poll loop (Stage 1 start + Stage 2 status polling) that needed six
 * separate bug fixes and still left the outer bash timeout able to kill the
 * process mid-poll before checkpoint.json was written — which, combined with
 * always passing --title when no notebook id was resolved yet, was how a
 * single interrupted run could spawn several duplicate notebooks for the
 * same query. Trusting the CLI's own exit code (rather than retrying on a
 * local parse failure) removes that failure mode.
 */
async function startAndWait(nlmPath, { query, cliMode, notebookId, title, profile, timeoutMs }) {
  const args = ['research', 'start', query, '-m', cliMode, '--wait-and-import'];
  if (notebookId) {
    args.push('-n', notebookId);
  } else {
    args.push('--title', title);
  }
  if (profile) {
    args.push('-p', profile);
  }

  console.log(`Running: nlm ${args.join(' ')}`);
  console.log(`(mode=${cliMode}, will block until complete — timeout ${Math.round(timeoutMs / 1000)}s)`);

  const res = spawnSync(nlmPath, args, { encoding: 'utf8', timeout: timeoutMs });
  return res;
}

/**
 * Fallback used only when startAndWait was killed by our own client-side
 * timeout: we don't know whether the notebook/research actually completed
 * server-side. Try to recover the notebook id by title so the caller can at
 * least point a human at it instead of silently losing track of it.
 */
function tryRecoverNotebookByTitle(nlmPath, title, profile) {
  const args = ['list', 'notebooks', '--json'];
  if (profile) args.push('--profile', profile);
  const res = spawnSync(nlmPath, args, { encoding: 'utf8' });
  if (res.status !== 0) return null;
  try {
    const parsed = JSON.parse(res.stdout);
    const notebooks = Array.isArray(parsed) ? parsed : (parsed.notebooks || []);
    const matches = notebooks.filter(nb => (nb.title || '').includes(title.slice(0, 40)));
    if (matches.length === 0) return null;
    // Most recently created match, if a created_at-like field exists; otherwise last in list.
    matches.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
    return matches[0].id || matches[0].notebook_id || null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const nlmPath = locateNlm();
  const jobId = process.argv[2];
  validateJobId(jobId);

  const jobsDir = process.env.RESEARCH_JOBS_DIR;
  if (!jobsDir) {
    console.error("RESEARCH_JOBS_DIR environment variable is not defined");
    process.exit(1);
  }

  const jobDir = path.join(jobsDir, jobId);
  const specPath = path.join(jobDir, 'spec.json');
  const checkpointPath = path.join(jobDir, 'checkpoint.json');

  if (!fs.existsSync(specPath)) {
    console.error(`spec.json not found in ${jobDir}`);
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const query = spec.query;
  const profile = spec.profile;
  const budget = spec.budget || { max_sources: 50, max_duration_seconds: 900, max_retries: 3 };
  const maxRetries = Math.max(1, budget.max_retries || 3);

  const researchProfile = spec.research_profile || {};
  const cliMode = mapDepthToMode(researchProfile.depth);
  console.log(`Research profile depth=${researchProfile.depth || 'deep'} -> CLI mode=${cliMode}`);

  let checkpoint = {};
  if (fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  }

  if (checkpoint.stage && checkpoint.stage !== 'research' && checkpoint.notebook_id) {
    console.log(`Job ${jobId} already past the research stage (stage=${checkpoint.stage}, notebook=${checkpoint.notebook_id}). Nothing to do.`);
    process.exit(0);
  }

  // Once we've ever resolved a notebook id for this job, every subsequent
  // attempt (including retries) must reuse it via -n. Never fall back to
  // --title again after this point — that's what created duplicate notebooks.
  let resolvedNotebookId = checkpoint.notebook_id || spec.notebook_id || null;
  const title = query.length > 80 ? query.slice(0, 80) + '...' : query;
  const timeoutMs = ((budget.max_duration_seconds || 900) + 120) * 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Starting research task (attempt ${attempt}/${maxRetries})...`);
    const startBegin = Date.now();
    const resolved = await startAndWait(nlmPath, { query, cliMode, notebookId: resolvedNotebookId, title, profile, timeoutMs });
    const elapsedMs = Date.now() - startBegin;

    // Timed out client-side (spawnSync sets .error with code ETIMEDOUT / .signal).
    const timedOut = resolved.error && (resolved.error.code === 'ETIMEDOUT' || resolved.signal);
    if (timedOut) {
      console.warn(`Attempt ${attempt} timed out client-side after ${Math.round(elapsedMs / 1000)}s.`);
      const recovered = resolvedNotebookId || tryRecoverNotebookByTitle(nlmPath, title, profile);
      if (recovered) {
        checkpoint.notebook_id = recovered;
        checkpoint.stage = 'research';
        checkpoint.timed_out_locally = true;
        checkpoint.updated_at = new Date().toISOString();
        fs.mkdirSync(jobDir, { recursive: true });
        fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
        console.error(`Local wait timed out, but a matching notebook (${recovered}) was found. The research may still be running or may already be complete server-side — do not assume either. Check with 'nlm list sources ${recovered} --json' before proceeding, and re-run this script to resume once sources are confirmed present.`);
      } else {
        console.error(`Local wait timed out and no matching notebook could be recovered by title. Manually check 'nlm list notebooks --json' before retrying, to avoid creating a duplicate.`);
      }
      process.exit(1);
    }

    const stdout = stripAnsi(resolved.stdout || '');
    const stderr = stripAnsi(resolved.stderr || '');
    const combined = stdout + '\n' + stderr;
    fs.mkdirSync(jobDir, { recursive: true });
    fs.writeFileSync(path.join(jobDir, 'research_report.txt'), combined);

    if (resolved.status !== 0) {
      console.warn(`Attempt ${attempt} failed (exit ${resolved.status}): ${stderr || stdout || 'Unknown error'}`);
      if (attempt < maxRetries) {
        console.log(`Retrying in 10s...`);
        await sleep(10000);
        continue;
      }
      console.error(`Failed to complete research after ${maxRetries} attempts.`);
      process.exit(1);
    }

    // Success. Parse notebook id if this created a new notebook.
    const nbMatch = combined.match(/Notebook\s*ID:\s*([a-fA-F0-9-]+)/i);
    if (nbMatch) {
      resolvedNotebookId = nbMatch[1];
    }
    if (!resolvedNotebookId) {
      console.error(`Research call succeeded but no notebook id could be determined from output. Raw output saved to research_report.txt for manual inspection.`);
      process.exit(1);
    }

    checkpoint.stage = 'sources_ready';
    checkpoint.notebook_id = resolvedNotebookId;
    checkpoint.recheck_count = checkpoint.recheck_count || 0;
    checkpoint.updated_at = new Date().toISOString();
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));

    console.log(`Research complete. Notebook ID: ${resolvedNotebookId}`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
