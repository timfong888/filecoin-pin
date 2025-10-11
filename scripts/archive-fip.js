#!/usr/bin/env node

/**
 * FIP Archive Script
 *
 * Extracts complete FIP data from GitHub and uploads to Filecoin
 *
 * Usage:
 *   node archive-fip.js --issue 123
 *   node archive-fip.js --issue 123 --dry-run
 *   node archive-fip.js --issue 123 --output ./fip-archive/
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    issue: null,
    output: null,
    dryRun: false,
    repo: process.env.GITHUB_REPOSITORY || 'filecoin-project/FIPs',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--issue':
        config.issue = args[++i];
        break;
      case '--output':
        config.output = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--repo':
        config.repo = args[++i];
        break;
      case '--help':
        console.log(`
FIP Archive Script

Usage:
  node archive-fip.js --issue <number> [options]

Options:
  --issue <number>     GitHub issue number (required)
  --output <path>      Output directory (default: ./fip-<number>-archive)
  --repo <owner/repo>  Repository (default: filecoin-project/FIPs)
  --dry-run           Create archive without uploading to Filecoin
  --help              Show this help message

Environment Variables:
  GITHUB_TOKEN        GitHub API token (required)
  PRIVATE_KEY         Filecoin wallet private key (required for upload)
  RPC_URL             Filecoin RPC endpoint (optional)
`);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!config.issue) {
    console.error('Error: --issue is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (!config.output) {
    config.output = path.join(process.cwd(), `fip-${config.issue}-archive`);
  }

  return config;
}

// Execute command and return output
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

// Fetch data from GitHub API using gh CLI
function fetchGitHub(endpoint) {
  try {
    const result = exec(`gh api ${endpoint}`, { silent: true });
    return JSON.parse(result);
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    throw error;
  }
}

// Extract issue data
async function extractIssue(repo, issueNumber) {
  console.log(`\n📥 Extracting issue #${issueNumber} from ${repo}...`);

  const issue = fetchGitHub(`/repos/${repo}/issues/${issueNumber}`);

  return {
    number: issue.number,
    title: issue.title,
    body: issue.body,
    author: issue.user.login,
    created: issue.created_at,
    updated: issue.updated_at,
    state: issue.state,
    labels: issue.labels.map(l => l.name),
    url: issue.html_url,
  };
}

// Extract comments
async function extractComments(repo, issueNumber) {
  console.log(`\n💬 Extracting comments...`);

  const comments = fetchGitHub(`/repos/${repo}/issues/${issueNumber}/comments`);

  return comments.map(c => ({
    author: c.user.login,
    body: c.body,
    created: c.created_at,
    updated: c.updated_at,
    url: c.html_url,
  }));
}

// Extract linked pull requests
async function extractPullRequests(repo, issueNumber, issueBody, comments) {
  console.log(`\n🔗 Extracting linked pull requests...`);

  // Find PR references in issue and comments
  const prPattern = /#(\d+)|\/pull\/(\d+)/g;
  const prNumbers = new Set();

  const texts = [issueBody, ...comments.map(c => c.body)];
  for (const text of texts) {
    const matches = [...text.matchAll(prPattern)];
    for (const match of matches) {
      const prNum = match[1] || match[2];
      prNumbers.add(prNum);
    }
  }

  const prs = [];
  for (const prNum of prNumbers) {
    try {
      const pr = fetchGitHub(`/repos/${repo}/pulls/${prNum}`);

      // Get diff
      const diff = exec(`gh pr diff ${prNum} --repo ${repo}`, {
        silent: true,
        allowFailure: true
      });

      prs.push({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        author: pr.user.login,
        state: pr.state,
        merged: pr.merged_at !== null,
        url: pr.html_url,
        diff: diff,
      });

      console.log(`  ✓ Extracted PR #${prNum}`);
    } catch (error) {
      console.log(`  ⚠ Could not fetch PR #${prNum} (may not exist)`);
    }
  }

  return prs;
}

// Create markdown file
function createMarkdown(filepath, content) {
  fs.writeFileSync(filepath, content, 'utf8');
}

// Create HTML index
function createHtmlIndex(issue, comments, prs, outputDir) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIP #${issue.number}: ${issue.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #24292f;
    }
    header {
      border-bottom: 2px solid #d0d7de;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 { margin: 0; font-size: 32px; }
    .meta {
      color: #57606a;
      font-size: 14px;
      margin-top: 10px;
    }
    .labels {
      display: flex;
      gap: 5px;
      margin-top: 10px;
    }
    .label {
      background: #ddf4ff;
      color: #0969da;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    nav {
      background: #f6f8fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    nav li {
      margin: 5px 0;
    }
    nav a {
      color: #0969da;
      text-decoration: none;
    }
    nav a:hover {
      text-decoration: underline;
    }
    section {
      margin-bottom: 40px;
    }
    h2 {
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 10px;
    }
    .comment {
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      background: #ffffff;
    }
    .comment-header {
      font-weight: 600;
      margin-bottom: 10px;
      color: #57606a;
      font-size: 14px;
    }
    .pr-link {
      display: inline-block;
      padding: 5px 10px;
      background: #ddf4ff;
      color: #0969da;
      text-decoration: none;
      border-radius: 6px;
      margin: 5px 5px 5px 0;
    }
    .pr-link:hover {
      background: #b6e3ff;
    }
    .verification {
      background: #dafbe1;
      border: 1px solid #4ac776;
      border-radius: 6px;
      padding: 15px;
      margin-top: 30px;
    }
    .verification h3 {
      margin-top: 0;
      color: #1a7f37;
    }
    code {
      background: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }
  </style>
</head>
<body>
  <header>
    <h1>FIP #${issue.number}: ${issue.title}</h1>
    <div class="meta">
      <strong>Author:</strong> ${issue.author} |
      <strong>Created:</strong> ${new Date(issue.created).toLocaleDateString()} |
      <strong>State:</strong> ${issue.state}
    </div>
    ${issue.labels.length > 0 ? `
    <div class="labels">
      ${issue.labels.map(l => `<span class="label">${l}</span>`).join('')}
    </div>
    ` : ''}
  </header>

  <nav>
    <strong>Contents:</strong>
    <ul>
      <li><a href="#issue">Original Issue</a></li>
      ${comments.length > 0 ? '<li><a href="#comments">Discussion (' + comments.length + ' comments)</a></li>' : ''}
      ${prs.length > 0 ? '<li><a href="#prs">Pull Requests (' + prs.length + ')</a></li>' : ''}
      <li><a href="#verification">Filecoin Verification</a></li>
    </ul>
  </nav>

  <section id="issue">
    <h2>Original Issue</h2>
    <div class="comment">
      <div class="comment-header">
        ${issue.author} commented on ${new Date(issue.created).toLocaleString()}
      </div>
      <div>${issue.body ? issue.body.replace(/\n/g, '<br>') : '<em>No description provided</em>'}</div>
    </div>
    <p><a href="${issue.url}" target="_blank">View on GitHub →</a></p>
  </section>

  ${comments.length > 0 ? `
  <section id="comments">
    <h2>Discussion (${comments.length} comments)</h2>
    ${comments.map(c => `
    <div class="comment">
      <div class="comment-header">
        ${c.author} commented on ${new Date(c.created).toLocaleString()}
      </div>
      <div>${c.body.replace(/\n/g, '<br>')}</div>
    </div>
    `).join('')}
  </section>
  ` : ''}

  ${prs.length > 0 ? `
  <section id="prs">
    <h2>Pull Requests (${prs.length})</h2>
    <p>View detailed pull requests and code changes:</p>
    ${prs.map(pr => `
    <div style="margin-bottom: 15px;">
      <a href="pull-requests/pr-${pr.number}.html" class="pr-link">
        #${pr.number}: ${pr.title}
        ${pr.merged ? '✓ Merged' : pr.state}
      </a>
      ${pr.diff ? `<br><a href="pull-requests/diff-${pr.number}.patch" style="margin-left: 10px; font-size: 14px;">View diff</a>` : ''}
      <a href="${pr.url}" target="_blank" style="margin-left: 10px; font-size: 14px;">View on GitHub ↗</a>
    </div>
    `).join('')}
  </section>
  ` : ''}

  <section id="verification" class="verification">
    <h3>✓ Filecoin Storage Verification</h3>
    <p>This archive is permanently stored on the Filecoin network with cryptographic proof of data possession.</p>
    <p><strong>Verification details:</strong> See <code>verification.json</code> for blockchain transaction hash, Piece CID, and storage provider information.</p>

    <h4 style="margin-top: 20px;">📥 Access This Archive</h4>
    <p>This archive can be accessed in multiple ways:</p>
    <ul>
      <li><strong>IPFS Gateway:</strong> <code>https://ipfs.io/ipfs/[ROOT_CID]/index.html</code></li>
      <li><strong>Direct Download:</strong> Download CAR file from storage provider</li>
      <li><strong>Local IPFS:</strong> <code>ipfs cat [ROOT_CID]/index.html</code></li>
    </ul>
    <p style="font-size: 14px; margin-top: 10px;"><em>All links in this archive work when viewed via IPFS gateways.</em></p>
  </section>

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #d0d7de; color: #57606a; font-size: 14px;">
    <p>Archived on ${new Date().toLocaleString()} using the FIP Archival System</p>
    <p>Repository: ${issue.url.split('/issues/')[0]}</p>
  </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
}

// Create archive
function createArchive(issue, comments, prs, outputDir) {
  console.log(`\n📦 Creating archive in ${outputDir}...`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create subdirectories
  const prDir = path.join(outputDir, 'pull-requests');
  if (!fs.existsSync(prDir)) {
    fs.mkdirSync(prDir, { recursive: true });
  }

  // Write issue
  const issueMd = `# FIP #${issue.number}: ${issue.title}

**Author:** ${issue.author}
**Created:** ${issue.created}
**Updated:** ${issue.updated}
**State:** ${issue.state}
**Labels:** ${issue.labels.join(', ')}
**URL:** ${issue.url}

## Description

${issue.body || '*No description provided*'}
`;
  createMarkdown(path.join(outputDir, 'issue.md'), issueMd);

  // Write comments
  if (comments.length > 0) {
    const commentsMd = `# Discussion (${comments.length} comments)

${comments.map((c, i) => `
## Comment ${i + 1} by ${c.author}

**Posted:** ${c.created}
**URL:** ${c.url}

${c.body}

---
`).join('\n')}
`;
    createMarkdown(path.join(outputDir, 'comments.md'), commentsMd);
  }

  // Write PRs
  for (const pr of prs) {
    const prMd = `# PR #${pr.number}: ${pr.title}

**Author:** ${pr.author}
**State:** ${pr.state}
**Merged:** ${pr.merged ? 'Yes' : 'No'}
**URL:** ${pr.url}

## Description

${pr.body || '*No description provided*'}
`;
    createMarkdown(path.join(prDir, `pr-${pr.number}.md`), prMd);

    // Write diff if available
    if (pr.diff) {
      fs.writeFileSync(
        path.join(prDir, `diff-${pr.number}.patch`),
        pr.diff,
        'utf8'
      );
    }

    // Create HTML version for IPFS gateway compatibility
    const prHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR #${pr.number}: ${pr.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #24292f;
    }
    header {
      border-bottom: 2px solid #d0d7de;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 { margin: 0; font-size: 28px; }
    .meta {
      color: #57606a;
      font-size: 14px;
      margin-top: 10px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
    }
    .merged { background: #dafbe1; color: #1a7f37; }
    .open { background: #ddf4ff; color: #0969da; }
    .closed { background: #f1f8ff; color: #57606a; }
    pre {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      font-size: 85%;
    }
    .links {
      margin: 20px 0;
      padding: 15px;
      background: #f6f8fa;
      border-radius: 6px;
    }
    .links a {
      display: inline-block;
      margin-right: 15px;
      color: #0969da;
      text-decoration: none;
    }
    .links a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <header>
    <h1>PR #${pr.number}: ${pr.title}</h1>
    <div class="meta">
      <strong>Author:</strong> ${pr.author}
    </div>
    <div class="badge ${pr.merged ? 'merged' : pr.state}">
      ${pr.merged ? '✓ Merged' : pr.state.charAt(0).toUpperCase() + pr.state.slice(1)}
    </div>
  </header>

  <div class="links">
    <a href="../index.html">← Back to FIP</a>
    ${pr.diff ? `<a href="diff-${pr.number}.patch">View Diff</a>` : ''}
    <a href="${pr.url}" target="_blank">View on GitHub ↗</a>
  </div>

  <section>
    <h2>Description</h2>
    <div>${pr.body ? pr.body.replace(/\n/g, '<br>') : '<em>No description provided</em>'}</div>
  </section>

  ${pr.diff ? `
  <section>
    <h2>Code Changes</h2>
    <pre>${pr.diff.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </section>
  ` : ''}

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #d0d7de; color: #57606a; font-size: 14px;">
    <p>Part of FIP #${issue.number} archive</p>
  </footer>
</body>
</html>`;
    fs.writeFileSync(path.join(prDir, `pr-${pr.number}.html`), prHtml, 'utf8');
  }

  // Write metadata
  const metadata = {
    fip: {
      number: issue.number,
      title: issue.title,
      author: issue.author,
      created: issue.created,
      state: issue.state,
      labels: issue.labels,
      url: issue.url,
    },
    archive: {
      created: new Date().toISOString(),
      comments: comments.length,
      pullRequests: prs.length,
    }
  };
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );

  // Create HTML index
  createHtmlIndex(issue, comments, prs, outputDir);

  console.log('  ✓ issue.md');
  if (comments.length > 0) console.log('  ✓ comments.md');
  console.log('  ✓ metadata.json');
  console.log('  ✓ index.html');
  for (const pr of prs) {
    console.log(`  ✓ pull-requests/pr-${pr.number}.md`);
    if (pr.diff) console.log(`  ✓ pull-requests/diff-${pr.number}.patch`);
  }
}

// Upload to Filecoin
function uploadToFilecoin(outputDir) {
  console.log(`\n🚀 Uploading to Filecoin...`);

  // Check if filecoin-pin is installed
  try {
    exec('filecoin-pin --version', { silent: true });
  } catch (error) {
    console.error('Error: filecoin-pin not installed. Run: npm install -g filecoin-pin');
    throw error;
  }

  // Check environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }

  // Upload using filecoin-pin add
  try {
    const output = exec(`filecoin-pin add "${outputDir}"`, { silent: true });

    // Parse output for key values
    const pieceCidMatch = output.match(/Piece CID: (bafkz[a-z0-9]+)/);
    const rootCidMatch = output.match(/Root CID: (bafy[a-z0-9]+)/);
    const dataSetIdMatch = output.match(/Data Set ID: (\d+)/);
    const txHashMatch = output.match(/Hash: (0x[a-f0-9]+)/);
    const urlMatch = output.match(/Direct Download URL: (https?:\/\/[^\s]+)/);

    const verification = {
      uploaded: new Date().toISOString(),
      pieceCid: pieceCidMatch?.[1],
      rootCid: rootCidMatch?.[1],
      dataSetId: dataSetIdMatch?.[1],
      transactionHash: txHashMatch?.[1],
      downloadUrl: urlMatch?.[1],
      network: 'calibration',
    };

    // Write verification file
    fs.writeFileSync(
      path.join(outputDir, 'verification.json'),
      JSON.stringify(verification, null, 2),
      'utf8'
    );

    console.log('\n✅ Upload complete!');
    console.log(`\n📊 Verification Details:`);
    console.log(`  Piece CID: ${verification.pieceCid}`);
    console.log(`  Root CID: ${verification.rootCid}`);
    console.log(`  Data Set ID: ${verification.dataSetId}`);
    console.log(`  Transaction: ${verification.transactionHash}`);
    console.log(`  Download URL: ${verification.downloadUrl}`);
    console.log(`\n🔗 View on Explorer:`);
    console.log(`  https://calibration.filfox.info/tx/${verification.transactionHash}`);
    console.log(`\n🌐 Access via IPFS Gateway:`);
    console.log(`  https://ipfs.io/ipfs/${verification.rootCid}/index.html`);
    console.log(`  https://dweb.link/ipfs/${verification.rootCid}/index.html`);
    console.log(`\n💡 All links work when viewing via IPFS gateways!`);

    return verification;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  const config = parseArgs();

  console.log('🏛️  FIP Archival System');
  console.log(`📋 Issue: #${config.issue}`);
  console.log(`📦 Repository: ${config.repo}`);
  console.log(`💾 Output: ${config.output}`);
  if (config.dryRun) {
    console.log('🧪 Dry run mode (no upload)');
  }

  try {
    // Extract data
    const issue = await extractIssue(config.repo, config.issue);
    const comments = await extractComments(config.repo, config.issue);
    const prs = await extractPullRequests(
      config.repo,
      config.issue,
      issue.body,
      comments
    );

    // Create archive
    createArchive(issue, comments, prs, config.output);

    console.log('\n✅ Archive created successfully!');
    console.log(`📂 Location: ${config.output}`);
    console.log(`📄 Open: ${path.join(config.output, 'index.html')}`);

    // Upload to Filecoin (unless dry-run)
    if (!config.dryRun) {
      const verification = uploadToFilecoin(config.output);

      console.log('\n🎉 FIP archive complete and verified on Filecoin!');
      return verification;
    } else {
      console.log('\n🧪 Dry run complete - archive created but not uploaded');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { extractIssue, extractComments, extractPullRequests, createArchive, uploadToFilecoin };
