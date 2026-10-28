# @lankdev/shipsafe-mcp — ShipSafe Model Context Protocol (MCP) Server

> Deterministic Pre-Deployment Security Gatekeeper for AI Coding Agents via stdio JSON-RPC 2.0.

ShipSafe MCP Server bridges your AI assistants (**Cursor**, **Claude Desktop**, **Windsurf**, **OpenCode**, and **Hermes**) directly into ShipSafe's local static AST & regex security engine. AI agents can audit codebases, inspect threat matrices, retrieve targeted remediation prompts, and verify security fixes in real-time.

---

## ⚡ Quickstart

### Quick Execution via npx (Zero Install)
You can connect your agent directly via `npx -y @lankdev/shipsafe-mcp`:

```bash
npx -y @lankdev/shipsafe-mcp
```

### Local Installation / Build
```bash
git clone https://github.com/gilank-dev/shipsafe.git
cd shipsafe/mcp
npm install
npm run build
npm start
```

---

## 🛠️ Client Configurations (stdio JSON-RPC)

### 1. Cursor
Add the following to your project's `.cursor/mcp.json` or global Cursor settings:

```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}
```
*Or using local build:*
```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": ["./mcp/dist/index.js"]
    }
  }
}
```

### 2. Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}
```

### 3. Windsurf (Cascade)
Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}
```

### 4. OpenCode
Add to your `opencode.json` or agent tools configuration:

```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}
```

### 5. Hermes Agent
Add to your Hermes tools / MCP configuration (`hermes.json` or config gateway):

```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}
```

---

## 🔍 MCP Tools Reference

### 1. `audit_codebase`
Performs a deep static security scan across project files against 10 critical web threat vectors.
- **Parameters**:
  - `path` *(string, optional)*: Local target directory to scan (defaults to current directory).
  - `targetAgent` *(string, optional)*: Targeted remediation prompt formatting (`Generic`, `Cursor`, `ClaudeCode`, `Copilot`, `Windsurf`).
- **Returns**: Formatted customs docket verdict, summary, and structured security findings.

### 2. `get_threat_matrix`
Returns the real-time security posture across all 10 threat vectors (`Secure`, `Warning`, `Vulnerable`).
- **Parameters**:
  - `path` *(string, optional)*: Local target directory to evaluate.

### 3. `get_remediation_prompt`
Generates a standalone, actionable remediation prompt tailored for a specific finding and agent.
- **Parameters**:
  - `findingId` *(string, required)*: Vulnerability finding identifier.
  - `filePath` *(string, optional)*: Path to the affected file.
  - `targetAgent` *(string, optional)*: Desired prompt format.

### 4. `verify_fix`
Re-audits a modified file to confirm that the targeted vulnerability is completely eradicated.
- **Parameters**:
  - `filePath` *(string, required)*: Relative or absolute path to the modified file.
  - `findingType` *(string, optional)*: Threat vector rule to verify against.

---

## 🔒 Security & Privacy Guarantees
- **Zero-Persistence**: Code files are inspected locally in memory and never stored.
- **Deterministic Static AST & Regex**: Fast and reproducible scans without cloud dependency.
- **Secret Masking**: Discovered secrets and keys are masked (`sk_l****`) before appearing in any tool output.
- **No Code Execution**: Scanned files are parsed strictly as data and never executed.

---

## 📄 License
MIT © LankDev
