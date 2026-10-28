import { useState } from 'react'
import { Dialog } from './Dialog'
import { useStore } from '../../state/store'

export function EcosystemModal() {
  const isOpen = useStore((s) => s.isEcosystemModalOpen)
  const activeTab = useStore((s) => s.ecosystemTab)
  const close = useStore((s) => s.closeEcosystemModal)
  const openTab = useStore((s) => s.openEcosystemModal)

  const [copiedCli, setCopiedCli] = useState(false)
  const [copiedMcp, setCopiedMcp] = useState(false)
  const [copiedHook, setCopiedHook] = useState(false)
  const [mcpClient, setMcpClient] = useState<'cursor' | 'claude' | 'windsurf'>('cursor')

  if (!isOpen) return null

  const handleCopyCli = () => {
    void navigator.clipboard.writeText('npx @shipsafe/cli scan .')
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  const handleCopyHook = () => {
    void navigator.clipboard.writeText('node cli/scripts/install-hook.js --install')
    setCopiedHook(true)
    setTimeout(() => setCopiedHook(false), 2000)
  }

  const mcpConfigs = {
    cursor: `// .cursor/mcp.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": [
        "${typeof window !== 'undefined' ? window.location.origin : 'https://shipsafe.lankdev.my.id'}/mcp/dist/index.js"
      ]
    }
  }
}`,
    claude: `// claude_desktop_config.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "node",
      "args": ["C:/ShipSafe/mcp/dist/index.js"]
    }
  }
}`,
    windsurf: `// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@shipsafe/mcp-server"]
    }
  }
}`,
  }

  const handleCopyMcp = () => {
    void navigator.clipboard.writeText(mcpConfigs[mcpClient])
    setCopiedMcp(true)
    setTimeout(() => setCopiedMcp(false), 2000)
  }

  const navigateToLandingAnchor = (anchor: string) => {
    close()
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/${anchor}`)
      window.dispatchEvent(new PopStateEvent('popstate'))
      setTimeout(() => {
        const el = document.querySelector(anchor)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }

  return (
    <Dialog title="ShipSafe Developer Ecosystem & Tools" onClose={close} wide>
      {/* 1. Modal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-rule pb-3 mb-4">
        <button
          type="button"
          onClick={() => openTab('mcp')}
          className={`font-mono text-caption uppercase px-3 py-1.5 rounded-xs font-bold transition-colors cursor-pointer border ${activeTab === 'mcp' ? 'bg-ink text-canvas border-ink' : 'bg-surface text-ink-2 border-rule hover:border-ink'}`}
        >
          ⚡ MCP Server
        </button>
        <button
          type="button"
          onClick={() => openTab('cli')}
          className={`font-mono text-caption uppercase px-3 py-1.5 rounded-xs font-bold transition-colors cursor-pointer border ${activeTab === 'cli' ? 'bg-ink text-canvas border-ink' : 'bg-surface text-ink-2 border-rule hover:border-ink'}`}
        >
          💻 Terminal CLI
        </button>
        <button
          type="button"
          onClick={() => openTab('docs')}
          className={`font-mono text-caption uppercase px-3 py-1.5 rounded-xs font-bold transition-colors cursor-pointer border ${activeTab === 'docs' ? 'bg-ink text-canvas border-ink' : 'bg-surface text-ink-2 border-rule hover:border-ink'}`}
        >
          📖 Documentation
        </button>
      </div>

      {/* 2. MCP Tab */}
      {activeTab === 'mcp' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink uppercase">Model Context Protocol (MCP) Server</h3>
              <span className="font-mono text-[10px] text-pass font-bold bg-surface px-2 py-0.5 border border-rule">
                v1.0.0 &bull; stdio JSON-RPC
              </span>
            </div>
            <p className="text-small text-ink-2 mt-1">
              Connect Cursor, Claude Desktop, Windsurf, OpenCode, and Hermes to run security scans and fix vulnerabilities autonomously.
            </p>
          </div>

          <div className="border border-rule bg-raised rounded-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-rule bg-surface px-3 py-2 font-mono text-caption">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMcpClient('cursor')}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-xs border cursor-pointer ${mcpClient === 'cursor' ? 'border-ink bg-ink text-canvas' : 'border-rule hover:border-ink'}`}
                >
                  Cursor
                </button>
                <button
                  type="button"
                  onClick={() => setMcpClient('claude')}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-xs border cursor-pointer ${mcpClient === 'claude' ? 'border-ink bg-ink text-canvas' : 'border-rule hover:border-ink'}`}
                >
                  Claude Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setMcpClient('windsurf')}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-xs border cursor-pointer ${mcpClient === 'windsurf' ? 'border-ink bg-ink text-canvas' : 'border-rule hover:border-ink'}`}
                >
                  Windsurf / Hermes
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopyMcp}
                className="font-bold uppercase px-2 py-1 text-[11px] bg-surface border border-rule hover:border-ink cursor-pointer active:scale-95"
              >
                {copiedMcp ? '✓ COPIED' : 'COPY CONFIG'}
              </button>
            </div>
            <pre className="p-3 text-caption font-mono text-ink overflow-x-auto leading-relaxed bg-raised">
              {mcpConfigs[mcpClient]}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-caption font-bold text-ink-3 uppercase">4 Native MCP Tools</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-caption">
              <div className="border border-rule p-2 bg-surface rounded-xs">
                <span className="font-bold text-ink">audit_codebase</span>
                <p className="text-ink-2 text-[11px]">Scans directory against 10 critical web threat vectors.</p>
              </div>
              <div className="border border-rule p-2 bg-surface rounded-xs">
                <span className="font-bold text-ink">get_threat_matrix</span>
                <p className="text-ink-2 text-[11px]">Returns security posture matrix per vector.</p>
              </div>
              <div className="border border-rule p-2 bg-surface rounded-xs">
                <span className="font-bold text-ink">get_remediation_prompt</span>
                <p className="text-ink-2 text-[11px]">Returns 1-click tailored prompt for agent fix.</p>
              </div>
              <div className="border border-rule p-2 bg-surface rounded-xs">
                <span className="font-bold text-ink">verify_fix</span>
                <p className="text-ink-2 text-[11px]">Validates if the vulnerability was patched cleanly.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateToLandingAnchor('#mcp')}
              className="text-small font-bold text-ink hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View full MCP showcase on Landing Page</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CLI Tab */}
      {activeTab === 'cli' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink uppercase">ShipSafe Terminal CLI &amp; Git Gatekeeper</h3>
              <span className="font-mono text-[10px] text-ink font-bold bg-surface px-2 py-0.5 border border-rule">
                SARIF 2.1.0 &bull; Local AST
              </span>
            </div>
            <p className="text-small text-ink-2 mt-1">
              Run audits on local directories before committing. Zero dependencies, offline-ready, outputs Customs Docket ASCII table.
            </p>
          </div>

          <div className="space-y-3">
            <div className="border border-rule bg-surface p-3 rounded-sm">
              <div className="font-mono text-[11px] font-bold text-ink-3 uppercase mb-1">AUDIT LOCAL DIRECTORY</div>
              <div className="flex items-center justify-between bg-raised p-2 rounded-xs border border-rule font-mono text-small">
                <code className="text-ink font-bold">npx @shipsafe/cli scan .</code>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="text-caption px-2 py-0.5 border border-rule hover:border-ink bg-surface font-bold uppercase cursor-pointer"
                >
                  {copiedCli ? '✓' : 'COPY'}
                </button>
              </div>
            </div>

            <div className="border border-rule bg-surface p-3 rounded-sm">
              <div className="font-mono text-[11px] font-bold text-ink-3 uppercase mb-1">ONE-CLICK PRE-COMMIT HOOK INSTALLER</div>
              <div className="flex items-center justify-between bg-raised p-2 rounded-xs border border-rule font-mono text-small">
                <code className="text-ink font-bold">node cli/scripts/install-hook.js --install</code>
                <button
                  type="button"
                  onClick={handleCopyHook}
                  className="text-caption px-2 py-0.5 border border-rule hover:border-ink bg-surface font-bold uppercase cursor-pointer"
                >
                  {copiedHook ? '✓' : 'COPY'}
                </button>
              </div>
              <p className="text-[11px] text-ink-2 mt-1.5 font-mono">
                Blocks any git commit containing CRITICAL or HIGH security flaws automatically.
              </p>
            </div>

            <div className="border border-rule bg-surface p-3 rounded-sm font-mono text-caption">
              <div className="font-bold text-ink uppercase mb-1">DETERMINISTIC CI/CD EXIT CODES</div>
              <div className="text-ink-2 space-y-1 text-[11px]">
                <div><code className="text-pass font-bold">0</code>: Scan passed cleanly (Clean release)</div>
                <div><code className="text-fail font-bold">1</code>: Security breach detected (Commit / CI pipeline blocked)</div>
                <div><code className="text-ink-3 font-bold">2</code>: Runtime error or invalid arguments</div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateToLandingAnchor('#cli')}
              className="text-small font-bold text-ink hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View full CLI guide on Landing Page</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Documentation Tab */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-ink uppercase">Security Architecture &amp; Threat Vectors</h3>
            <p className="text-small text-ink-2 mt-1">
              ShipSafe protects vibe-coded projects from 10 critical security vectors with zero code retention.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-caption font-mono">
            {[
              { id: 'V01', name: 'SQL Injection', desc: 'Raw SQL concatenation in ORMs & db queries' },
              { id: 'V02', name: 'Cross-Site Scripting (XSS)', desc: 'dangerouslySetInnerHTML & document.write' },
              { id: 'V03', name: 'DDoS & ReDoS', desc: 'Missing rate limiters and exponential regex' },
              { id: 'V04', name: 'Brute Force & Timing', desc: 'Plaintext string password compare' },
              { id: 'V05', name: 'Malware & Web Shell', desc: 'Dangerous PHP/Node shell signatures' },
              { id: 'V06', name: 'MitM & Broken TLS', desc: 'rejectUnauthorized: false, plaintext cookies' },
              { id: 'V07', name: 'Phishing & Open Redirect', desc: 'Unvalidated redirect parameters' },
              { id: 'V08', name: 'Defacement Risks', desc: 'Unauthenticated template/webroot modification' },
              { id: 'V09', name: 'LFI / RFI & SSRF', desc: 'Path traversal in fs.readFile & unvalidated fetch' },
              { id: 'V10', name: 'Zero-Day Dynamic Exec', desc: 'eval(), new Function(), prototype pollution' },
            ].map((v) => (
              <div key={v.id} className="border border-rule p-2 bg-surface rounded-xs">
                <span className="font-bold text-ink">{v.id}: {v.name}</span>
                <p className="text-ink-2 text-[11px] mt-0.5">{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-rule pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-caption font-mono">
              <a
                href="https://github.com/gilank-dev/shipsafe/blob/main/DOCUMENTATION.md"
                target="_blank"
                rel="noreferrer"
                className="text-ink font-bold hover:underline"
              >
                📄 DOCUMENTATION.md (Indonesian)
              </a>
              <span className="text-rule-strong">&bull;</span>
              <a
                href="https://github.com/gilank-dev/shipsafe/blob/main/SPEC_LANDING_MCP_CLI.md"
                target="_blank"
                rel="noreferrer"
                className="text-ink font-bold hover:underline"
              >
                📐 SPEC_LANDING_MCP_CLI.md
              </a>
            </div>
            <button
              type="button"
              onClick={() => navigateToLandingAnchor('#threat-matrix')}
              className="text-small font-bold text-ink hover:underline cursor-pointer"
            >
              View Threat Matrix on Landing Page &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 5. Footer */}
      <div className="mt-6 pt-3 border-t border-rule flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            close()
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }
          }}
          className="font-mono text-caption uppercase text-ink font-bold hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>&larr; Return to Landing Page</span>
        </button>
        <button
          type="button"
          onClick={close}
          className="btn px-4 py-1.5 font-mono text-caption uppercase font-bold"
        >
          Close
        </button>
      </div>
    </Dialog>
  )
}
