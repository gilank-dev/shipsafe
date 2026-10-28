# 🤖 ShipSafe Model Context Protocol (MCP) Server Guide

> **Package**: `@shipsafe/mcp-server`  
> **Protocol**: Standard Model Context Protocol (MCP) via stdio JSON-RPC 2.0  
> **Compatibility**: Cursor, Claude Desktop, Windsurf, OpenCode, Hermes  
> **Repository**: [github.com/gilank-dev/shipsafe](https://github.com/gilank-dev/shipsafe)

---

## 📌 Ringkasan

ShipSafe MCP Server menjembatani coding assistant AI Anda (Cursor, Claude Desktop, Windsurf, dll.) secara langsung ke engine analisis keamanan ShipSafe. Dengan server MCP ini, AI agent dapat:
1. Menjalankan audit keamanan statis terhadap 10 Vektor Ancaman langsung dari editor.
2. Membaca status matriks ancaman (*Threat Matrix*) secara otomatis.
3. Mendapatkan prompt remediasi terstruktur untuk memperbaiki kerentanan.
4. Memvalidasi perbaikan (*self-healing loop*) dengan tool `verify_fix`.

---

## 🛠️ Daftar Tools MCP

### 1. `audit_codebase`
Memindai seluruh struktur direktori proyek terhadap 10 vektor ancaman web:
- **Argumen**:
  - `path` (string, opsional): Path direktori lokal yang akan diaudit (default: direktori kerja saat ini).
  - `targetAgent` (string, opsional): Format prompt remediasi (`Generic`, `Cursor`, `ClaudeCode`, `Copilot`, `Windsurf`).
- **Contoh Output**:
  ```json
  {
    "verdict": "ACTION REQUIRED (QUARANTINED)",
    "summary": "Scan completed. Found 2 issue(s): 1 Critical, 1 High.",
    "findings": [
      {
        "id": "F-SEC-001-1",
        "file": "src/config/stripe.ts",
        "line": 8,
        "title": "Hardcoded Secret / API Key",
        "severity": "Critical",
        "remediationPrompt": "Remove hardcoded secret. Load via process.env with secure fallback..."
      }
    ]
  }
  ```

### 2. `get_threat_matrix`
Mengembalikan status keamanan untuk 10 Vektor Ancaman (`Secure`, `Warning`, `Vulnerable`):
- **Argumen**: `path` (string).

### 3. `get_remediation_prompt`
Mengambil prompt remediasi spesifik dan mandiri untuk temuan tertentu:
- **Argumen**: `findingId` (string, wajib), `filePath` (string), `targetAgent` (string).

### 4. `verify_fix`
Memverifikasi ulang file yang telah diedit untuk memastikan kerentanan benar-benar tertutup:
- **Argumen**: `filePath` (string, wajib), `findingType` (string).

---

## ⚙️ Panduan Konfigurasi Klien MCP

### 1. Claude Desktop
Tambahkan konfigurasi berikut ke file konfigurasi Claude Desktop Anda:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": ["C:/Users/HYPE AMD/files/PROJECT/PERSONAL/ShipSafe/mcp/dist/index.js"]
    }
  }
}
```

### 2. Cursor
Buat atau perbarui file `.cursor/mcp.json` di root workspace Anda:
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

### 3. Windsurf (Cascade)
Tambahkan ke konfigurasi MCP Windsurf di `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": ["C:/Users/HYPE AMD/files/PROJECT/PERSONAL/ShipSafe/mcp/dist/index.js"]
    }
  }
}
```

### 4. OpenCode & Hermes Agent
Tambahkan ke konfigurasi provider tools MCP:
```json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": ["/path/to/shipsafe/mcp/dist/index.js"]
    }
  }
}
```

---

## 🔒 Privasi & Keamanan (Zero-Persistence Guarantee)
- MCP server membaca kode sumber secara lokal dan sementara.
- Secret yang terdeteksi di-mask secara otomatis sebelum ditampilkan di output tool.
- Tidak ada kode yang diunggah ke cloud publik tanpa otorisasi eksplisit pengguna.
