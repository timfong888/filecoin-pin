# Quick Start Guide

Get the FIP archival system running in 5 minutes.

## 1. Set GitHub Secrets

In your repository settings, add these secrets:

```bash
# Go to: Settings → Secrets and variables → Actions → New repository secret

FILECOIN_PRIVATE_KEY=0x...
FILECOIN_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
```

**Getting these values:**

1. **FILECOIN_PRIVATE_KEY**:
   - Generate: `cast wallet new` (requires Foundry)
   - Or: `node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"`

2. **FILECOIN_RPC_URL**:
   - Use default: `https://api.calibration.node.glif.io/rpc/v1`

## 2. Fund Your Wallet

```bash
# Get your wallet address
export PRIVATE_KEY="0x..."
cast wallet address --private-key $PRIVATE_KEY

# Get testnet FIL
open "https://faucet.calibnet.chainsafe-fil.io/funds.html"
# Paste your address, get 100 tFIL

# Get USDFC (testnet stablecoin)
open "https://stg.usdfc.net"
# Connect wallet, borrow 200 USDFC
```

## 3. Setup Payments

```bash
# Install filecoin-pin globally
npm install -g filecoin-pin

# Check status
filecoin-pin payments status

# Setup (first time only)
filecoin-pin payments setup --auto --deposit 50
```

## 4. Test Locally (Optional)

```bash
# Test archive without uploading
node scripts/archive-fip.js \
  --issue 1 \
  --repo filecoin-project/FIPs \
  --dry-run

# View the archive
open fip-1-archive/index.html
```

## 5. Trigger the Action

On any issue, comment:

```
FIP approved
```

The system will:
1. ✅ Extract all issue data and comments
2. ✅ Find and extract linked PRs
3. ✅ Create self-contained archive
4. ✅ Upload to Filecoin
5. ✅ Comment back with verification links

## That's It!

You now have automatic FIP archival to permanent decentralized storage.

## What You Get

For each approved FIP:
- **HTML archive** with full navigation
- **Markdown files** for issue and comments
- **Pull request diffs** with code changes
- **Filecoin proof** with Piece CID
- **Verification links** to blockchain explorer

## Verification

After archival, anyone can verify:

```bash
# From the GitHub comment, get the Piece CID
PIECE_CID="bafkzcib..."

# Download
curl -o archive.car "https://calib.ezpdpz.net/piece/$PIECE_CID"

# Verify
npm install -g ipfs-car
ipfs-car ls archive.car
```

## Next Steps

- **Customize**: Edit `scripts/archive-fip.js` for your needs
- **Test**: Follow [TESTING.md](TESTING.md) for detailed tests
- **Deploy**: Works on any GitHub repository with issues

## Troubleshooting

### "No USDFC tokens"
→ Visit https://stg.usdfc.net and borrow testnet USDFC

### "Payment setup required"
→ Run `filecoin-pin payments setup --auto --deposit 50`

### "Action didn't trigger"
→ Check the comment includes exact text "FIP approved"

## Support

- **Documentation**: [README.md](README.md)
- **Testing Guide**: [TESTING.md](TESTING.md)
- **Example Archive**: [example-archive/](example-archive/)
- **Demo Walkthrough**: [../demo-walkthrough/](../demo-walkthrough/)

## Cost

On Calibration testnet:
- ~5-10 USDFC per archive
- Free testnet tokens
- Zero cost for verification
