#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RATING_LABELS = {
  must_include: '⭐⭐⭐ Must Include',
  should_include: '⭐⭐ Should Include',
  reference: '⭐ Reference',
  excluded: '✗ Excluded'
};
const RATING_ORDER = ['must_include', 'should_include', 'reference', 'excluded'];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatCandidateLine(candidate, importStatusByIndex) {
  const importStatus = importStatusByIndex ? importStatusByIndex[candidate.index] : null;
  const statusTag = importStatus ? ` (${importStatus})` : '';
  const reasons = (candidate.filter_reasons || []).join(', ');
  const reasonTag = reasons ? ` — ${reasons}` : '';
  return `- [${candidate.title || '(無標題)'}](${candidate.url})${statusTag}${reasonTag}`;
}

function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error('Usage: node generate_report.js <job-id>');
    process.exit(1);
  }

  const jobsDir = process.env.RESEARCH_JOBS_DIR;
  if (!jobsDir) {
    console.error('RESEARCH_JOBS_DIR environment variable is not defined');
    process.exit(1);
  }

  const jobDir = path.join(jobsDir, jobId);
  const specPath = path.join(jobDir, 'spec.json');
  const candidatesPath = path.join(jobDir, 'source-candidates.json');
  const manifestPath = path.join(jobDir, 'import-manifest.json');
  const reportPath = path.join(jobDir, 'sources-report.md');

  if (!fs.existsSync(candidatesPath)) {
    console.error(`source-candidates.json not found in ${jobDir}`);
    process.exit(1);
  }

  const spec = readJson(specPath) || {};
  const candidates = readJson(candidatesPath) || [];
  const manifest = readJson(manifestPath);

  // Build index -> import status map if a manifest exists (post-import run)
  let importStatusByIndex = null;
  if (manifest && Array.isArray(manifest.items)) {
    importStatusByIndex = {};
    for (const item of manifest.items) {
      importStatusByIndex[item.index] = item.status;
    }
  }

  const grouped = { must_include: [], should_include: [], reference: [], excluded: [] };
  for (const c of candidates) {
    (grouped[c.rating] || grouped.reference).push(c);
  }

  const lines = [];
  lines.push(`# Deep Research 來源報告 — ${jobId}`);
  lines.push('');
  lines.push(`- 研究主題：${spec.query || '(未知)'}`);
  lines.push(`- 產生時間：${new Date().toISOString()}`);
  lines.push(`- 候選來源總數：${candidates.length}`);
  if (manifest) {
    lines.push(`- 匯入狀態：已匯入 ${manifest.summary.imported} / 重複跳過 ${manifest.summary.skipped_duplicate} / 失敗 ${manifest.summary.failed}（共 ${manifest.summary.total} 筆核准）`);
  } else {
    lines.push('- 匯入狀態：尚未匯入（等待人類確認來源）');
  }
  lines.push('');

  for (const rating of RATING_ORDER) {
    const items = grouped[rating];
    lines.push(`## ${RATING_LABELS[rating]}（${items.length} 筆）`);
    lines.push('');
    if (items.length === 0) {
      lines.push('（無）');
    } else {
      for (const c of items) {
        lines.push(formatCandidateLine(c, importStatusByIndex));
      }
    }
    lines.push('');
  }

  if (manifest && manifest.summary.failed > 0) {
    lines.push('## 匯入失敗（下次執行 import_sources.js 會自動重試）');
    lines.push('');
    for (const item of manifest.items) {
      if (item.status === 'failed') {
        lines.push(`- [${item.title}](${item.url}) — ${item.error || '未知錯誤'}`);
      }
    }
    lines.push('');
  }

  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`Report written to ${reportPath}`);
}

if (require.main === module) {
  main();
}
