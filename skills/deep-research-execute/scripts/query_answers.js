#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { locateNlm, extractJson, loadJob, saveCheckpoint, listSources, queryNotebook } = require('./lib/nlm_common');

/**
 * Verified against a real run (2026-08-24, nlm 0.9.14): `nlm query notebook --json`
 * has never observed to populate citations/references/sources_used with actual
 * content — even for answers whose prose contains inline [1-3] style markers.
 * We still check these fields (best-effort, in case a future nlm version fills
 * them in), but don't rely on them: the final source list (already renamed by
 * rename_sources.js) is separately saved as sources-final.json and rendered as
 * a report-level appendix by generate_report.js, since per-claim citation
 * linkage isn't something this CLI reliably exposes.
 */
function extractCitations(parsed) {
  if (!parsed) return [];
  for (const key of ['citations', 'references', 'sources_used']) {
    if (Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
  }
  return [];
}

function main() {
  const jobId = process.argv[2];
  const { jobDir, checkpointPath, spec, checkpoint, notebookId } = loadJob(jobId);
  const nlmPath = locateNlm();
  const profile = spec.profile;

  const questions = (Array.isArray(spec.sub_questions) && spec.sub_questions.length > 0)
    ? spec.sub_questions
    : [spec.query];

  console.log(`Asking ${questions.length} question(s) against notebook ${notebookId}...`);

  const answers = [];
  let conversationId = null;
  for (const [i, question] of questions.entries()) {
    console.log(`[${i + 1}/${questions.length}] ${question}`);
    const extraArgs = conversationId ? ['-c', conversationId] : [];
    const res = queryNotebook(nlmPath, notebookId, question, profile, extraArgs);
    if (res.status !== 0) {
      console.error(`FATAL: query notebook failed on question ${i + 1}: ${res.stderr || res.stdout}`);
      process.exit(1);
    }
    const parsed = extractJson(res.stdout);
    // parsed is the nlm envelope itself here (not a further-nested JSON answer,
    // since these are plain research questions, not "reply with JSON" prompts).
    const answerText = parsed && parsed.answer ? parsed.answer : (res.stdout || '').trim();
    const citations = extractCitations(parsed);
    if (parsed && parsed.conversation_id) {
      conversationId = parsed.conversation_id;
    }
    answers.push({ question, answer: answerText, citations });
  }

  fs.writeFileSync(path.join(jobDir, 'answers.json'), JSON.stringify(answers, null, 2));

  // Snapshot the final (already renamed) source list as the report's citation
  // appendix, since nlm doesn't reliably map individual claims to sources.
  const finalSources = listSources(nlmPath, notebookId, profile);
  fs.writeFileSync(path.join(jobDir, 'sources-final.json'), JSON.stringify(finalSources, null, 2));

  checkpoint.stage = 'answered';
  saveCheckpoint(checkpointPath, checkpoint);

  console.log(`Done. ${answers.length} answer(s) saved to answers.json, ${finalSources.length} source(s) snapshotted to sources-final.json.`);
}

if (require.main === module) {
  main();
}
