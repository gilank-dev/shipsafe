# @lankdev/shipsafe-cli — Pre-Deployment Security Gatekeeper

ShipSafe CLI provides automated pre-commit and CI/CD security audits. It inspects local source files using deterministic static AST & regex security rules, ensuring zero unvetted security vectors are shipped to production.

---

## ⚡ Quickstart

### 1. Run instantly via npx (Zero Installation)
```bash
npx @lankdev/shipsafe-cli scan .
```

### 2. Install / Link Globally
```bash
npm install -g @lankdev/shipsafe-cli
# or locally in this repository:
cd cli && npm link
shipsafe scan .
```

### 3. Run directly via Node
```bash
node cli/dist/index.js scan .
```

### 4. Output Formats
```bash
# Standard Customs Docket ASCII Format
shipsafe scan .

# JSON Machine-Readable Format
shipsafe scan . --format=json

# SARIF 2.1.0 for GitHub Code Scanning
shipsafe scan . --format=sarif > results.sarif

# Remote Cloud Scan via ShipSafe VPS Engine
shipsafe scan . --remote-url=https://shipsafe.lankdev.my.id --api-key=sk_live_xxx

# Fail only on Critical issues (exit code 1)
shipsafe scan . --fail-on=critical
```

---

## 🛡️ Git Pre-Commit Hook (Husky Integration)

Add ShipSafe as a pre-commit gatekeeper in `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "[ShipSafe] Running pre-commit security docket..."
node cli/dist/index.js scan . --fail-on=high
```

If any `CRITICAL` or `HIGH` vulnerabilities are detected, the commit is aborted immediately, preventing risky code from entering the repository.

---

## 🏗️ Architecture & Conventions
- **Zero-External Dependencies**: Utilizes native Node.js 18+ APIs (`node:fs`, `node:path`, `node:util`).
- **Aesthetic**: Strictly adheres to ShipSafe's *ink-on-ruled-paper* terminal docket design (zero decorative slop).
- **Exit Codes**:
  - `0`: Scan passed (no findings meeting `--fail-on` threshold)
  - `1`: Security threshold breached (commit or pipeline should abort)
  - `2`: Runtime error or invalid arguments
