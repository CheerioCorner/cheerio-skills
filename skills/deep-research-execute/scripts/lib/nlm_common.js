#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function stripAnsi(text) {
  return (text || '').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Gemini Notebook responses may wrap JSON in a fenced code block or in
 * conversational text around it. Try the fenced block first, then fall back
 * to the first top-level {...} span. Returns null (never throws) so callers
 * can treat "couldn't parse" as its own explicit, loud failure path instead
 * of guessing at what the model meant.
 */
function extractJson(text) {
  const clean = stripAnsi(text || '');
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [];
  if (fenced) candidates.push(fenced[1]);
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(clean.slice(firstBrace, lastBrace + 1));
  }
  for (const c of candidates) {
    try {
      return JSON.parse(c.trim());
    } catch (e) {
      // try next candidate
    }
  }
  return null;
}

/**
 * `nlm query notebook --json` wraps the model's reply in an envelope:
 * {"answer": "...", "question": "...", "conversation_id": "...", ...}.
 * When the prompt asked Gemini to reply with a JSON object, that object
 * comes back as a JSON-encoded *string* inside .answer, not at the
 * envelope's top level — extractJson(rawStdout) alone would return the
 * envelope itself (which parses fine as JSON but has no .remove/.renames/
 * .sufficient field). This unwraps one level further for that case.
 * Falls back to the envelope itself if .answer isn't further JSON.
 */
function extractStructuredAnswer(rawStdout) {
  const envelope = extractJson(rawStdout);
  if (envelope && typeof envelope.answer === 'string') {
    const inner = extractJson(envelope.answer);
    if (inner) return inner;
  }
  return envelope;
}

// Job ids are always minted by deep-research-intake as rc-YYYYMMDD-NNN (see its
// SKILL.md). Enforcing that shape here closes off path traversal via a jobId
// containing '..' or path separators before it ever reaches path.join(jobsDir, jobId).
const JOB_ID_RE = /^rc-\d{8}-\d{3}$/;

function validateJobId(jobId) {
  if (!jobId) {
    console.error("Usage: node <script>.js <job-id>");
    process.exit(1);
  }
  if (!JOB_ID_RE.test(jobId)) {
    console.error(`Invalid job id "${jobId}" — expected format rc-YYYYMMDD-NNN.`);
    process.exit(1);
  }
}

function loadJob(jobId) {
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
  let checkpoint = {};
  if (fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  }
  const notebookId = checkpoint.notebook_id || spec.notebook_id;
  if (!notebookId) {
    console.error(`No notebook_id in checkpoint or spec for job ${jobId}. Run run_research.js first.`);
    process.exit(1);
  }
  return { jobDir, specPath, checkpointPath, spec, checkpoint, notebookId };
}

function saveCheckpoint(checkpointPath, checkpoint) {
  checkpoint.updated_at = new Date().toISOString();
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

function listSources(nlmPath, notebookId, profile) {
  const args = ['list', 'sources', notebookId, '--json'];
  if (profile) args.push('--profile', profile);
  const res = spawnSync(nlmPath, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(`FATAL: Failed to list sources for notebook ${notebookId}: ${res.stderr || res.stdout}`);
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(res.stdout);
    return Array.isArray(parsed) ? parsed : (parsed.sources || []);
  } catch (e) {
    console.error(`FATAL: Could not parse source list JSON: ${e.message}`);
    process.exit(1);
  }
}

function queryNotebook(nlmPath, notebookId, question, profile, extraArgs) {
  const args = ['query', 'notebook', notebookId, question, '--json'];
  if (profile) args.push('--profile', profile);
  if (extraArgs) args.push(...extraArgs);
  return spawnSync(nlmPath, args, { encoding: 'utf8', timeout: 180000 });
}

module.exports = { locateNlm, stripAnsi, extractJson, extractStructuredAnswer, validateJobId, loadJob, saveCheckpoint, listSources, queryNotebook };
