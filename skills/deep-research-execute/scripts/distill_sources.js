#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { locateNlm, extractStructuredAnswer, loadJob, saveCheckpoint, listSources, queryNotebook } = require('./lib/nlm_common');

const HOLD_RATIO = 0.3; // if Gemini proposes removing more than this share of sources, stop and ask a human instead of auto-deleting

function buildPrompt(query, subQuestions) {
  const questions = (subQuestions && subQuestions.length > 0)
    ? subQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : `1. ${query}`;
  return `原始研究主題是：「${query}」，最終報告需要回答以下問題：
${questions}

請逐一檢視這個 Notebook 目前的每一筆來源，找出對「上述任何一題」都沒有實質貢獻的來源——內容離題、或整篇跟這次研究主題無關。

注意：**不要**因為某筆來源講的內容跟另一筆來源重疊或重複，就把它列入移除——多筆獨立來源證實同一件事是佐證，不是浪費，只有「對回答上述任何一題都沒有幫助」才算需要蒸餾掉的來源。

請只回傳一個 JSON 物件，不要有其他文字說明，格式如下：
{"remove": [{"title": "來源標題（要跟清單裡的標題完全一致）", "reason": "為什麼這筆來源對回答上述問題沒有貢獻"}]}
如果每一筆來源都至少對某一題有貢獻，回傳 {"remove": []}。`;
}

function deleteSources(nlmPath, ids, profile) {
  const delArgs = ['source', 'delete', ...ids, '--confirm', '--json'];
  if (profile) delArgs.push('--profile', profile);
  return spawnSync(nlmPath, delArgs, { encoding: 'utf8' });
}

function main() {
  const jobId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const { jobDir, checkpointPath, spec, checkpoint, notebookId } = loadJob(jobId);
  const nlmPath = locateNlm();
  const profile = spec.profile;
  const reportPath = path.join(jobDir, 'distill-report.json');

  if (apply) {
    if (!fs.existsSync(reportPath)) {
      console.error(`No distill-report.json found for job ${jobId}. Run "node distill_sources.js ${jobId}" (without --apply) first.`);
      process.exit(1);
    }
    const held = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (held.status !== 'held_for_review') {
      console.error(`distill-report.json status is "${held.status}", not "held_for_review" — nothing pending to apply.`);
      process.exit(1);
    }
    const ids = held.candidates.map(c => c.id).filter(Boolean);
    console.log(`Applying previously-proposed distillation: removing ${ids.length} source(s) after human review...`);
    const delRes = ids.length > 0 ? deleteSources(nlmPath, ids, profile) : { status: 0 };
    if (delRes.status !== 0) {
      console.error(`FATAL: source delete failed: ${delRes.stderr || delRes.stdout}`);
      process.exit(1);
    }
    const after = listSources(nlmPath, notebookId, profile);
    held.status = 'applied';
    held.applied_at = new Date().toISOString();
    held.after_count = after.length;
    fs.writeFileSync(reportPath, JSON.stringify(held, null, 2));
    checkpoint.stage = 'distilled';
    saveCheckpoint(checkpointPath, checkpoint);
    console.log(`Distillation applied. ${held.before_count} -> ${after.length} source(s).`);
    return;
  }

  const before = listSources(nlmPath, notebookId, profile);
  console.log(`Notebook ${notebookId} currently has ${before.length} source(s). Asking Gemini Notebook which ones don't contribute to answering the research questions...`);

  const res = queryNotebook(nlmPath, notebookId, buildPrompt(spec.query, spec.sub_questions), profile);
  if (res.status !== 0) {
    console.error(`FATAL: query notebook failed: ${res.stderr || res.stdout}`);
    process.exit(1);
  }

  const rawPath = path.join(jobDir, 'distill-raw.md');
  fs.writeFileSync(rawPath, res.stdout || '');

  const parsed = extractStructuredAnswer(res.stdout);
  if (!parsed || !Array.isArray(parsed.remove)) {
    console.error(`Gemini's response did not contain a parseable {"remove": [...]}. Raw response saved to ${rawPath} for manual review. Not removing anything automatically.`);
    process.exit(1);
  }

  const byTitle = new Map(before.map(s => [s.title, s]));
  const candidates = [];
  const notFound = [];
  for (const item of parsed.remove) {
    const src = byTitle.get(item.title);
    if (src) {
      candidates.push({ id: src.id || src.source_id, title: item.title, reason: item.reason });
    } else {
      notFound.push(item);
    }
  }

  if (notFound.length > 0) {
    console.warn(`${notFound.length} flagged title(s) did not match any current source exactly and were skipped:`);
    for (const nf of notFound) console.warn(`  - ${nf.title}`);
  }

  const ratio = before.length > 0 ? candidates.length / before.length : 0;

  if (candidates.length > 0 && ratio > HOLD_RATIO) {
    const report = {
      job_id: jobId,
      notebook_id: notebookId,
      status: 'held_for_review',
      before_count: before.length,
      proposed_removal_count: candidates.length,
      proposed_removal_ratio: ratio,
      candidates,
      unmatched_flags: notFound,
      checked_at: new Date().toISOString()
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.warn(`Gemini proposed removing ${candidates.length}/${before.length} source(s) (${Math.round(ratio * 100)}%), above the ${Math.round(HOLD_RATIO * 100)}% auto-apply threshold. Holding for human review — see ${reportPath}.`);
    console.warn(`After reviewing, either edit distill-report.json to trim the "candidates" list, or re-run "node distill_sources.js ${jobId} --apply" to proceed as proposed.`);
    process.exit(1);
  }

  let removed = [];
  if (candidates.length > 0) {
    const ids = candidates.map(c => c.id).filter(Boolean);
    console.log(`Removing ${ids.length} source(s) not contributing to the research questions...`);
    const delRes = deleteSources(nlmPath, ids, profile);
    if (delRes.status !== 0) {
      console.error(`FATAL: source delete failed: ${delRes.stderr || delRes.stdout}`);
      process.exit(1);
    }
    removed = candidates;
  }

  const after = listSources(nlmPath, notebookId, profile);

  const report = {
    job_id: jobId,
    notebook_id: notebookId,
    status: 'applied',
    before_count: before.length,
    after_count: after.length,
    removed,
    unmatched_flags: notFound,
    checked_at: new Date().toISOString()
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  checkpoint.stage = 'distilled';
  saveCheckpoint(checkpointPath, checkpoint);

  console.log(`Distillation done. ${before.length} -> ${after.length} source(s). Removed ${removed.length}.`);
}

if (require.main === module) {
  main();
}
