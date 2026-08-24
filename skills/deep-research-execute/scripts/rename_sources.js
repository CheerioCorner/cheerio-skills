#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { locateNlm, extractStructuredAnswer, loadJob, saveCheckpoint, listSources, queryNotebook } = require('./lib/nlm_common');

function buildPrompt() {
  return `請對 Notebook 裡目前的每一筆來源做分類，並建議一個新標題。新標題要包含三個元素，且要讓人一眼就能看懂：
1. 來源出處（例如官方文件、公司名稱、媒體/部落格名稱）
2. 內容類型（例如產品規格、架構文件、比較分析、案例研究、學術論文）
3. 一個能概括這篇內容主題的關鍵字或短語

格式建議：\`[出處] 類型 - 關鍵字\`，例如 \`[Qualcomm 官方] 產品規格 - Hexagon NPU 異質運算\`。

只回傳一個 JSON 物件，不要有其他文字說明，格式如下：
{"renames": [{"title": "目前的標題（要跟清單裡完全一致）", "category": "分類名稱", "new_title": "建議的新標題"}]}`;
}

function main() {
  const jobId = process.argv[2];
  const { jobDir, checkpointPath, spec, checkpoint, notebookId } = loadJob(jobId);
  const nlmPath = locateNlm();
  const profile = spec.profile;

  const sources = listSources(nlmPath, notebookId, profile);
  console.log(`Asking Gemini Notebook to classify and rename ${sources.length} source(s)...`);

  const res = queryNotebook(nlmPath, notebookId, buildPrompt(), profile);
  if (res.status !== 0) {
    console.error(`FATAL: query notebook failed: ${res.stderr || res.stdout}`);
    process.exit(1);
  }

  const rawPath = path.join(jobDir, 'rename-raw.md');
  fs.writeFileSync(rawPath, res.stdout || '');

  const parsed = extractStructuredAnswer(res.stdout);
  if (!parsed || !Array.isArray(parsed.renames)) {
    console.error(`Gemini's response did not contain a parseable {"renames": [...]}. Raw response saved to ${rawPath}. Not renaming anything automatically.`);
    process.exit(1);
  }

  const byTitle = new Map(sources.map(s => [s.title, s]));
  const manifest = [];
  let renamed = 0;
  let skipped = 0;

  for (const item of parsed.renames) {
    const src = byTitle.get(item.title);
    if (!src) {
      console.warn(`Skipping — no exact title match: ${item.title}`);
      manifest.push({ original_title: item.title, new_title: item.new_title, category: item.category, status: 'skipped_no_match' });
      skipped++;
      continue;
    }
    const sourceId = src.id || src.source_id;
    const renameArgs = ['source', 'rename', sourceId, item.new_title, '--notebook', notebookId];
    if (profile) renameArgs.push('--profile', profile);
    const renameRes = spawnSync(nlmPath, renameArgs, { encoding: 'utf8' });
    if (renameRes.status === 0) {
      manifest.push({ original_title: item.title, new_title: item.new_title, category: item.category, source_id: sourceId, status: 'renamed' });
      renamed++;
    } else {
      manifest.push({ original_title: item.title, new_title: item.new_title, category: item.category, source_id: sourceId, status: 'failed', error: renameRes.stderr || renameRes.stdout });
      console.warn(`Failed to rename "${item.title}": ${renameRes.stderr || renameRes.stdout}`);
    }
  }

  fs.writeFileSync(path.join(jobDir, 'rename-manifest.json'), JSON.stringify(manifest, null, 2));

  checkpoint.stage = 'renamed';
  saveCheckpoint(checkpointPath, checkpoint);

  console.log(`Rename done. ${renamed} renamed, ${skipped} skipped (no match), ${manifest.filter(m => m.status === 'failed').length} failed.`);
}

if (require.main === module) {
  main();
}
