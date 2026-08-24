#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { locateNlm, extractStructuredAnswer, loadJob, saveCheckpoint, listSources, queryNotebook } = require('./lib/nlm_common');

const CRITERIA = `請逐一檢視這個 Notebook 目前的每一筆來源，找出符合以下任一條件、應該被移除的來源：
1. 廣告／宣傳／行銷頁面（產品功能介紹首頁、展示頁、銷售或定價頁、無具體實作細節的推廣頁）
2. 膚淺心得文（一味稱讚或一味批判、沒有具體論據或技術細節支撐；或簡短無結論的社群問答）
3. 過期資訊（內容明顯針對已停產/已下架的產品或版本，或已被後續更新的資訊取代）

即使是官方網域，只要頁面本身缺乏實質技術深度（例如官網行銷頁），一樣要列入移除，不能因為網域名稱就自動視為高品質。

請只回傳一個 JSON 物件，不要有其他文字說明，格式如下：
{"remove": [{"title": "來源標題（要跟清單裡的標題完全一致）", "reason": "移除理由"}]}
如果沒有任何來源需要移除，回傳 {"remove": []}。`;

function main() {
  const jobId = process.argv[2];
  const { jobDir, checkpointPath, spec, checkpoint, notebookId } = loadJob(jobId);
  const nlmPath = locateNlm();
  const profile = spec.profile;

  const before = listSources(nlmPath, notebookId, profile);
  console.log(`Notebook ${notebookId} currently has ${before.length} source(s). Asking Gemini Notebook to flag low-quality ones...`);

  const res = queryNotebook(nlmPath, notebookId, CRITERIA, profile);
  if (res.status !== 0) {
    console.error(`FATAL: query notebook failed: ${res.stderr || res.stdout}`);
    process.exit(1);
  }

  const rawPath = path.join(jobDir, 'quality-filter-raw.md');
  fs.writeFileSync(rawPath, res.stdout || '');

  const parsed = extractStructuredAnswer(res.stdout);
  if (!parsed || !Array.isArray(parsed.remove)) {
    console.error(`Gemini's response did not contain a parseable {"remove": [...]}. Raw response saved to ${rawPath} for manual review. Not removing anything automatically.`);
    process.exit(1);
  }

  const byTitle = new Map(before.map(s => [s.title, s]));
  const toRemove = [];
  const notFound = [];
  for (const item of parsed.remove) {
    const src = byTitle.get(item.title);
    if (src) {
      toRemove.push({ id: src.id || src.source_id, title: item.title, reason: item.reason });
    } else {
      notFound.push(item);
    }
  }

  if (notFound.length > 0) {
    console.warn(`${notFound.length} flagged title(s) did not match any current source exactly and were skipped (not removed):`);
    for (const nf of notFound) console.warn(`  - ${nf.title}`);
  }

  let removed = [];
  if (toRemove.length > 0) {
    const ids = toRemove.map(r => r.id).filter(Boolean);
    console.log(`Removing ${ids.length} source(s)...`);
    const delArgs = ['source', 'delete', ...ids, '--confirm', '--json'];
    if (profile) delArgs.push('--profile', profile);
    const delRes = spawnSync(nlmPath, delArgs, { encoding: 'utf8' });
    if (delRes.status !== 0) {
      console.error(`FATAL: source delete failed: ${delRes.stderr || delRes.stdout}`);
      process.exit(1);
    }
    removed = toRemove;
  }

  const after = listSources(nlmPath, notebookId, profile);

  const report = {
    job_id: jobId,
    notebook_id: notebookId,
    before_count: before.length,
    after_count: after.length,
    removed,
    unmatched_flags: notFound,
    checked_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(jobDir, 'quality-filter-report.json'), JSON.stringify(report, null, 2));

  checkpoint.stage = 'filtered';
  saveCheckpoint(checkpointPath, checkpoint);

  console.log(`Quality filter done. ${before.length} -> ${after.length} source(s). Removed ${removed.length}.`);
}

if (require.main === module) {
  main();
}
