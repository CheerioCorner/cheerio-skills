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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Map research_profile.depth to nlm CLI mode. nlm only supports 'fast' or 'deep'. */
function mapDepthToMode(depth) {
  // nlm CLI valid modes: 'fast' (~30s, ~10 sources) | 'deep' (~5min, ~40 sources)
  switch (depth) {
    case 'quick': return 'fast';
    case 'standard': return 'deep';
    case 'deep': return 'deep';
    default: return 'deep';
  }
}

function parseDiscoveredSources(text) {
  const lines = text.split(/\r?\n/);
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase();
    if (l.startsWith("discovered sources") || l.includes("discovered source")) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) {
    return [];
  }
  
  const entries = [];
  const indexRe = /^\s*\[(\d+)\]\s*(.+)$/;
  const urlRe = /(https?:\/\/[^\s\)]+)/;
  
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(indexRe);
    if (m) {
      const idx = parseInt(m[1], 10);
      let title = m[2].trim();
      let url = "";
      
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith("http://") || nextLine.startsWith("https://")) {
          url = nextLine;
          i = j;
          break;
        }
        const urlMatch = nextLine.match(urlRe);
        if (urlMatch) {
          url = urlMatch[1].replace(/[.,\)]+$/, '');
          i = j;
          break;
        }
      }
      
      if (!url) {
        const urlMatch = title.match(urlRe);
        if (urlMatch) {
          url = urlMatch[1].replace(/[.,\)]+$/, '');
          title = title.replace(urlMatch[1], '').trim();
        }
      }
      
      entries.push({
        index: idx,
        title: title || "(無標題)",
        url: url.trim(),
        normalized_url: "",
        rating: "reference",
        filter_reasons: [],
        excluded: false
      });
    }
    i++;
  }
  
  const seen = new Set();
  const deduped = [];
  for (const entry of entries) {
    if (entry.url) {
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
    }
    deduped.push(entry);
  }
  
  return deduped;
}

async function main() {
  const nlmPath = locateNlm();
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: node run_research.js <job-id>");
    process.exit(1);
  }
  
  const jobsDir = process.env.RESEARCH_JOBS_DIR;
  if (!jobsDir) {
    console.error("RESEARCH_JOBS_DIR environment variable is not defined");
    process.exit(1);
  }
  
  const jobDir = path.join(jobsDir, jobId);
  const specPath = path.join(jobDir, 'spec.json');
  const checkpointPath = path.join(jobDir, 'checkpoint.json');
  const candidatesPath = path.join(jobDir, 'source-candidates.json');
  const reportPath = path.join(jobDir, 'research_report.txt');
  
  if (!fs.existsSync(specPath)) {
    console.error(`spec.json not found in ${jobDir}`);
    process.exit(1);
  }
  
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const query = spec.query;
  const notebookId = spec.notebook_id;
  const profile = spec.profile;
  const budget = spec.budget || { max_sources: 50, max_duration_seconds: 900, max_retries: 3 };
  const maxRetries = Math.max(1, budget.max_retries || 3);
  
  // Map research_profile.depth to CLI mode
  const researchProfile = spec.research_profile || {};
  const cliMode = mapDepthToMode(researchProfile.depth);
  console.log(`Research profile depth=${researchProfile.depth || 'deep'} → CLI mode=${cliMode}`);
  if (researchProfile.preferred_language) {
    console.log(`Preferred language: ${researchProfile.preferred_language}`);
  }
  if (researchProfile.source_bias) {
    console.log(`Source bias: ${researchProfile.source_bias}`);
  }
  if (researchProfile.output_format) {
    console.log(`Output format: ${researchProfile.output_format}`);
  }
  if (researchProfile.citation_required !== undefined) {
    console.log(`Citation required: ${researchProfile.citation_required}`);
  }
  
  let checkpoint = {};
  if (fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  }
  
  let taskId = checkpoint.provider_operation_id;
  let resolvedNotebookId = checkpoint.notebook_id || notebookId;
  
  // Accumulate wall-clock time from checkpoint (never reset on resume)
  let totalElapsedMs = checkpoint.total_elapsed_ms || 0;
  
  // --- Stage 1: Start (or resume) research task with retries ---
  if (checkpoint.stage === 'research' && taskId && resolvedNotebookId) {
    console.log(`Resuming research job ${jobId} with Task ID: ${taskId}`);
  } else {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Starting research task (attempt ${attempt}/${maxRetries})...`);
      const args = ['research', 'start', query, '-m', cliMode, '--force'];
      if (resolvedNotebookId) {
        args.push('-n', resolvedNotebookId);
      }
      if (profile) {
        args.push('-p', profile);
      }
      
      const startBegin = Date.now();
      const startRes = spawnSync(nlmPath, args, { encoding: 'utf8' });
      totalElapsedMs += Date.now() - startBegin;
      
      if (startRes.status !== 0) {
        const err = startRes.stderr || startRes.stdout || 'Unknown error';
        console.warn(`Attempt ${attempt} failed: ${err}`);
        if (attempt < maxRetries) {
          console.log(`Retrying in 10s...`);
          await sleep(10000);
          totalElapsedMs += 10000;
        }
        continue;
      }
      
      const stdout = startRes.stdout;
      const taskMatch = stdout.match(/Task\s*ID:\s*([a-fA-F0-9-]+)/i);
      if (!taskMatch) {
        const err = `Could not parse Task ID from output: ${stdout}`;
        console.warn(`Attempt ${attempt} failed: ${err}`);
        if (attempt < maxRetries) {
          console.log(`Retrying in 10s...`);
          await sleep(10000);
          totalElapsedMs += 10000;
        }
        continue;
      }
      taskId = taskMatch[1];
      
      // Parse Notebook ID if newly created
      const importMatch = stdout.match(/nlm research import\s+([a-fA-F0-9-]+)/i);
      if (importMatch) {
        resolvedNotebookId = importMatch[1];
      }
      
      checkpoint = {
        stage: 'research',
        provider_operation_id: taskId,
        notebook_id: resolvedNotebookId,
        total_elapsed_ms: totalElapsedMs,
        updated_at: new Date().toISOString()
      };
      fs.mkdirSync(jobDir, { recursive: true });
      fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
      console.log(`Started! Task ID: ${taskId}, Notebook ID: ${resolvedNotebookId}`);
      break;
    }
    if (!taskId) {
      console.error(`Failed to start research after ${maxRetries} attempts — no Task ID obtained.`);
      process.exit(1);
    }
  }
  
  const maxTotalMs = (budget.max_duration_seconds || 900) * 1000;
  const pollInterval = 300000; // 5 minutes between polls
  
  while (totalElapsedMs < maxTotalMs) {
    const isFirst = (totalElapsedMs === (checkpoint.total_elapsed_ms || 0));
    const currentWait = isFirst ? 110000 : pollInterval;
    const remainingMs = maxTotalMs - totalElapsedMs;
    const actualWait = Math.min(currentWait, remainingMs);
    
    if (actualWait > 0) {
      console.log(`Waiting ${actualWait / 1000}s for progress check...`);
      await sleep(actualWait);
    }
    
    // Measure wall-clock time including CLI call duration
    const pollStart = Date.now();
    console.log(`Polling status (total elapsed: ${Math.round(totalElapsedMs / 1000)}s / ${maxTotalMs / 1000}s)...`);
    const statusArgs = ['research', 'status', resolvedNotebookId, '--task-id', taskId, '--poll-interval', '30', '--max-wait', '110', '--full'];
    if (profile) {
      statusArgs.push('--profile', profile);
    }
    
    const statusRes = spawnSync(nlmPath, statusArgs, { encoding: 'utf8' });
    const pollDuration = Date.now() - pollStart;
    totalElapsedMs += pollDuration;
    const stdout = statusRes.stdout;
    
    // Save raw stdout to research_report.txt
    fs.writeFileSync(reportPath, stdout);
    
    const statusMatch = stdout.match(/Status:\s*([a-zA-Z0-9_-]+)/i) || stdout.match(/"status":\s*"([a-zA-Z0-9_-]+)"/i);
    const statusStr = statusMatch ? statusMatch[1].toLowerCase() : 'running';
    
    console.log(`Current Status: ${statusStr}`);
    
    if (statusStr === 'completed') {
      const candidates = parseDiscoveredSources(stdout);
      fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));
      
      checkpoint.stage = 'source_review';
      checkpoint.total_elapsed_ms = totalElapsedMs;
      checkpoint.updated_at = new Date().toISOString();
      fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
      
      console.log(`Research completed! Discovered ${candidates.length} sources and saved to source-candidates.json`);
      process.exit(0);
    }
    
    if (statusStr === 'failed') {
      console.error(`Research task failed on provider: ${statusRes.stderr || stdout}`);
      process.exit(1);
    }
    
    // Persist checkpoint with accumulated elapsed time so resume inherits it
    checkpoint.total_elapsed_ms = totalElapsedMs;
    checkpoint.updated_at = new Date().toISOString();
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }
  
  console.error(`Timeout waiting for research to complete after ${Math.round(totalElapsedMs / 1000)}s (limit: ${maxTotalMs / 1000}s).`);
  process.exit(1);
}

if (require.main === module) {
  main();
}
