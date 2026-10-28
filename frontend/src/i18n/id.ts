import type { LandingContentSchema } from './types'

export const idContent: LandingContentSchema = {
  nav: {
    brand: {
      name: 'ShipSafe',
      desk: '// MEJA BEA CUKAI KODE',
      versionBadge: 'v2.4-STABIL',
      monogram: 'SS',
    },
    links: {
      console: 'Konsol Web',
      howItWorks: 'Cara Kerja',
      mcp: 'Server MCP',
      cli: 'Terminal CLI',
      threatMatrix: '10 Vektor Ancaman',
      comparison: 'Komparasi',
      limitations: 'Batasan',
      pricing: 'Biaya',
      faq: 'Tanya Jawab',
      documentation: 'Dokumentasi',
    },
    language: {
      toggleAria: 'Ganti bahasa ke English',
      currentLabel: 'Bahasa Indonesia',
      switchLabel: 'Ganti ke EN',
      en: 'EN',
      id: 'ID',
    },
    auth: {
      signIn: 'Masuk / Daftar',
      signOut: 'Keluar',
      guestClearance: 'Akses Tamu',
    },
    cta: {
      launchConsole: 'Buka Konsol',
      launchConsoleAria: 'Buka konsol audit keamanan',
    },
  },

  hero: {
    eyebrow: {
      tag: '// PENGAWAS PRA-DEPLOYMENT',
      separator: '|',
      subtitle: 'Palang Pintu Keamanan Otomatis Berbasis AST & Regex',
    },
    headline: {
      prefix: 'Meja Pemeriksaan Bea Cukai untuk',
      highlight: 'Aplikasi Web Vibe-Coding.',
      suffix: 'Periksa menyeluruh sebelum rilis ke publik.',
    },
    reassurance:
      'Dirancang khusus untuk pengembang yang membangun sistem secepat ide mengalir. Tangkap kebocoran service key, rute API tanpa autentikasi, celah RLS, dan paparan prompt injection dalam 3 detik sebelum kode menyentuh server produksi.',
    cta: {
      primary: 'Buka Konsol Web',
      shortcut: '⌘K',
      secondary: 'Jelajahi Ekosistem',
      dropHint: 'atau seret berkas ZIP / tempel URL repositori',
    },
    cliBar: {
      command: 'npx @lankdev/shipsafe-cli scan .',
      copyLabel: 'Salin',
      copiedLabel: 'Tersalin',
      hint: 'Berjalan langsung di RAM lokal tanpa instalasi atau konfigurasi rumit.',
    },
  },

  pillars: {
    header: {
      eyebrow: 'TIGA JALUR INSPEKSI',
      title: 'Dirancang Mengamankan Alur Kerja di Setiap Tahapan',
      subtitle:
        'Lakukan audit instan di peramban, pasang palang pintu otomatis di terminal lokal, atau biarkan agen AI menambal celah secara mandiri melalui MCP.',
    },
    console: {
      tag: 'PILLAR 01 // KONSOL WEB',
      title: 'Konsol Web Audit',
      description:
        'Unggah arsip berkas ZIP atau impor repositori GitHub publik. Dapatkan analisis AST seketika, kalkulasi risiko terukur, dan stempel putusan resmi bea cukai langsung di peramban Anda.',
      action: 'Buka Konsol Web ->',
    },
    mcp: {
      tag: 'PILLAR 02 // MCP',
      title: 'Jembatan Agen AI Otonom',
      description:
        'Hubungkan ShipSafe langsung ke Cursor, Claude Desktop, Windsurf, OpenCode, dan Hermes melalui protokol standar stdio JSON-RPC 2.0. Biarkan agen AI mengaudit dan menambal celah secara mandiri.',
      action: 'Pelajari Konfigurasi MCP ->',
    },
    cli: {
      tag: 'PILLAR 03 // CLI',
      title: 'Palang Pintu Pre-Commit & CI',
      description:
        'Audit kode secara lokal dalam hitungan milidetik atau pasang git hook 1-klik yang memblokir commit berbahaya. Menghasilkan telemetri SARIF 2.1.0 standar OASIS untuk integrasi native GitHub Code Scanning.',
      action: 'Pelajari Perintah CLI ->',
    },
  },

  telemetry: {
    window: {
      title: 'telemetri // repo-vibe-saas.bundle.zip (4.8MB)',
      statusActive: 'PEMINDAIAN AKTIF',
      dotsAria: 'Kontrol jendela terminal',
    },
    tabs: {
      report: 'Laporan Inspeksi',
      prompt: 'Prompt Remedi Agen 1-Klik',
    },
    reportLogs: {
      parsing: '[00:01.04] Parsing AST 42 berkas sumber... BERHASIL (0.8s)',
      finding1:
        '[00:01.88] Vektor 01: Pindai Rahasia - [GAGAL] Stripe live key terekspos di src/config/stripe.ts:8',
      finding2:
        '[00:02.12] Vektor 04: Kontrol Akses Terbuka - [GAGAL] Endpoint publik tanpa proteksi sesi RLS di app/api/invoices/[id]/route.ts:19',
      finding3:
        '[00:02.89] Vektor 07: Paparan Prompt Injection - [PERINGATAN] Query mentah tanpa sanitasi masuk ke OpenAI prompt di lib/agent.ts:42',
      summary: 'Hasil: 2 temuan kritis, 1 peringatan terdeteksi',
      statusBadge: 'Perlu Tindakan Segera',
    },
    promptSnippet: {
      badge: 'PROMPT PERBAIKAN KHUSUS UNTUK CLAUDE CODE / CURSOR',
      targetAgent: 'Claude Code & Cursor',
      content: `Perbaiki kerentanan kritis F-001 pada \`src/config/stripe.ts\` (baris 8):
1. Hapus secret key Stripe live \`sk_live_****\` yang tertulis langsung di kode.
2. Muat secret secara aman melalui environment variable \`process.env.STRIPE_SECRET_KEY\`.
3. Tambahkan validasi null check dan lemparkan ConfigurationError deskriptif jika env tidak terisi.
4. Verifikasi perbaikan dengan menjalankan perintah: \`npm run test && npm run build\`.`,
      copyAria: 'Salin prompt remedi yang disesuaikan',
    },
  },

  howItWorks: {
    header: {
      tag: 'PROTOKOL 3 DETIK',
      title: 'Nol Konfigurasi. Izin Rilis Instan Tanpa Hambatan.',
      subtitle:
        'Perangkat keamanan lawas membutuhkan berjam-jam pengaturan berkas YAML yang melelahkan sebelum memeriksa satu baris pun. ShipSafe memangkas friksi tersebut dalam tiga langkah sederhana.',
    },
    steps: {
      step1: {
        number: '01',
        title: 'Unggah Kode atau Berikan Tautan Repositori',
        subtitle: 'Bebas Konfigurasi YAML Rumit',
        description:
          'Tidak perlu menulis ratusan baris berkas YAML atau memasang background daemon. Cukup seret arsip ZIP lokal (hingga 10MB), tempel tautan repositori GitHub publik, atau jalankan perintah `npx @lankdev/shipsafe-cli scan .` langsung di terminal.',
      },
      step2: {
        number: '02',
        title: 'Pemindaian Statis AST Kilat dalam 3 Detik',
        subtitle: 'Ruang Eksekusi Memori Terisolasi',
        description:
          'Kode Anda diparsing menjadi Abstract Syntax Tree (AST) dan dipindai terhadap 10 vektor ancaman dalam sandbox sementara. Kode diperlakukan murni sebagai data statis, tidak pernah dieksekusi, dan langsung dihapus tuntas dari memori.',
      },
      step3: {
        number: '03',
        title: 'Stempel Kelayakan & Prompt Perbaikan 1-Klik',
        subtitle: 'Solusi Siap Eksekusi Agen AI',
        description:
          'Dapatkan stempel putusan resmi (Approved for Ship atau Quarantined). Jika ditemukan celah, ShipSafe menyusun prompt perbaikan presisi per baris kode yang siap dieksekusi oleh Cursor, Claude Code, atau Windsurf.',
      },
    },
  },

  comparison: {
    header: {
      tag: 'KOMPARASI ARSITEKTUR',
      title: 'Mengapa ShipSafe Paling Tepat untuk Era Vibe Coding',
      subtitle:
        'Bandingkan ShipSafe dengan scanner korporat warisan masa lalu dan linter kode konvensional saat membangun produk dengan akselerasi kecerdasan buatan.',
    },
    columns: {
      metric: 'Kapabilitas / Metrik',
      shipsafe: 'ShipSafe Customs Desk',
      legacySast: 'SAST Korporat Lawas (SonarQube, Snyk)',
      linters: 'Linter Kode Biasa (ESLint, Prettier)',
    },
    rows: [
      {
        metric: 'Waktu Pengaturan & Konfigurasi',
        shipsafe: '3 detik, instan tanpa konfigurasi',
        legacySast: '2 hingga 5 hari pengaturan pipeline YAML yang rumit',
        linters: '15 hingga 30 menit pengaturan aturan format',
      },
      {
        metric: 'Prompt Remedi untuk Agen AI',
        shipsafe: 'Prompt 1-klik khusus untuk Cursor, Claude, Copilot, Windsurf',
        legacySast: 'Jargon kode CVE abstrak dan PDF audit puluhan halaman',
        linters: 'Pesan error sintaks dasar tanpa konteks mitigasi keamanan',
      },
      {
        metric: 'Spesialisasi Ancaman AI Vibe-Coding',
        shipsafe: 'Fokus tajam pada kebocoran API key, celah RLS, dan prompt injection',
        legacySast: 'Fokus warisan bahasa lama (Java/C++) dengan ratusan false positive',
        linters: 'Terbatas pada format estetika teks dan validitas sintaks',
      },
      {
        metric: 'Privasi Data & Retensi Kode Sumber',
        shipsafe: 'Zero-Persistence: diproses di RAM sementara, dihapus seketika',
        legacySast: 'Kode sumber diindeks dan disimpan permanen di server penyedia',
        linters: 'Hanya berjalan secara lokal di komputer pengembang',
      },
      {
        metric: 'Kecepatan Pemindaian & Umpan Balik',
        shipsafe: '2 hingga 4 detik dari awal hingga selesai',
        legacySast: '5 hingga 25 menit di dalam antrean CI/CD',
        linters: 'Di bawah satu detik, namun tanpa penalaran arsitektur keamanan',
      },
      {
        metric: 'Penegakan Gatekeeper Pre-Commit & CI',
        shipsafe: 'Pemasang git hook otomatis dengan exit code deterministik & SARIF 2.1.0',
        legacySast: 'Membutuhkan webhook server eksternal dan agen berlisensi mahal',
        linters: 'Exit code dasar tanpa pemeringkatan risiko keamanan nyata',
      },
    ],
  },

  threatMatrix: {
    header: {
      tag: 'CAKUPAN LENGKAP 10 VEKTOR',
      title: '10 Vektor Ancaman Kritis yang Diaudit',
      subtitle:
        'ShipSafe memeriksa seluruh permukaan kode yang dihasilkan AI terhadap 10 celah keamanan paling berisiko tinggi dalam arsitektur web modern:',
    },
    vectors: [
      {
        id: '01',
        name: 'SQL Injection',
        techDescription:
          'Konkatenasi string SQL mentah dan interpolasi template literal tanpa sanitasi pada query basis data dan ORM.',
        consequence:
          'Pengambilalihan penuh basis data, pencurian data pelanggan massal, dan kebocoran informasi sensitif perusahaan.',
      },
      {
        id: '02',
        name: 'Cross-Site Scripting (XSS)',
        techDescription:
          'Injeksi HTML tanpa sanitasi melalui innerHTML, dangerouslySetInnerHTML, atau pemanggilan document.write.',
        consequence:
          'Pembajakan token sesi pengguna, pengambilalihan akun secara ilegal, dan eksekusi skrip jahat pada browser korban.',
      },
      {
        id: '03',
        name: 'DDoS & ReDoS',
        techDescription:
          'Endpoint publik tanpa middleware rate limiter serta penggunaan ekspresi reguler (regex) rentan bencana backtracking eksponensial.',
        consequence:
          'Server tumbang (downtime), lonjakan tagihan komputasi cloud tak terkendali, dan lumpuhnya layanan akibat kuota API habis.',
      },
      {
        id: '04',
        name: 'Brute Force & Timing Attacks',
        techDescription:
          'Pembandingan string password atau token rahasia secara langsung tanpa proteksi pembanding waktu konstan (crypto.timingSafeEqual).',
        consequence:
          'Penebakan kunci rahasia melalui analisis waktu respon (side-channel) serta pembobolan login via serangan brute force otomatis.',
      },
      {
        id: '05',
        name: 'Malware & Upload Web Shells',
        techDescription:
          'Unggahan berkas tanpa validasi tipe MIME dan ekstensi yang memungkinkan penanaman skrip web shell (PHP/Node/JSP).',
        consequence:
          'Pengambilalihan server secara menyeluruh, penanaman backdoor permanen, dan eksploitasi hak akses root oleh penyerang.',
      },
      {
        id: '06',
        name: 'MitM & Broken TLS',
        techDescription:
          'Konfigurasi TLS cacat seperti rejectUnauthorized: false, pengiriman kredensial HTTP tanpa enkripsi, dan ketiadaan flag cookie Secure/HttpOnly.',
        consequence:
          'Penyadapan lalu lintas jaringan (MitM), pencurian token autentikasi di jaringan Wi-Fi publik, dan pemalsuan identitas sesi.',
      },
      {
        id: '07',
        name: 'Phishing & Open Redirect',
        techDescription:
          'Pengalihan tautan URL eksternal tanpa validasi (open redirect) serta absennya header pelindung clickjacking (X-Frame-Options/CSP).',
        consequence:
          'Domain resmi Anda disalahgunakan sebagai sarana penipuan phising dan manipulasi antarmuka untuk mencuri kredensial pengguna.',
      },
      {
        id: '08',
        name: 'Defacement Risks',
        techDescription:
          'Endpoint administrasi atau rute CMS publik yang terbuka tanpa otorisasi, memungkinkan modifikasi template atau berkas webroot statis.',
        consequence:
          'Perusakan visual halaman situs utama (deface), kehancuran reputasi bisnis secara instan, dan runtuhnya kepercayaan pelanggan.',
      },
      {
        id: '09',
        name: 'LFI / RFI & SSRF',
        techDescription:
          'Path traversal pada pemanggilan sistem berkas lokal (fs.readFile) dan permintaan HTTP keluar tanpa filter batasan (fetch(req.query.url)).',
        consequence:
          'Pembacaan berkas rahasia server (.env, /etc/passwd) serta eksfiltrasi kredensial internal layanan metadata cloud instance (169.254.169.254).',
      },
      {
        id: '10',
        name: 'Zero-Day Dynamic Code Execution',
        techDescription:
          'Pola eksekusi kode dinamis berbahaya (eval(), new Function(), execSync(), serta celah prototype pollution).',
        consequence:
          'Eksekusi kode jarak jauh (Remote Code Execution / RCE) seketika yang memberikan kendali eksekusi instruksi arbitrary pada runtime server.',
      },
    ],
    guarantees: {
      sandbox: {
        title: 'Pemrosesan Sandbox RAM Sementara',
        description:
          'Kode sumber diekstrak secara ketat ke dalam direktori sandbox RAM sementara yang terisolasi. Begitu analisis tuntas, direktori tersebut langsung dihapus seketika dari sistem. Kode Anda tidak pernah disimpan permanen, tidak pernah diindeks, dan tidak pernah digunakan untuk melatih model AI.',
      },
      multiAgent: {
        title: 'Pemformat Prompt Multi-Agen AI',
        description:
          'Alih-alih menyodorkan kode CVE abstrak yang membingungkan, ShipSafe merangkum prompt perbaikan per baris kode khusus untuk Cursor, Claude Code, GitHub Copilot, dan Windsurf yang siap tempel dan diverifikasi otomatis.',
      },
    },
  },

  limitations: {
    header: {
      title: 'BATASAN OPERASIONAL SHIPSAFE',
      subtitle:
        'Kami percaya pada transparansi teknis tanpa gimik pemasaran keamanan yang berlebihan. Mohon perhatikan batasan arsitektur kami secara seksama:',
    },
    items: {
      archiveLimit: {
        title: 'Batas Maksimal Berkas 10 MB',
        description:
          'Dirancang khusus untuk aplikasi web modern, SPA frontend, dan microservice API. Tidak ditujukan untuk memproses repositori monolitik berukuran gigabyte atau aset biner berat seperti dataset dan rekaman video.',
      },
      staticOnly: {
        title: 'Analisis Statis AST Murni (SAST)',
        description:
          'ShipSafe memindai struktur sintaks AST dan konfigurasi secara statis. Layanan ini tidak menjalankan container aplikasi, tidak melakukan fuzzing jaringan aktif, ataupun memeriksa memori heap saat runtime.',
      },
      notPentest: {
        title: 'Bukan Pengganti Uji Penetrasi Manual',
        description:
          'Mengeliminasi 95% kelalaian keamanan umum saat coding dengan AI (kunci API bocor, ketiadaan proteksi RLS/CORS, rute terbuka), namun tidak menggantikan audit sertifikasi kepatuhan manual (SOC2 atau ISO 27001) oleh pentester manusia profesional.',
      },
    },
  },

  pricing: {
    header: {
      tag: 'SKEMA BIAYA PENGEMBANG',
      title: 'Biaya Transparan Tanpa Komplikasi',
      subtitle:
        'Mulai audit keamanan secara gratis. Tingkatkan paket saat Anda membutuhkan kolaborasi tim, prioritas antrean, dan sertifikat kepatuhan resmi.',
    },
    tiers: {
      community: {
        name: 'Komunitas',
        price: '$0',
        period: 'Gratis Selamanya',
        description:
          'Untuk pengembang independen, mahasiswa, dan vibe coder yang menguji prototipe proyek secara mandiri.',
        features: [
          '3 kali pemindaian konsol web per hari',
          'Audit tanpa batas melalui Terminal CLI lokal',
          'Mencakup seluruh 10 vektor ancaman kritis',
          'Prompt remedi 1-klik siap pakai untuk agen AI',
          'Batas ukuran unggahan arsip hingga 10MB',
          'Dukungan komunitas via GitHub & Discord',
        ],
        cta: 'Mulai Gratis Sekarang',
      },
      pro: {
        badge: 'PILIHAN UTAMA',
        name: 'Pengembang Pro',
        price: '$12',
        period: 'per bulan (Rp 120.000)',
        description:
          'Untuk indie hacker, founder rintisan, dan freelance engineer yang merilis aplikasi web komersial ke publik.',
        features: [
          'Audit konsol web & CLI tanpa batas',
          'Prioritas antrean pemrosesan kilat',
          'Riwayat laporan audit tersimpan aman di Supabase',
          'Ekspor Sertifikat Kelayakan Keamanan resmi (PDF)',
          'Integrasi penuh Model Context Protocol (MCP) untuk Cursor & Claude',
          'Dukungan prioritas langsung dari tim pengembang inti',
        ],
        cta: 'Tingkatkan ke Pro',
      },
      enterprise: {
        name: 'Organisasi & Custom',
        price: 'Kustom',
        period: 'Sesuai Kebutuhan',
        description:
          'Untuk tim rekayasa perangkat lunak, software house, dan korporat yang membutuhkan aturan kustom dan SLA terjamin.',
        features: [
          'Instalasi mandiri on-premises via Docker terisolasi',
          'Kustomisasi aturan deteksi AST & regex internal organisasi',
          'Integrasi bot Pull Request otomatis di repositori privat',
          'Manajemen kursi anggota tim dengan isolasi multi-tenant',
          'Faktur transfer bank lokal (BCA/Mandiri) & invoice perusahaan resmi',
          'Saluran koordinasi privat (WhatsApp/Slack) & jaminan SLA 99,9%',
        ],
        cta: 'Hubungi Tim Bisnis',
      },
    },
    guarantee:
      'Garansi 14 hari uang kembali untuk seluruh paket berbayar. Kebijakan Zero-Persistence berlaku penuh di semua tingkatan.',
  },

  support: {
    title: 'Butuh Aturan Audit Kustom atau Konsultasi Langsung?',
    subtitle:
      'Terhubung langsung dengan kreator dan tim inti ShipSafe. Dapatkan bantuan untuk merancang aturan regex kustom, mengonfigurasi pipeline CI/CD, atau mengaudit arsitektur sistem khusus.',
    badge: '● ADMIN AKTIF // RATA-RATA RESPON < 15 MENIT',
    whatsapp: {
      label: 'Konsultasi via WhatsApp',
      url: 'https://wa.me/6285156559384?text=Halo%20Admin%20ShipSafe%2C%20saya%20tertarik%20konsultasi%20keamanan%20proyek%20saya',
      aria: 'Buka percakapan WhatsApp dengan admin',
    },
    telegram: {
      label: 'Konsultasi via Telegram',
      url: 'https://t.me/gilankdev',
      aria: 'Buka percakapan Telegram dengan admin',
    },
  },

  faq: {
    header: {
      tag: 'DOKUMENTASI & JAWABAN',
      title: 'Pertanyaan yang Sering Diajukan',
    },
    items: [
      {
        id: 'faq-legacy-comparison',
        question: 'Apa perbedaan mendasar ShipSafe dengan alat pemindai lawas seperti Snyk atau SonarQube?',
        answer:
          'Perangkat pemindai korporat konvensional dirancang untuk siklus pengembangan monolitik yang lambat dan menuntut konfigurasi YAML yang rumit. ShipSafe diciptakan khusus untuk era vibe-coding berbasis AI: pemindaian kilat 3 detik langsung di memori RAM, fokus tajam pada celah umum hasil generasi LLM (kunci API bocor, ketiadaan RLS Supabase, dan celah prompt injection), serta hasil akhir berupa prompt remedi 1-klik yang bisa langsung dieksekusi oleh Cursor, Claude Code, atau Windsurf.',
      },
      {
        id: 'faq-privacy-retention',
        question: 'Apakah kode sumber saya diunggah, disimpan, atau dipakai untuk melatih AI?',
        answer:
          'Sama sekali tidak. ShipSafe menerapkan kebijakan Zero-Persistence yang sangat ketat. Berkas ZIP diekstrak ke dalam direktori sandbox RAM sementara yang terisolasi, dianalisis secara statis oleh engine kami, dan langsung dimusnahkan seketika proses selesai. Kode Anda tidak pernah disimpan permanen, tidak pernah diindeks, dan tidak pernah digunakan untuk melatih model kecerdasan buatan.',
      },
      {
        id: 'faq-mcp-integration',
        question: 'Bagaimana cara menghubungkan ShipSafe ke Cursor atau Claude Desktop menggunakan MCP?',
        answer:
          'ShipSafe menyediakan paket resmi Model Context Protocol (MCP) @lankdev/shipsafe-mcp yang beroperasi melalui standar stdio JSON-RPC 2.0. Anda cukup menyalin blok konfigurasi ke berkas editor Anda (.cursor/mcp.json atau claude_desktop_config.json). Setelah aktif, agen AI Anda dapat langsung menjalankan perintah audit_codebase, membaca matriks ancaman, dan memperbaiki kerentanan secara otonom.',
      },
      {
        id: 'faq-offline-airgap',
        question: 'Dapatkah ShipSafe dijalankan secara offline di komputer lokal atau lingkungan tertutup?',
        answer:
          'Ya. Dengan menjalankan CLI terminal kami (npx @lankdev/shipsafe-cli scan .), proses pemindaian direktori dan evaluasi .gitignore berjalan sepenuhnya di komputer Anda. Ketika diarahkan ke instance backend lokal atau self-hosted kami, kode Anda tidak pernah keluar dari jaringan internal, sehingga sangat aman untuk lingkungan korporat tertutup (air-gapped).',
      },
      {
        id: 'faq-false-positives',
        question: 'Bagaimana jika ada temuan yang merupakan false positive atau tidak relevan dengan proyek saya?',
        answer:
          'Setiap temuan dilengkapi dengan tingkat keyakinan objektif (Confirmed, Likely verify, atau Not enough information) serta perintah verifikasi mandiri (seperti npm audit atau pengujian curl). Jika temuan tersebut memang merupakan keputusan arsitektur yang disengaja dalam proyek Anda, Anda dapat mengabaikannya secara aman atau menyesuaikan ambang batas toleransi tanpa memutus pipeline deployment.',
      },
    ],
  },

  footer: {
    gateway: {
      title: 'GERBANG KEAMANAN SHIPSAFE',
      badge: 'SELURUH SISTEM NORMAL',
      description:
        'Palang Pintu Keamanan Pra-Deployment untuk Aplikasi Web & Proyek Vibe-Coding.',
    },
    links: {
      console: 'Buka Konsol Web ->',
      github: 'Repositori GitHub',
      docs: 'Dokumentasi',
      mcp: 'Server MCP',
      cli: 'Terminal CLI',
      privacy: 'Protokol Privasi',
      terms: 'Syarat & Ketentuan',
    },
    compliance: 'KEPATUHAN ZERO-PERSISTENCE GDPR • AKSESIBILITAS WCAG 2.1 AA • TANPA RETENSI KODE',
    copyright: `© ${new Date().getFullYear()} ShipSafe. Dikembangkan oleh LankDev & AI Agents.`,
  },
}
