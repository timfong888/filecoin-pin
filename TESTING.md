# Testing the FIP Archival System

This guide shows how to test the FIP archival system locally before deploying.

## Prerequisites

1. **GitHub CLI** - For API access
```bash
brew install gh
gh auth login
```

2. **Node.js 22+** - For running scripts
```bash
nvm install 22
nvm use 22
```

3. **filecoin-pin CLI** - For uploading to Filecoin
```bash
npm install -g filecoin-pin
```

4. **Environment Setup**
```bash
# Required for testing
export GITHUB_TOKEN="ghp_your_token_here"
export PRIVATE_KEY="0x_your_private_key_here"
export RPC_URL="https://api.calibration.node.glif.io/rpc/v1"
```

## Test 1: Dry Run (No Upload)

Test the archive creation without uploading to Filecoin:

```bash
# Archive a public FIP issue (no upload)
node scripts/archive-fip.js \
  --issue 1 \
  --repo filecoin-project/FIPs \
  --dry-run

# Check the output
ls -la fip-1-archive/
open fip-1-archive/index.html
```

**Expected output:**
```
fip-1-archive/
├── index.html              # Main navigation page
├── issue.md                # Original issue
├── comments.md             # All comments
├── metadata.json           # Archive metadata
└── pull-requests/          # Linked PRs (if any)
```

## Test 2: Local Repository Issue

Test with an issue from your own repository:

```bash
# Create a test issue in your repo
gh issue create \
  --title "Test FIP: Sample Improvement" \
  --body "This is a test FIP for archival." \
  --label "enhancement"

# Get the issue number
ISSUE_NUM=$(gh issue list --limit 1 --json number --jq '.[0].number')

# Archive it (dry run)
node scripts/archive-fip.js \
  --issue $ISSUE_NUM \
  --repo $(gh repo view --json nameWithOwner -q .nameWithOwner) \
  --dry-run
```

## Test 3: Full Upload to Filecoin

Test the complete workflow including upload:

```bash
# First, ensure you have USDFC tokens
filecoin-pin payments status

# If needed, setup payments
filecoin-pin payments setup --auto --deposit 50

# Archive and upload
node scripts/archive-fip.js \
  --issue $ISSUE_NUM \
  --repo $(gh repo view --json nameWithOwner -q .nameWithOwner)
```

**Expected output:**
```
🏛️  FIP Archival System
📋 Issue: #1
📦 Repository: timfong888/filecoin-pin
💾 Output: ./fip-1-archive

📥 Extracting issue #1...
💬 Extracting comments...
🔗 Extracting linked pull requests...
📦 Creating archive...
  ✓ issue.md
  ✓ comments.md
  ✓ metadata.json
  ✓ index.html

🚀 Uploading to Filecoin...

✅ Upload complete!

📊 Verification Details:
  Piece CID: bafkzcib...
  Root CID: bafy...
  Data Set ID: 325
  Transaction: 0x...
  Download URL: https://calib.ezpdpz.net/piece/...

🔗 View on Explorer:
  https://calibration.filfox.info/tx/0x...
```

## Test 4: GitHub Action Locally

Test the GitHub Action workflow locally using `act`:

### Install act

```bash
brew install act
```

### Create test event file

```bash
cat > test-event.json << 'EOF'
{
  "issue": {
    "number": 1,
    "pull_request": null
  },
  "comment": {
    "body": "FIP approved"
  },
  "repository": {
    "name": "filecoin-pin",
    "owner": {
      "login": "timfong888"
    }
  }
}
EOF
```

### Run the action

```bash
# Dry run (see what would happen)
act issue_comment -e test-event.json --dryrun

# Full run (requires secrets)
act issue_comment -e test-event.json \
  --secret FILECOIN_PRIVATE_KEY="0x..." \
  --secret GITHUB_TOKEN="ghp_..."
```

## Test 5: Verify Archive on Filecoin

After a successful upload, verify the archive:

```bash
# Get verification data from the archive
PIECE_CID=$(jq -r '.pieceCid' fip-1-archive/verification.json)
TX_HASH=$(jq -r '.transactionHash' fip-1-archive/verification.json)
DOWNLOAD_URL=$(jq -r '.downloadUrl' fip-1-archive/verification.json)

# 1. Check transaction on-chain
cast receipt $TX_HASH --rpc-url $RPC_URL

# 2. Download the archive
curl -o archive.car "$DOWNLOAD_URL"

# 3. List contents
npm install -g ipfs-car
ipfs-car ls archive.car

# 4. Extract and verify
ipfs-car unpack archive.car --output extracted/
diff -r fip-1-archive/ extracted/
```

## Test 6: Full End-to-End Test

Complete workflow test:

```bash
# 1. Create test issue
ISSUE_NUM=$(gh issue create \
  --title "Test FIP: E2E Test $(date +%Y%m%d-%H%M%S)" \
  --body "This is an end-to-end test of the FIP archival system." \
  --label "test" \
  --json number -q .number)

# 2. Add a comment
gh issue comment $ISSUE_NUM --body "This is a test comment with a link to #1"

# 3. Archive it
node scripts/archive-fip.js \
  --issue $ISSUE_NUM \
  --repo $(gh repo view --json nameWithOwner -q .nameWithOwner)

# 4. Verify the archive
ls -la fip-$ISSUE_NUM-archive/
open fip-$ISSUE_NUM-archive/index.html

# 5. Check Filecoin verification
cat fip-$ISSUE_NUM-archive/verification.json | jq

# 6. Close the test issue
gh issue close $ISSUE_NUM
```

## Common Issues

### "filecoin-pin not found"
```bash
npm install -g filecoin-pin
# Or use npx
npx filecoin-pin payments status
```

### "No USDFC tokens"
```bash
# Check balance
filecoin-pin payments status

# Get testnet USDFC
open https://stg.usdfc.net
```

### "GitHub API rate limit"
```bash
# Check rate limit
gh api rate_limit

# Use authentication
gh auth login
```

### "PRIVATE_KEY not set"
```bash
export PRIVATE_KEY="0x..."
# Or use .env file (never commit this!)
echo "PRIVATE_KEY=0x..." >> .env
source .env
```

## Automated Testing

Run all tests in sequence:

```bash
#!/bin/bash
set -e

echo "🧪 Running FIP Archival System Tests"

# Test 1: Dry run
echo "Test 1: Dry run archive..."
node scripts/archive-fip.js --issue 1 --repo filecoin-project/FIPs --dry-run
rm -rf fip-1-archive

# Test 2: Check environment
echo "Test 2: Environment check..."
filecoin-pin --version
gh --version
node --version

# Test 3: Payment status
echo "Test 3: Payment status..."
filecoin-pin payments status

echo "✅ All tests passed!"
```

Save as `test-all.sh` and run:
```bash
chmod +x test-all.sh
./test-all.sh
```

## Performance Benchmarks

Expected times for different archive sizes:

| Archive Size | Extract Time | Upload Time | Total Time |
|-------------|--------------|-------------|------------|
| Small (<1MB) | ~5s | ~30s | ~35s |
| Medium (1-5MB) | ~10s | ~60s | ~70s |
| Large (5-10MB) | ~20s | ~120s | ~140s |

## Next Steps

After testing locally:

1. **Push to GitHub**
```bash
git add .
git commit -m "Add FIP archival system"
git push
```

2. **Set secrets**
```bash
gh secret set FILECOIN_PRIVATE_KEY
gh secret set FILECOIN_RPC_URL
```

3. **Test on GitHub**
- Comment "FIP approved" on a test issue
- Watch the action run
- Verify the comment with verification details

## Troubleshooting

For detailed logs:

```bash
# Run script with verbose output
node scripts/archive-fip.js --issue 1 --repo filecoin-project/FIPs --dry-run 2>&1 | tee archive-log.txt

# Check filecoin-pin logs
filecoin-pin payments status 2>&1 | tee payment-log.txt
```

## References

- [Demo Walkthrough](../demo-walkthrough/DEMO_WALKTHROUGH.md)
- [filecoin-pin Documentation](README-ORIGINAL.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
