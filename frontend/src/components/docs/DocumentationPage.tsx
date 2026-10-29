import React, { useState, useEffect } from 'react'
import {
  Shield,
  Terminal,
  Cpu,
  FileCode,
  Layers,
  HelpCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  BookOpen,
} from 'lucide-react'

export const DocumentationPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      if (['overview', 'threat-vectors', 'usage', 'prompts', 'mcp', 'cli', 'troubleshoot'].includes(hash)) {
        return hash
      }
    }
    return 'overview'
  })
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSnippet(id)
      setTimeout(() => setCopiedSnippet(null), 2000)
    })
  }

  const sections = [
    { id: 'overview', title: '1. Overview & Arsitektur', icon: Shield },
    { id: 'threat-vectors', title: '2. 10 Threat Vectors', icon: AlertTriangle },
    { id: 'usage', title: '3. Cara Penggunaan', icon: FileCode },
    { id: 'prompts', title: '4. 10 Coding Agents & Prompts', icon: Layers },
    { id: 'mcp', title: '5. Integrasi MCP Server', icon: Cpu },
    { id: 'cli', title: '6. Terminal CLI & Pre-Commit', icon: Terminal },
    { id: 'troubleshoot', title: '7. Panduan Troubleshooting', icon: HelpCircle },
  ]

  // Listen to hash changes in URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (['overview', 'threat-vectors', 'usage', 'prompts', 'mcp', 'cli', 'troubleshoot'].includes(hash)) {
        setActiveSection(hash)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleSelectPage = (id: string) => {
    setActiveSection(id)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `#${id}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const currentIndex = sections.findIndex((s) => s.id === activeSection)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const currentSection = sections[safeIndex] || { id: 'overview', title: '1. Overview & Arsitektur', icon: Shield }
  const prevSection = safeIndex > 0 ? sections[safeIndex - 1] : null
  const nextSection = safeIndex < sections.length - 1 ? sections[safeIndex + 1] : null

  return (
    <div className="w-full bg-canvas text-ink min-h-screen">
      {/* Header Banner */}
      <div className="border-b border-rule bg-surface/40 px-4 sm:px-6 md:px-8 xl:px-12 py-6">
        <div className="max-w-[105rem] mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-3 uppercase tracking-wider">
            <BookOpen className="size-3.5 text-ink-2" strokeWidth={1.5} />
            <span>Dokumentasi Resmi &amp; Panduan Teknis ShipSafe</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            ShipSafe Developer &amp; Security Documentation
          </h1>
          <p className="text-sm text-ink-2 max-w-4xl leading-relaxed font-sans">
            Panduan lengkap arsitektur zero-persistence, 10 vektor ancaman keamanan statis, integrasi MCP Server untuk coding agents, terminal CLI gatekeeper, dan panduan troubleshooting.
          </p>
        </div>
      </div>

      <div className="max-w-[105rem] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-8 flex flex-col lg:flex-row gap-8 xl:gap-12 items-start">
        {/* On-Page Sticky Table of Contents (Pages List) */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-[calc(var(--rail-h,3.5rem)+1.5rem)] max-h-[calc(100dvh-var(--rail-h,3.5rem)-3rem)] overflow-y-auto custom-scrollbar border border-rule bg-surface/50 p-4 rounded-none">
          <div className="flex items-center justify-between mb-3 border-b border-rule pb-2">
            <p className="text-xs font-mono uppercase tracking-wider font-bold text-ink-3">
              Daftar Isi Dokumentasi
            </p>
            <span className="text-[10px] font-mono text-ink-3">
              {safeIndex + 1} / {sections.length}
            </span>
          </div>
          <nav className="flex flex-col space-y-1">
            {sections.map((sec, idx) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectPage(sec.id)}
                  className={`flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-none text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-ink text-canvas font-semibold shadow-xs'
                      : 'text-ink-2 hover:text-ink hover:bg-surface'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{sec.title}</span>
                  </span>
                  {isActive ? (
                    <ChevronRight className="size-3 shrink-0 ml-1" />
                  ) : (
                    <span className="text-[10px] font-mono text-ink-3 shrink-0">{idx + 1}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Paginated Content Area: Renders ONLY Current Chapter/Page */}
        <div className="flex-1 min-w-0 space-y-8 pb-20 text-sm leading-relaxed text-ink-2 font-sans animate-fade-in">
          {/* Breadcrumb Top Bar */}
          <div className="flex items-center justify-between border-b border-rule pb-3 font-mono text-xs text-ink-3">
            <div className="flex items-center gap-2">
              <span>Dokumentasi</span>
              <span>/</span>
              <span className="text-ink font-semibold">{currentSection.title}</span>
            </div>
            <span>Halaman {safeIndex + 1} dari {sections.length}</span>
          </div>

          {/* PAGE 1: OVERVIEW & ARSITEKTUR */}
          {activeSection === 'overview' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Shield className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>1. Overview &amp; Arsitektur Zero-Persistence</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Arsitektur audit statis, jaminan keamanan memori sementara, dan integritas isolasi kode.
                </p>
              </div>

              <p>
                <strong>ShipSafe</strong> adalah <em>pre-deployment security auditor</em> untuk aplikasi web modern dan proyek vibe-coding. Dibangun khusus untuk memutus rantai kerentanan sebelum kode di-deploy ke production atau di-push ke repositori publik.
              </p>

              <div className="p-4 border border-rule bg-surface space-y-2">
                <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider">
                  Prinsip Zero-Persistence (Kerahasiaan Kode 100%)
                </h3>
                <p className="text-xs leading-relaxed">
                  Kode sumber Anda tidak pernah disimpan secara permanen di server kami. Berkas ZIP yang diunggah diekstraksi ke direktori terisolasi <code>/tmp/shipsafe-*</code>, dianalisis menggunakan AST scanner statis murni tanpa pernah dieksekusi, lalu direktori tersebut segera dimusnahkan secara aman dalam blok <code>finally &#123; cleanupTempDir() &#125;</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="border border-rule bg-surface p-4">
                  <p className="font-mono text-xs font-bold text-ink uppercase tracking-wide">Zero Raw Storage</p>
                  <p className="text-xs text-ink-2 mt-2 leading-relaxed">Arsip ZIP dan source code langsung dihapus dari disk setelah audit selesai.</p>
                </div>
                <div className="border border-rule bg-surface p-4">
                  <p className="font-mono text-xs font-bold text-ink uppercase tracking-wide">No Code Execution</p>
                  <p className="text-xs text-ink-2 mt-2 leading-relaxed">Kode hanya diparsing sebagai data statis (AST &amp; token), tidak pernah dijalankan.</p>
                </div>
                <div className="border border-rule bg-surface p-4">
                  <p className="font-mono text-xs font-bold text-ink uppercase tracking-wide">Secret Masking</p>
                  <p className="text-xs text-ink-2 mt-2 leading-relaxed">Token &amp; API key otomatis disensor menjadi 4 karakter awal + **** sebelum analisis.</p>
                </div>
              </div>
            </section>
          )}

          {/* PAGE 2: 10 THREAT VECTORS */}
          {activeSection === 'threat-vectors' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <AlertTriangle className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>2. Matriks 10 Threat Vectors Yang Diaudit</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  10 Vektor CWE/OWASP terpenting yang dipindai otomatis oleh AST engine ShipSafe.
                </p>
              </div>

              <p>
                Engine scanner statis ShipSafe mengaudit 10 kategori ancaman utama pada aplikasi JavaScript/TypeScript, Python, dan backend modern:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V01] SQL Injection (SQLi)</span>
                    <span className="text-ink-3 font-normal">CWE-89</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi penggabungan string atau template literal langsung ke dalam query SQL (contoh: <code>db.query(`SELECT * FROM users WHERE id = $&#123;id&#125;`)</code>) tanpa parameterized query atau ORM binding.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V02] Cross-Site Scripting (XSS)</span>
                    <span className="text-ink-3 font-normal">CWE-79</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi rendering HTML tanpa sanitasi melalui <code>dangerouslySetInnerHTML</code>, <code>innerHTML</code>, <code>document.write</code>, atau <code>v-html</code>.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V03] Denial of Service (DDoS &amp; ReDoS)</span>
                    <span className="text-ink-3 font-normal">CWE-400 / CWE-1333</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi ketiadaan rate limiter pada endpoint API publik, endpoint tanpa pagination limit, dan regex berbahaya yang rentan catastrophic backtracking.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V04] Brute Force &amp; Weak Cryptography</span>
                    <span className="text-ink-3 font-normal">CWE-307 / CWE-328</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi komparasi password plaintext, algoritma hashing lemah (MD5 / SHA1 untuk sandi), dan perbandingan token tanpa timing-safe comparison.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V05] Web Shell &amp; Arbitrary File Upload</span>
                    <span className="text-ink-3 font-normal">CWE-434</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi handler upload berkas tanpa validasi MIME type, tanpa batasan ukuran, dan tanpa sanitasi ekstensi berkas yang memungkinkan eksekusi file script.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V06] Man-in-the-Middle (MitM) &amp; Plaintext Transmission</span>
                    <span className="text-ink-3 font-normal">CWE-319 / CWE-295</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi penonaktifan verifikasi sertifikat SSL (<code>rejectUnauthorized: false</code>), kredensial lewat HTTP tidak terenkripsi, dan cookie tanpa flag <code>Secure; HttpOnly; SameSite</code>.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V07] Phishing &amp; Open Redirect</span>
                    <span className="text-ink-3 font-normal">CWE-601 / CWE-1021</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi <code>res.redirect(req.query.url)</code> tanpa whitelist domain tujuan, serta ketiadaan header <code>X-Frame-Options</code> dan <code>Content-Security-Policy</code>.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V08] Defacement &amp; Insecure Webroot Write</span>
                    <span className="text-ink-3 font-normal">CWE-73</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi penulisan berkas langsung ke direktori publik atau webroot yang memungkinkan modifikasi aset frontend tanpa otorisasi.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V09] LFI / RFI &amp; Server-Side Request Forgery (SSRF)</span>
                    <span className="text-ink-3 font-normal">CWE-22 / CWE-918</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi path traversal pada <code>fs.readFile(req.query.path)</code> dan fetch URL eksternal yang tidak divalidasi (<code>fetch(req.body.targetUrl)</code>) yang dapat mengakses metadata cloud internal.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-ink font-bold">
                    <span>[V10] Zero-Day, Prototype Pollution &amp; Unsafe Code Execution</span>
                    <span className="text-ink-3 font-normal">CWE-94 / CWE-1321</span>
                  </div>
                  <p className="text-ink-2 font-sans text-xs">
                    Mendeteksi penggunaan <code>eval()</code>, <code>new Function()</code>, dynamic module loading tidak terpercaya, dan recursive merge tanpa sanitasi key <code>__proto__</code>.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* PAGE 3: USAGE MODES */}
          {activeSection === 'usage' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <FileCode className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>3. Cara Penggunaan (Input Codebase)</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Panduan tiga metode input proyek: ZIP Upload, GitHub Ingestion, dan Demo Presets.
                </p>
              </div>

              <div className="space-y-6">
                <div className="border border-rule bg-surface p-5 space-y-2">
                  <h3 className="font-bold text-ink text-sm font-mono uppercase tracking-wider">
                    Opsi A: Upload ZIP Codebase
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Kompres direktori proyek Anda ke dalam format <code>.zip</code> (maksimal 10 MB untuk paket Free, 50 MB untuk Pro, dan 100 MB untuk Enterprise). Seret dan lepas berkas ke dropzone di tab Submission.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-5 space-y-2">
                  <h3 className="font-bold text-ink text-sm font-mono uppercase tracking-wider">
                    Opsi B: Import Repositori GitHub
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Ganti mode submission ke tab <strong>GitHub Repo</strong>. Masukkan URL repositori GitHub publik (contoh: <code>owner/repo</code> atau <code>https://github.com/owner/repo</code>). Backend ShipSafe akan otomatis mengunduh zipball repositori, memvalidasi integritas magic bytes, dan memulai audit secara instan.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-5 space-y-2">
                  <h3 className="font-bold text-ink text-sm font-mono uppercase tracking-wider">
                    Opsi C: Preset Proyek Contoh (Demo)
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Gunakan menu dropdown <strong>Load sample</strong> di toolbar untuk menguji kapabilitas audit:
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1.5 mt-2 text-ink-2 pl-2 font-mono">
                    <li><strong>Ledgerline</strong>: Invoicing SaaS (Next.js + Supabase) dengan celah SQLi dan hardcoded Stripe secrets.</li>
                    <li><strong>Waybill</strong>: Internal dispatch tool dengan celah CORS dan ketiadaan rate limiter.</li>
                    <li><strong>Harborlog</strong>: Static documentation site berbasis Astro (profil keamanan bersih).</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* PAGE 4: 10 CODING AGENTS & PROMPTS */}
          {activeSection === 'prompts' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Layers className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>4. 1-Click AI Remediation Prompt untuk 10 Coding Agents</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Format prompt perbaikan presisi untuk Cursor, Claude Code, Copilot, Windsurf, dan lainnya.
                </p>
              </div>

              <p>
                Setiap temuan kerentanan yang terdeteksi menghasilkan prompt perbaikan terstruktur yang disesuaikan secara sintaksis untuk coding agent pilihan Anda:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs text-center">
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Cursor</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Claude Code</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Windsurf</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">GitHub Copilot</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">OpenCode</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Hermes</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Aider</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Cline</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Roo Code</span>
                <span className="p-2.5 border border-rule bg-surface font-semibold text-ink">Continue</span>
              </div>

              <div className="p-5 border border-rule bg-surface space-y-3">
                <p className="font-bold text-ink text-xs uppercase font-mono tracking-wider">
                  Anatomi Remediation Prompt ShipSafe
                </p>
                <pre className="font-mono text-xs bg-canvas p-4 border border-rule/60 overflow-x-auto text-ink leading-relaxed">
{`Fix the following security finding in: src/api/payment.ts:42
Vulnerability: SQL Injection (CWE-89)
Impact: Arbitrary database queries can be executed via unvalidated parameters.

Requirements:
1. Replace string concatenation with parameterized SQL queries.
2. Ensure input validation is handled before executing the query.
3. Verify the fix using automated test cases.`}
                </pre>
              </div>
            </section>
          )}

          {/* PAGE 5: MCP SERVER INTEGRATION */}
          {activeSection === 'mcp' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Cpu className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>5. Integrasi ShipSafe MCP Server (@lankdev/shipsafe-mcp)</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Protokol Model Context Protocol stdio JSON-RPC 2.0 untuk integrasi Cursor &amp; Claude Desktop.
                </p>
              </div>

              <p>
                ShipSafe menyediakan Model Context Protocol (MCP) server berbasis stdio JSON-RPC 2.0 sehingga coding agent di IDE Anda dapat menjalankan audit keamanan secara otonom tanpa meninggalkan terminal/editor.
              </p>

              <div className="space-y-3">
                <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider">
                  Konfigurasi Cursor / Claude Desktop (claude_desktop_config.json)
                </h3>
                <div className="relative">
                  <pre className="font-mono text-xs bg-surface p-4 border border-rule overflow-x-auto text-ink leading-relaxed">
{`{
  "mcpServers": {
    "shipsafe": {
      "command": "npx",
      "args": ["-y", "@lankdev/shipsafe-mcp"]
    }
  }
}`}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          {
                            mcpServers: {
                              shipsafe: { command: 'npx', args: ['-y', '@lankdev/shipsafe-mcp'] },
                            },
                          },
                          null,
                          2
                        ),
                        'mcp-json'
                      )
                    }
                    className="absolute top-3 right-3 p-1.5 border border-rule bg-canvas hover:bg-surface text-ink text-xs font-mono flex items-center gap-1 cursor-pointer"
                    title="Copy MCP JSON"
                  >
                    {copiedSnippet === 'mcp-json' ? <Check className="size-3" /> : <Copy className="size-3" />}
                    <span>{copiedSnippet === 'mcp-json' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="border border-rule bg-surface p-5 space-y-3">
                <h3 className="font-bold text-ink text-xs uppercase font-mono tracking-wider">
                  4 Tools Yang Disediakan MCP:
                </h3>
                <ul className="list-disc list-inside text-xs space-y-2 pl-2 font-mono">
                  <li><code>audit_codebase</code>: Memindai folder proyek lokal dan mengembalikan daftar temuan terstruktur.</li>
                  <li><code>get_threat_matrix</code>: Mengambil status kepatuhan terhadap 10 vektor ancaman.</li>
                  <li><code>get_remediation_prompt</code>: Menghasilkan prompt perbaikan spesifik untuk temuan tertentu.</li>
                  <li><code>verify_fix</code>: Memverifikasi apakah commit perbaikan berhasil menutup celah tanpa memicu regresi.</li>
                </ul>
              </div>
            </section>
          )}

          {/* PAGE 6: TERMINAL CLI */}
          {activeSection === 'cli' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <Terminal className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>6. Terminal CLI &amp; Pre-Commit Git Hook (@lankdev/shipsafe-cli)</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Penggunaan ShipSafe CLI di terminal lokal dan CI/CD pipeline.
                </p>
              </div>

              <p>
                Gunakan ShipSafe CLI di terminal lokal Anda atau dalam pipeline CI/CD GitHub Actions / GitLab CI:
              </p>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <p className="text-ink-3 mb-1.5"># 1. Jalankan audit instan tanpa install:</p>
                  <div className="relative">
                    <pre className="bg-surface p-3.5 border border-rule text-ink">npx @lankdev/shipsafe-cli scan .</pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('npx @lankdev/shipsafe-cli scan .', 'cli-run')}
                      className="absolute top-2.5 right-2.5 p-1 border border-rule bg-canvas text-xs text-ink cursor-pointer"
                    >
                      {copiedSnippet === 'cli-run' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-ink-3 mb-1.5"># 2. Login menggunakan CLI Token (Paket Pro / Enterprise):</p>
                  <div className="relative">
                    <pre className="bg-surface p-3.5 border border-rule text-ink">shipsafe login --token=&lt;YOUR_CLI_TOKEN&gt;</pre>
                  </div>
                </div>

                <div>
                  <p className="text-ink-3 mb-1.5"># 3. Format output SARIF 2.1.0 untuk GitHub Code Scanning:</p>
                  <div className="relative">
                    <pre className="bg-surface p-3.5 border border-rule text-ink">npx @lankdev/shipsafe-cli scan . --format=sarif &gt; results.sarif</pre>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* PAGE 7: TROUBLESHOOTING */}
          {activeSection === 'troubleshoot' && (
            <section className="space-y-6">
              <div className="border-b border-rule pb-3">
                <h2 className="text-2xl font-bold text-ink flex items-center gap-2.5">
                  <HelpCircle className="size-6 text-ink shrink-0" strokeWidth={1.5} />
                  <span>7. Panduan Troubleshooting &amp; Error Resolution</span>
                </h2>
                <p className="text-xs text-ink-3 font-mono mt-1">
                  Kamus kode error HTTP, limit ukuran payload, dan saluran emergency support.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border border-rule bg-surface p-4 space-y-1.5">
                  <p className="font-bold text-ink text-xs font-mono">[ERROR] LIMIT_FILE_SIZE / payload_too_large (HTTP 413)</p>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    <strong>Penyebab:</strong> Ukuran arsip ZIP melebihi batas paket (Free: 10 MB, Pro: 50 MB, Enterprise: 100 MB).<br />
                    <strong>Solusi:</strong> Pastikan folder dependensi seperti <code>node_modules/</code>, <code>.git/</code>, atau <code>dist/</code> tidak ikut ter-zip. Scanner akan otomatis memindai kode sumber proyek Anda.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-4 space-y-1.5">
                  <p className="font-bold text-ink text-xs font-mono">[ERROR] quota_exceeded (HTTP 403)</p>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    <strong>Penyebab:</strong> Kuota audit bulanan akun Anda telah habis (Free: 3x/bulan).<br />
                    <strong>Solusi:</strong> Kuota akan di-reset otomatis setiap bulan kalender (Lazy Monthly Reset). Anda juga dapat melakukan upgrade ke paket Pro (50x/bulan seharga Rp 79.000) melalui tombol Upgrade di sidebar atau tab Pricing.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-4 space-y-1.5">
                  <p className="font-bold text-ink text-xs font-mono">[ERROR] CLI_PRO_REQUIRED (HTTP 403)</p>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    <strong>Penyebab:</strong> Akses Terminal CLI dan integrasi CI/CD memerlukan paket Pro atau Enterprise.<br />
                    <strong>Solusi:</strong> Dapatkan token CLI dengan meng-upgrade akun ke Pro atau Enterprise, lalu jalankan <code>shipsafe login --token=...</code>.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-4 space-y-1.5">
                  <p className="font-bold text-ink text-xs font-mono">[ERROR] captcha_failed (HTTP 403)</p>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    <strong>Penyebab:</strong> Token verifikasi Cloudflare Turnstile kedaluwarsa atau IP proxy berubah.<br />
                    <strong>Solusi:</strong> Muat ulang halaman audit atau tunggu widget Turnstile memverifikasi ulang browser Anda secara otomatis.
                  </p>
                </div>

                <div className="border border-rule bg-surface p-4 space-y-1.5">
                  <p className="font-bold text-ink text-xs font-mono">Bantuan Langsung / Emergency Support</p>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Jika mengalami kendala teknis atau masalah integrasi, hubungi langsung lead security engineer ShipSafe melalui WhatsApp resmi: <a href="https://wa.me/6282124153732" target="_blank" rel="noreferrer" className="text-ink underline font-mono">082124153732</a>.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Pagination Navigation: Prev & Next Page */}
          <div className="pt-8 border-t border-rule flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono">
            {prevSection ? (
              <button
                type="button"
                onClick={() => handleSelectPage(prevSection.id)}
                className="flex flex-col items-start p-3.5 border border-rule bg-surface hover:bg-raised text-left transition-colors cursor-pointer group rounded-none"
              >
                <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1">
                  &larr; Bab Sebelumnya
                </span>
                <span className="text-xs font-semibold text-ink group-hover:underline mt-0.5">
                  {prevSection.title}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextSection ? (
              <button
                type="button"
                onClick={() => handleSelectPage(nextSection.id)}
                className="flex flex-col items-end p-3.5 border border-rule bg-surface hover:bg-raised text-right transition-colors cursor-pointer group rounded-none ml-auto"
              >
                <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1">
                  Bab Selanjutnya &rarr;
                </span>
                <span className="text-xs font-semibold text-ink group-hover:underline mt-0.5">
                  {nextSection.title}
                </span>
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
