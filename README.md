# FIP Archival System

> Automatically archive approved Filecoin Improvement Proposals (FIPs) to permanent decentralized storage with cryptographic proof.

## What This Does

When someone comments **"FIP approved"** on a GitHub issue, this system:

1. **Extracts all FIP data** - Issue body, comments, linked PRs, code changes
2. **Creates self-contained archive** - HTML/markdown with clickable links
3. **Uploads to Filecoin** - Using `filecoin-pin` CLI for permanent storage
4. **Provides verification** - Returns Piece CID and blockchain proof

## Why This Matters

FIPs are critical governance documents for the Filecoin network. This ensures:

- **Permanent preservation** - FIPs stored on the network they govern
- **Cryptographic proof** - PDP (Proof of Data Possession) verifies storage
- **Self-contained records** - Complete history with all discussions and code
- **Public verifiability** - Anyone can verify the archive on-chain

## How It Works

```
"FIP approved" comment → GitHub Action triggers
                              ↓
                    Extract FIP data (issue + comments + PRs)
                              ↓
                    Create archive with links
                              ↓
                    Upload via filecoin-pin CLI
                              ↓
                    Return Piece CID + blockchain proof
                              ↓
                    Comment back with verification links
```

## Quick Start

### For Repository Owners

1. **Fork this repository**
```bash
gh repo fork timfong888/filecoin-pin
```

2. **Set up GitHub secrets** (in your repo settings)
```bash
FILECOIN_PRIVATE_KEY=0x...  # Your Filecoin wallet private key
FILECOIN_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
```

3. **Ensure you have USDFC tokens**
- Get testnet USDFC from [faucet](https://stg.usdfc.net)
- Need ~50-100 USDFC for deposits

4. **Comment "FIP approved" on any issue**
- The action runs automatically
- Archive is uploaded to Filecoin
- Bot comments back with verification links

### For Users Verifying Archives

View archived FIPs using the returned information:

```bash
# Using the Piece CID
curl https://calib.ezpdpz.net/piece/bafkzcib...

# Verify on blockchain explorer
open https://calibration.filfox.info/tx/0x...
```

## Manual Usage

You can also run the archival script manually:

```bash
# Archive a specific issue
node scripts/archive-fip.js --issue 123

# Archive with custom output
node scripts/archive-fip.js --issue 123 --output fip-123-archive/

# Dry run (don't upload)
node scripts/archive-fip.js --issue 123 --dry-run
```

## Archive Structure

Each FIP archive contains:

```
fip-{number}-archive/
├── index.html              # Main document with navigation
├── issue.md                # Original issue body
├── comments.md             # All comments with timestamps
├── pull-requests/          # Linked PRs with code changes
│   ├── pr-{number}.md
│   └── diff-{number}.patch
├── metadata.json           # FIP metadata
└── verification.json       # Filecoin storage proof
```

All internal links are preserved and clickable within the archive.

## GitHub Action Workflow

The action runs on issue comments containing "FIP approved":

```yaml
name: Archive FIP to Filecoin
on:
  issue_comment:
    types: [created]

jobs:
  archive:
    if: contains(github.event.comment.body, 'FIP approved')
    runs-on: ubuntu-22.04
    steps:
      - name: Extract FIP data
      - name: Create archive
      - name: Upload to Filecoin
      - name: Comment verification links
```

## Requirements

- **Node.js 22+** - Required for filecoin-pin
- **GitHub CLI** - For API access
- **USDFC tokens** - For Filecoin storage payments
- **Filecoin wallet** - With private key

## Configuration

### Environment Variables

```bash
PRIVATE_KEY=0x...              # Required: Filecoin wallet private key
RPC_URL=https://...            # Optional: Filecoin RPC endpoint
GITHUB_TOKEN=${{ secrets }}    # Provided by GitHub Actions
```

### Storage Costs

Approximate costs on Calibration testnet:
- Small FIP (<1MB): ~5 USDFC
- Medium FIP (1-10MB): ~10 USDFC
- Large FIP (>10MB): ~20 USDFC

## Security

**⚠️ Important Security Notes:**

- Never commit private keys to the repository
- Use GitHub Secrets for all sensitive data
- This is testnet only - not for production
- Private keys in GitHub Actions are ephemeral

## Examples

### Archived FIP Example

See [example-archive/](example-archive/) for a sample archived FIP showing:
- Complete issue and discussion
- Linked pull requests
- Code changes
- Filecoin verification data

### Verification Example

```bash
# Check the transaction on-chain
cast receipt 0x... --rpc-url $RPC_URL

# Verify the data set
filecoin-pin data-set 325

# Download and verify the archive
curl -o archive.car https://calib.ezpdpz.net/piece/bafkzcib...
ipfs-car ls archive.car
```

## Troubleshooting

### "No USDFC tokens found"
```bash
# Check balance
filecoin-pin payments status

# Get testnet USDFC
open https://stg.usdfc.net
```

### "Payment setup required"
```bash
# Run initial setup
filecoin-pin payments setup --auto --deposit 50
```

### "GitHub API rate limit"
```bash
# Use authenticated requests (automatically handled in Actions)
gh auth login
```

## Development

### Running Tests

```bash
npm install
npm test
```

### Testing the Archive Script

```bash
# Test with dry-run
node scripts/archive-fip.js --issue 1 --dry-run

# Test actual upload (requires USDFC)
node scripts/archive-fip.js --issue 1
```

### Local Testing of GitHub Action

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run the workflow locally
act issue_comment -e test-event.json
```

## Architecture

Built on:
- **[filecoin-pin](https://github.com/filecoin-project/filecoin-pin)** - CLI for uploading to Filecoin
- **[Synapse SDK](https://github.com/filecoin-project/synapse-sdk)** - Filecoin payment rails
- **[PDP Protocol](https://github.com/filecoin-project/pdp)** - Proof of Data Possession
- **GitHub Actions** - Automation platform

## Roadmap

- [ ] Support for FIP-specific metadata extraction
- [ ] IPFS gateway links for retrieval
- [ ] Mainnet support
- [ ] Archive search/indexing
- [ ] Multi-repo FIP tracking

## References

- [Filecoin Pin Demo Walkthrough](../demo-walkthrough/DEMO_WALKTHROUGH.md)
- [IPFS Pinning Service API](https://ipfs.github.io/pinning-services-api-spec/)
- [Synapse SDK Documentation](https://github.com/filecoin-project/synapse-sdk)
- [FIP Process](https://github.com/filecoin-project/FIPs)

## License

Dual-licensed under MIT + Apache 2.0 (same as upstream filecoin-pin)

## Original Project

This is a fork of [filecoin-project/filecoin-pin](https://github.com/filecoin-project/filecoin-pin) with added FIP archival automation. See [README-ORIGINAL.md](README-ORIGINAL.md) for the original documentation.
