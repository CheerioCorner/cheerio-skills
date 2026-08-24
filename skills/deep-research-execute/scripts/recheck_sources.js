#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { locateNlm, extractStructuredAnswer, loadJob, saveCheckpoint, queryNotebook } = require('./lib/nlm_common');

const MAX_RECHECKS = 3;

function buildPrompt(query) {
  return `原始研究主題是：「${query}」。請根據目前 Notebook 裡的所有來源，判斷這些來源是否足以完整回答這個主題。
只回傳一個 JSON 物件，不要有其他文字說明，格式如下：
{"sufficient": true} 或 {"sufficient": false, "gap_query": "具體描述還缺少哪個面向的資訊，用一句話寫成適合拿去搜尋的查詢字串"}`;
}

/** Kicks off a scoped follow-up research call into the SAME notebook and waits for it, mirroring run_research.js's --wait-and-import approach but always with -n (never --title, so it can never create a second notebook). */
function runGapResearch(nlmPath, notebookId, gapQuery, profile, timeoutMs) {
  const args = ['research', 'start', gapQuery, '-m', 'fast', '-n', notebookId, '--wait-and-import'];
  if (profile) args.push('-p', profile);
  console.log(`Gap research: nlm ${args.join(' ')}`);
  return spawnSync(nlmPath, args, { encoding: 'utf8', timeout: timeoutMs });
}

function main() {
  const jobId = process.argv[2];
  const { jobDir, checkpointPath, spec, checkpoint, notebookId } = loadJob(jobId);
  const nlmPath = locateNlm();
  const profile = spec.profile;
  const budget = spec.budget || {};
  const timeoutMs = ((budget.max_duration_seconds || 900) + 120) * 1000;

  checkpoint.recheck_count = checkpoint.recheck_count || 0;
  const log = [];

  const res = queryNotebook(nlmPath, notebookId, buildPrompt(spec.query), profile);
  if (res.status !== 0) {
    console.error(`FATAL: query notebook failed: ${res.stderr || res.stdout}`);
    process.exit(1);
  }
  const parsed = extractStructuredAnswer(res.stdout);
  if (!parsed || typeof parsed.sufficient !== 'boolean') {
    const rawPath = path.join(jobDir, 'recheck-raw.md');
    fs.writeFileSync(rawPath, res.stdout || '');
    console.error(`Gemini's response did not contain a parseable {"sufficient": ...}. Raw response saved to ${rawPath}. Treating as inconclusive — not looping automatically.`);
    process.exit(1);
  }

  if (parsed.sufficient) {
    checkpoint.stage = 'rechecked';
    checkpoint.recheck_outcome = 'sufficient';
    saveCheckpoint(checkpointPath, checkpoint);
    console.log('Sources judged sufficient. Ready for rename/query stages.');
    process.exit(0);
  }

  if (checkpoint.recheck_count >= MAX_RECHECKS) {
    checkpoint.stage = 'rechecked';
    checkpoint.recheck_outcome = 'exhausted';
    saveCheckpoint(checkpointPath, checkpoint);
    console.warn(`Reached the ${MAX_RECHECKS}-recheck limit. Proceeding with sources as-is; report should note coverage may be incomplete.`);
    process.exit(0);
  }

  checkpoint.recheck_count += 1;
  const gapQuery = parsed.gap_query || spec.query;
  console.log(`Not sufficient (recheck ${checkpoint.recheck_count}/${MAX_RECHECKS}). Gap: ${gapQuery}`);

  const gapRes = runGapResearch(nlmPath, notebookId, gapQuery, profile, timeoutMs);
  if (gapRes.status !== 0) {
    console.error(`FATAL: gap research failed: ${gapRes.stderr || gapRes.stdout}`);
    process.exit(1);
  }

  log.push({ round: checkpoint.recheck_count, gap_query: gapQuery, at: new Date().toISOString() });
  const logPath = path.join(jobDir, 'recheck-log.json');
  const existingLog = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
  fs.writeFileSync(logPath, JSON.stringify([...existingLog, ...log], null, 2));

  // Back to filtered stage so the caller re-runs quality_filter.js on the newly added sources, then this script again.
  checkpoint.stage = 'sources_ready';
  saveCheckpoint(checkpointPath, checkpoint);
  console.log(`Gap research imported. Re-run quality_filter.js then recheck_sources.js again.`);
}

if (require.main === module) {
  main();
}
