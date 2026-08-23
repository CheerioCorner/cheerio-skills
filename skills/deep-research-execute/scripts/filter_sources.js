#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function rateSource(title, url) {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  
  // Marketing filters — use path-segment matching (e.g. '/pricing' as a
  // complete segment) instead of bare substring to avoid false positives
  // like '/product-api/' being matched by bare 'product'.
  // For URL path matching we check against the pathname, not the full URL string.
  let urlPath = '';
  try {
    urlPath = new URL(url).pathname.toLowerCase();
  } catch (_) {
    urlPath = u;
  }
  
  // URL path segments that indicate marketing/sales pages
  const marketingPathSegments = ['/pricing', '/checkout', '/sales', '/buy', '/compare', '/plans'];
  for (const seg of marketingPathSegments) {
    if (urlPath === seg || urlPath.startsWith(seg + '/') || urlPath.endsWith(seg)) {
      return {
        rating: 'excluded',
        reasons: ['marketing_content'],
        excluded: true,
        reason: 'URL path matches marketing/sales segment'
      };
    }
  }
  // Title-based marketing keywords (keep broad but check whole words)
  const marketingTitleKws = ['pricing', 'checkout', 'buy now', 'buy ', ' get started', ' free trial', ' discount'];
  for (const kw of marketingTitleKws) {
    if (t.includes(kw)) {
      return {
        rating: 'excluded',
        reasons: ['marketing_content'],
        excluded: true,
        reason: 'Title contains marketing keyword'
      };
    }
  }
  
  // High quality technical documentation (must_include)
  // Use path-segment matching for '/docs/', '/api/', '/spec/' etc. to avoid
  // false positives like 'Buyer's Guide to APIs' matching bare 'api'.
  const mustPathSegments = ['/docs', '/specification', '/api', '/api/', '/architecture', '/rfc', '/standard', '/reference', '/guide'];
  const isMustPath = mustPathSegments.some(kw => urlPath.includes(kw));
  // Title keywords (lower ambiguity, require more specificity)
  const mustTitleKws = ['documentation', 'specification', 'architecture', 'rfc', 'standard', 'reference guide', 'api reference'];
  const isMustTitle = mustTitleKws.some(kw => t.includes(kw));
  if (isMustPath || isMustTitle) {
    return {
      rating: 'must_include',
      reasons: ['official_docs'],
      excluded: false
    };
  }
  
  // Tutorials and deep dives (should_include)
  const shouldKeywords = ['tutorial', 'blog', 'article', 'how-to', 'deep-dive', 'medium.com', 'dev.to'];
  const isShould = shouldKeywords.some(kw => t.includes(kw) || u.includes(kw));
  if (isShould) {
    return {
      rating: 'should_include',
      reasons: ['technical_blog'],
      excluded: false
    };
  }
  
  // General references
  return {
    rating: 'reference',
    reasons: ['general_reference'],
    excluded: false
  };
}

function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: node filter_sources.js <job-id>");
    process.exit(1);
  }
  
  const jobsDir = process.env.RESEARCH_JOBS_DIR;
  if (!jobsDir) {
    console.error("RESEARCH_JOBS_DIR environment variable is not defined");
    process.exit(1);
  }
  
  const jobDir = path.join(jobsDir, jobId);
  const specPath = path.join(jobDir, 'spec.json');
  const candidatesPath = path.join(jobDir, 'source-candidates.json');
  const decisionsPath = path.join(jobDir, 'source-decisions.json');
  
  if (!fs.existsSync(candidatesPath)) {
    console.error(`source-candidates.json not found in ${jobDir}`);
    process.exit(1);
  }
  
  const spec = fs.existsSync(specPath) ? JSON.parse(fs.readFileSync(specPath, 'utf8')) : {};
  const budget = spec.budget || { max_sources: 50 };
  const maxSources = budget.max_sources || 50;
  
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
  const normalizedSeen = new Set();
  
  // Phase 1: Normalize & Deduplicate & Pre-filter
  for (const candidate of candidates) {
    const norm = normalizeUrl(candidate.url);
    candidate.normalized_url = norm;
    
    if (normalizedSeen.has(norm)) {
      candidate.rating = 'excluded';
      candidate.excluded = true;
      candidate.filter_reasons = ['duplicate_url'];
      candidate.excluded_reason = 'Duplicate URL';
      continue;
    }
    normalizedSeen.add(norm);
    
    // Set source type
    if (candidate.url.includes('youtube.com') || candidate.url.includes('youtu.be')) {
      candidate.source_type = 'youtube';
    } else if (candidate.url.includes('drive.google.com')) {
      candidate.source_type = 'drive';
    } else {
      candidate.source_type = 'web';
    }
    
    // Rate the source
    const ratingResult = rateSource(candidate.title, candidate.url);
    candidate.rating = ratingResult.rating;
    candidate.filter_reasons = ratingResult.reasons;
    candidate.excluded = ratingResult.excluded;
    if (ratingResult.reason) {
      candidate.excluded_reason = ratingResult.reason;
    }
  }
  
  // Phase 2: Quantity Control / Budget capping
  let activeCount = candidates.filter(c => !c.excluded).length;
  if (activeCount > maxSources) {
    console.log(`Active sources (${activeCount}) exceed max_sources budget (${maxSources}). Capping excess sources...`);
    // Sort active ones: must_include > should_include > reference
    const order = { 'must_include': 1, 'should_include': 2, 'reference': 3 };
    const activeCandidates = candidates.filter(c => !c.excluded).sort((a, b) => {
      return (order[a.rating] || 9) - (order[b.rating] || 9);
    });
    
    // Exclude those beyond the limit
    for (let i = maxSources; i < activeCandidates.length; i++) {
      const item = activeCandidates[i];
      item.rating = 'excluded';
      item.excluded = true;
      item.filter_reasons.push('budget_limit');
      item.excluded_reason = `Exceeded max_sources budget limit of ${maxSources}`;
    }
  }
  
  // Save updated candidates back
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));
  console.log(`Updated source-candidates.json with ratings.`);
  
  // Phase 3: Create source-decisions.json
  const decisions = candidates.map(c => {
    const isApproved = (c.rating === 'must_include' || c.rating === 'should_include') && !c.excluded;
    return {
      job_id: jobId,
      index: c.index,
      decision: isApproved ? 'approved' : 'skipped',
      decided_by: 'auto',
      reason: isApproved ? `Automatically approved based on rating: ${c.rating}` : `Skipped based on rating: ${c.rating}`,
      decided_at: new Date().toISOString()
    };
  });
  
  fs.writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2));
  console.log(`Generated default source-decisions.json.`);
  
  // Print summary statistics
  const stats = {
    must_include: candidates.filter(c => c.rating === 'must_include' && !c.excluded).length,
    should_include: candidates.filter(c => c.rating === 'should_include' && !c.excluded).length,
    reference: candidates.filter(c => c.rating === 'reference' && !c.excluded).length,
    excluded: candidates.filter(c => c.excluded).length
  };
  
  console.log("\nFiltering Summary:");
  console.log(`- Must Include: ${stats.must_include}`);
  console.log(`- Should Include: ${stats.should_include}`);
  console.log(`- Reference: ${stats.reference}`);
  console.log(`- Excluded: ${stats.excluded}`);
  const rate = ((stats.must_include + stats.should_include + stats.reference) / candidates.length * 100).toFixed(1);
  console.log(`- Selection Rate: ${rate}%`);
}

if (require.main === module) {
  main();
}
