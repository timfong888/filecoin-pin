# Example FIP Archive

This directory shows what a typical FIP archive looks like after processing.

## Structure

```
example-archive/
├── index.html              # Main navigation page (open in browser)
├── issue.md                # Original issue body in markdown
├── comments.md             # All comments with timestamps
├── metadata.json           # Archive metadata
├── verification.json       # Filecoin storage proof
└── pull-requests/          # Linked PRs (if any)
    ├── pr-123.md           # PR description
    └── diff-123.patch      # Code changes
```

## Files Explained

### index.html
Self-contained HTML page with:
- Original issue description
- All comments in chronological order
- Links to all pull requests
- Filecoin verification section
- Proper styling for readability

### issue.md
Markdown version of the issue including:
- Title and metadata
- Author and timestamps
- Labels and state
- Full description

### comments.md
All comments from the issue thread:
- Chronological order
- Author attribution
- Timestamps
- Links to original comments

### metadata.json
Machine-readable metadata:
```json
{
  "fip": {
    "number": 123,
    "title": "Example FIP",
    "author": "username",
    "created": "2025-01-01T00:00:00Z",
    "state": "open",
    "labels": ["enhancement", "FIP"],
    "url": "https://github.com/..."
  },
  "archive": {
    "created": "2025-01-01T00:00:00Z",
    "comments": 5,
    "pullRequests": 2
  }
}
```

### verification.json
Filecoin storage verification:
```json
{
  "uploaded": "2025-01-01T00:00:00Z",
  "pieceCid": "bafkzcib...",
  "rootCid": "bafy...",
  "dataSetId": "325",
  "transactionHash": "0x...",
  "downloadUrl": "https://calib.ezpdpz.net/piece/...",
  "network": "calibration"
}
```

### pull-requests/
For each linked PR:
- `pr-{number}.md` - PR description and metadata
- `diff-{number}.patch` - Full code diff

## Viewing the Archive

### Option 1: Open in Browser
```bash
open index.html
```

### Option 2: View Markdown Files
```bash
cat issue.md
cat comments.md
```

### Option 3: Parse JSON
```bash
jq . metadata.json
jq . verification.json
```

## Verifying on Filecoin

Using the verification.json data:

```bash
# Get values
PIECE_CID=$(jq -r '.pieceCid' verification.json)
TX_HASH=$(jq -r '.transactionHash' verification.json)
DOWNLOAD_URL=$(jq -r '.downloadUrl' verification.json)

# View transaction
open "https://calibration.filfox.info/tx/$TX_HASH"

# Download archive
curl -o archive.car "$DOWNLOAD_URL"

# Verify contents
npm install -g ipfs-car
ipfs-car ls archive.car
```

## Use Cases

### 1. Permanent Record
FIPs are governance documents - this provides immutable storage.

### 2. Historical Reference
Access complete discussions and decisions even if GitHub changes.

### 3. Cryptographic Proof
PDP proofs verify the data exists on Filecoin storage providers.

### 4. Self-Contained
All links preserved - no external dependencies to break.

## Creating Your Own Archive

```bash
# Archive any FIP issue
node scripts/archive-fip.js --issue 123 --repo filecoin-project/FIPs

# Dry run (no upload)
node scripts/archive-fip.js --issue 123 --dry-run

# Custom output location
node scripts/archive-fip.js --issue 123 --output ./my-archive/
```

## Notes

- Archives are complete snapshots at creation time
- Updates to issues after archival are not included
- All links in the archive point to original sources
- HTML is self-contained with inline CSS
