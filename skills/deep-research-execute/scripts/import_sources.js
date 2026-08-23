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

function normalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    // Only lowercase the host; path/query are case-sensitive in general
    url.hostname = url.hostname.toLowerCase();
    url.hash = ''; // Remove hash
    const searchParams = url.searchParams;
    const paramsToDelete = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 's', 'fbclid', 'gclid'];
    for (const p of paramsToDelete) {
      searchParams.delete(p);
    }
    const sortedParams = [...searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    url.search = '';
    for (const [k, v] of sortedParams) {
      url.searchParams.append(k, v);
    }
    let norm = url.toString();
    if (norm.endsWith('/')) {
      norm = norm.slice(0, -1);
    }
    return norm;
  } catch (e) {
    return urlStr;
  }
}

function main() {
  const nlmPath = locateNlm();
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: node import_sources.js <job-id>");
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
  const decisionsPath = path.join(jobDir, 'source-decisions.json');
  const manifestPath = path.join(jobDir, 'import-manifest.json');
  
  if (!fs.existsSync(specPath)) {
    console.error(`spec.json not found in ${jobDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(candidatesPath)) {
    console.error(`source-candidates.json not found in ${jobDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(decisionsPath)) {
    console.error(`source-decisions.json not found in ${jobDir}`);
    process.exit(1);
  }
  
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const profile = spec.profile;
  
  let checkpoint = {};
  if (fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  }
  
  const notebookId = checkpoint.notebook_id || spec.notebook_id;
  if (!notebookId) {
    console.error("Notebook ID is not defined in spec or checkpoint");
    process.exit(1);
  }
  
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
  const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
  
  // Create mapping from candidate index to decision
  const decisionMap = {};
  for (const d of decisions) {
    decisionMap[d.index] = d.decision; // 'approved', 'rejected', 'skipped'
  }
  
  // 1. Get existing sources in notebook for deduplication
  const existingUrls = new Set();
  console.log(`Fetching existing sources in notebook ${notebookId}...`);
  const listArgs = ['list', 'sources', notebookId, '--json'];
  if (profile) {
    listArgs.push('--profile', profile);
  }
  const listRes = spawnSync(nlmPath, listArgs, { encoding: 'utf8' });
  if (listRes.status !== 0) {
    // Abort: cannot verify duplicates without existing source list
    const errMsg = listRes.stderr || listRes.stdout || 'Unknown error';
    console.error(`FATAL: Failed to list existing sources in notebook ${notebookId}: ${errMsg}`);
    console.error('Aborting import to avoid creating duplicates. Please check nlm auth and notebook ID, then retry.');
    process.exit(1);
  }
  try {
    const sources = JSON.parse(listRes.stdout);
    const sourcesArray = Array.isArray(sources) ? sources : (sources.sources || []);
    for (const s of sourcesArray) {
      if (s.url) {
        existingUrls.add(normalizeUrl(s.url));
      }
    }
    console.log(`Found ${existingUrls.size} existing sources in the notebook.`);
  } catch (e) {
    console.error(`FATAL: Could not parse existing sources JSON: ${e.message}`);
    console.error('Raw output:', listRes.stdout.substring(0, 200));
    console.error('Aborting import to avoid creating duplicates.');
    process.exit(1);
  }
  
  // Load or initialize import manifest
  let manifest = {
    job_id: jobId,
    target_notebook_id: notebookId,
    items: [],
    summary: {
      total: 0,
      imported: 0,
      skipped_duplicate: 0,
      failed: 0
    },
    started_at: new Date().toISOString()
  };
  
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  
  // Rebuild the set of successfully processed indices from manifest for accurate resume
  const completedIndices = new Set();
  for (const item of manifest.items) {
    if (item.status === 'imported' || item.status === 'skipped_duplicate') {
      completedIndices.add(item.index);
    }
  }
  console.log(`Resume set: ${completedIndices.size} source(s) already imported/skipped from previous runs.`);
  
  // Filter approved candidates
  const approvedCandidates = candidates.filter(c => decisionMap[c.index] === 'approved');
  manifest.summary.total = approvedCandidates.length;
  
  console.log(`Total approved to import: ${approvedCandidates.length}`);
  
  checkpoint.stage = 'import';
  checkpoint.updated_at = new Date().toISOString();
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  
  for (const c of approvedCandidates) {
    // Resume check: skip only if this index is in the completed set
    if (completedIndices.has(c.index)) {
      console.log(`Skipping already processed source: [${c.index}] ${c.title}`);
      continue;
    }
    
    const normUrl = normalizeUrl(c.url);
    const itemManifest = {
      index: c.index,
      title: c.title,
      url: c.url,
      normalized_url: normUrl,
      status: 'failed',
      imported_at: new Date().toISOString()
    };
    
    if (existingUrls.has(normUrl)) {
      console.log(`[DUPLICATE] Skipped: ${c.title} (${c.url})`);
      itemManifest.status = 'skipped_duplicate';
      manifest.summary.skipped_duplicate++;
    } else {
      console.log(`[IMPORTING] [${c.index}] Adding to notebook: ${c.title}...`);
      const addArgs = ['add', 'url', notebookId, c.url, '--wait'];
      if (profile) {
        addArgs.push('--profile', profile);
      }
      
      const addRes = spawnSync(nlmPath, addArgs, { encoding: 'utf8' });
      if (addRes.status === 0) {
        console.log(`[SUCCESS] Imported: ${c.title}`);
        itemManifest.status = 'imported';
        manifest.summary.imported++;
        // Add to our local set of existing to prevent duplicate within the same batch
        existingUrls.add(normUrl);
      } else {
        const errMsg = addRes.stderr.trim() || addRes.stdout.trim() || 'Unknown CLI error';
        console.error(`[FAILED] Failed to import [${c.index}] ${c.title}: ${errMsg}`);
        itemManifest.status = 'failed';
        itemManifest.error = errMsg;
        manifest.summary.failed++;
      }
    }
    
    // Add item to manifest (replace if already exists, else push)
    const existingItemIdx = manifest.items.findIndex(item => item.index === c.index);
    if (existingItemIdx !== -1) {
      manifest.items[existingItemIdx] = itemManifest;
    } else {
      manifest.items.push(itemManifest);
    }
    
    checkpoint.updated_at = new Date().toISOString();
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  
  // Recalculate summary from actual manifest item states (not incremental counters)
  manifest.summary.imported = 0;
  manifest.summary.skipped_duplicate = 0;
  manifest.summary.failed = 0;
  for (const item of manifest.items) {
    if (item.status === 'imported') manifest.summary.imported++;
    else if (item.status === 'skipped_duplicate') manifest.summary.skipped_duplicate++;
    else if (item.status === 'failed') manifest.summary.failed++;
  }
  
  // Set completed stage (only if no failures remaining)
  if (manifest.summary.failed === 0) {
    checkpoint.stage = 'completed';
  } else {
    checkpoint.stage = 'import'; // Stay in import stage so next run retries failed sources
    console.log(`\n${manifest.summary.failed} source(s) failed to import and will be retried on next run.`);
  }
  checkpoint.updated_at = new Date().toISOString();
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  
  manifest.completed_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`\nImport Process Completed!`);
  console.log(`- Total: ${manifest.summary.total}`);
  console.log(`- Imported: ${manifest.summary.imported}`);
  console.log(`- Skipped (Duplicates): ${manifest.summary.skipped_duplicate}`);
  console.log(`- Failed: ${manifest.summary.failed}`);
}

if (require.main === module) {
  main();
}
