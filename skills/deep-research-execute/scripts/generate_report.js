#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  const spec = readJson(path.join(jobDir, 'spec.json')) || {};
  const checkpoint = readJson(path.join(jobDir, 'checkpoint.json')) || {};
  const filterReport = readJson(path.join(jobDir, 'quality-filter-report.json'));
  const distillReport = readJson(path.join(jobDir, 'distill-report.json'));
  const renameManifest = readJson(path.join(jobDir, 'rename-manifest.json'));
  const recheckLog = readJson(path.join(jobDir, 'recheck-log.json')) || [];
  const answers = readJson(path.join(jobDir, 'answers.json'));
  const finalSources = readJson(path.join(jobDir, 'sources-final.json')) || [];

  if (!answers) {
    console.error(`answers.json not found in ${jobDir} — run query_answers.js first.`);
    process.exit(1);
  }

  const lines = [];
  lines.push(`# Deep Research 報告 — ${jobId}`);
  lines.push('');
  lines.push(`- 研究主題：${spec.query || '(未知)'}`);
  lines.push(`- Notebook：${checkpoint.notebook_id ? `https://notebooklm.google.com/notebook/${checkpoint.notebook_id}` : '(未知)'}`);
  lines.push(`- 產生時間：${new Date().toISOString()}`);
  if (filterReport) {
    lines.push(`- 品質過濾：${filterReport.before_count} → ${filterReport.after_count} 筆（移除 ${filterReport.removed.length} 筆）`);
  }
  if (recheckLog.length > 0) {
    lines.push(`- Recheck：共 ${recheckLog.length} 輪補充研究${checkpoint.recheck_outcome === 'exhausted' ? '（已達 3 輪上限，涵蓋範圍可能仍不完整）' : ''}`);
  }
  if (distillReport && distillReport.status === 'applied') {
    lines.push(`- 蒸餾必要性：${distillReport.before_count} → ${distillReport.after_count} 筆（移除 ${(distillReport.removed || []).length} 筆對研究問題無貢獻的來源）`);
  }
  if (renameManifest) {
    const renamed = renameManifest.filter(m => m.status === 'renamed').length;
    lines.push(`- 來源分類/重新命名：${renamed} / ${renameManifest.length} 筆成功`);
  }
  lines.push('');

  // nlm's citation objects only carry {source_id, citation_number, cited_text}
  // — they never had title/name/url fields, those have to be resolved against
  // the renamed source list (sources-final.json, falling back to
  // rename-manifest.json for a title when a source didn't make the final cut).
  const sourceById = new Map();
  for (const s of finalSources) sourceById.set(s.id, s);
  if (renameManifest) {
    for (const m of renameManifest) {
      if (!sourceById.has(m.source_id)) sourceById.set(m.source_id, { title: m.new_title });
    }
  }

  lines.push('## 研究結果');
  lines.push('');
  for (const [i, a] of answers.entries()) {
    lines.push(`### ${i + 1}. ${a.question}`);
    lines.push('');
    lines.push(a.answer || '(無回應)');
    lines.push('');
    if (a.citations && a.citations.length > 0) {
      lines.push('**引用來源：**');
      for (const c of a.citations) {
        const src = sourceById.get(c.source_id);
        const label = (src && src.title) || c.source_id || '(未知來源)';
        lines.push(src && src.url ? `- [${c.citation_number}] [${label}](${src.url})` : `- [${c.citation_number}] ${label}`);
      }
      lines.push('');
    }
  }

  if (filterReport && filterReport.removed.length > 0) {
    lines.push('## 已移除的來源（品質過濾）');
    lines.push('');
    for (const r of filterReport.removed) {
      lines.push(`- ${r.title} — ${r.reason}`);
    }
    lines.push('');
  }

  if (distillReport && distillReport.status === 'applied' && (distillReport.removed || []).length > 0) {
    lines.push('## 已移除的來源（蒸餾必要性）');
    lines.push('');
    for (const r of distillReport.removed) {
      lines.push(`- ${r.title} — ${r.reason}`);
    }
    lines.push('');
  }

  if (finalSources.length > 0) {
    // nlm query notebook doesn't reliably map individual claims back to a
    // specific source (see query_answers.js) — this is the full curated
    // source list backing all answers above, not a per-claim citation index.
    lines.push('## 參考來源清單');
    lines.push('');
    for (const s of finalSources) {
      const label = s.title || '(無標題)';
      lines.push(s.url ? `- [${label}](${s.url})` : `- ${label}`);
    }
    lines.push('');
  }

  const reportPath = path.join(jobDir, 'research-report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`Report written to ${reportPath}`);
}

if (require.main === module) {
  main();
}
