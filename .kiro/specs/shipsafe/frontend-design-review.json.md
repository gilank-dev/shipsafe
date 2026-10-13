# Review Desain Frontend ShipSafe

Dokumen yang direview: `.kiro/specs/shipsafe/frontend-design.md` (1.438 baris; Direktif, Keputusan Terkunci, Bagian A, Bagian B1 sampai B29)
Dibandingkan dengan: `shipsafe-spec.md` (sumber kebenaran), `.kiro/specs/shipsafe/requirements.md` (16 requirement EARS)
Tanggal review: 13 Oktober 2026

## Verdict: CHANGES_REQUESTED

Hitungan mekanis: HIGH = 2, MEDIUM = 13, NIT = 8. HIGH + MEDIUM lebih dari 0, jadi verdict CHANGES_REQUESTED.

Ringkasan satu paragraf: desain ini kuat di logika murni (resolvePrompt, graf, stale, runner), rencana CSP bernonce, dan sistem token. Versi paket, peer dependency, dan angka kontras yang saya cek ulang ternyata akurat. Masalah utamanya ada di luar kualitas teknis: dua sumber kebenaran yang dipakai desain ini tidak lagi ada di workspace dalam bentuk yang dirujuk. `shipsafe-spec.md` yang ada sekarang adalah v3 (upload ZIP + Full Report) dan tidak memuat satu pun dari 13 widget. Selain itu sudah ada proyek `frontend/` berbasis Vite yang mengikuti spec v3 itu. Implementer tidak bisa menyalin teks widget EXACT dan tidak tahu harus membangun di jalur yang mana tanpa menebak.

---

## Cara review ini dikerjakan

Saya membaca ketiga dokumen penuh, lalu memverifikasi klaim yang bisa dicek secara lokal:

- Isi `shipsafe-spec.md` dibaca langsung dan dicari dengan grep (judul widget dan teks prompt).
- Seluruh versi di tabel B2 dicek dengan `npm view` (versi `latest`, keberadaan versi pin, peer dependency).
- Paket `fflate@0.8.3`, `@phosphor-icons/react@2.1.10`, dan `react-markdown@10.1.0` diunduh (`npm pack`) dan diperiksa kodenya, lalu direktori sementara dihapus.
- Angka kontras di B18 dihitung ulang dengan rumus WCAG 2.x.
- Struktur workspace diperiksa (ada `frontend/` dengan scaffold sendiri).

Tidak ada akses jaringan ke dokumentasi Next.js, OpenRouter, Vercel, atau OWASP, jadi klaim yang bersumber dari sana saya catat sebagai belum terverifikasi (lihat bagian akhir).

---

## Temuan

### HIGH

**F-01 (HIGH). Teks widget EXACT tidak ada di repo; `shipsafe-spec.md` yang sekarang adalah v3 dan bertentangan dengan desain**

Lokasi: `frontend-design.md` paragraf pembuka ("Sumber kebenaran teks widget ... Section 3-5 dan 10"), Direktif butir 4, B7 (validator konformitas), A9 AC2, A9 AC47; `shipsafe-spec.md` seluruh berkas.

Masalah, dengan bukti:

1. `shipsafe-spec.md` (diubah 21:02, setelah `requirements.md` 19:59 dan sebelum desain 21:04) berjudul "v3 — 3-Tier: Vercel + VPS + Supabase". Section 5 di berkas itu adalah "Full Report", bukan daftar widget. Grep untuk `Secrets Audit`, `Release Security Officer`, dan `Fix-It Checklist` di berkas itu menghasilkan nol kecocokan. Tidak ada tabel Section 3 (13 widget), tabel Section 4 (matriks `@`), heading `### Widget N: "Judul" (Tipe)`, ataupun Section 10 (QA) yang dirujuk desain.
2. Teks Disclaimer Widget 1, enam placeholder, lima prompt generation, dan prompt persona RSO tidak ada di berkas mana pun di workspace. Grep untuk `RELEASE SECURITY SIGN-OFF` dan `Priority 1: Do Now` hanya cocok di `requirements.md` (merujuk ke spec) dan `frontend/DESIGN.md`. Desain sendiri tidak menyalin teks itu. Jadi poin (a) permintaan review tidak bisa dipenuhi: judul, urutan, dan tipe 13 widget memang cocok dengan `requirements.md` R2.2 dan R2.3 (saya cocokkan satu per satu), tetapi placeholder dan prompt tidak bisa diverifikasi dan tidak bisa diimplementasikan "EXACT".
3. Validator B7 mem-parse `docs/shipsafe-spec.md` dengan pola yang tidak ada di spec saat ini. Karena `prebuild` memanggil `verify:widgets`, build akan gagal sejak M2, atau implementer akan "memperbaiki" validator sampai lulus secara tautologis.
4. Spec v3 secara eksplisit menghapus fitur yang dibangun desain: Bagian 1 menyebut "Chatbot sign-off & verdict Go/No-Go tetap dihapus (dari v2)". Padahal desain menyatakan "bila dokumen ini bertentangan dengan dua sumber itu soal judul, urutan, placeholder, prompt ... sumber itu yang menang". Dengan aturan itu, spec yang sekarang memenangkan penghapusan Verdict dan RSO.
5. Spec v3 juga bertentangan dengan Keputusan Terkunci: login opsional vs KT-1 wajib GitHub; backend VPS + Supabase + Claude via Vercel AI SDK vs KT-2 OpenRouter di Vercel tanpa worker; batas dekompresi 100 MB dan 5.000 entri vs KT-5 50 MB dan 1.500 file. Desain hanya menyatakan KT "dari user" tanpa merekonsiliasi dengan dokumen yang dia sebut sebagai sumber kebenaran.

Perbaikan konkret (pilih satu, butuh konfirmasi user karena menyangkut mana spec yang berlaku):

- Opsi A (disarankan): pulihkan versi spec yang memuat 13 widget (v2 yang dirujuk `requirements.md`) sebagai `.kiro/specs/shipsafe/widgets-source.md` (jangan menimpa spec v3), lalu ubah paragraf pembuka desain menjadi:

```
Sumber kebenaran teks widget: `.kiro/specs/shipsafe/widgets-source.md` (Section 3, 4, 5, 10 dari spec v2).
`shipsafe-spec.md` v3 TIDAK mendefinisikan widget dan tidak dipakai untuk teks widget.
Urutan prioritas: Keputusan Terkunci > requirements.md > widgets-source.md > shipsafe-spec.md v3.
```

  Ubah target validator B7 ke `docs/widgets-source.md` (salinan baca-saja) dan tambahkan tabel "Bagian spec v3 yang digantikan KT-1, KT-2, KT-5" agar tidak ada konflik tersembunyi.
- Opsi B: tempelkan 13 teks verbatim (Disclaimer, 6 placeholder, 6 prompt) ke lampiran desain dalam blok kode, dan jadikan lampiran itu target validator.
- Opsi C: jika yang berlaku memang v3 (tanpa Verdict dan RSO), maka desain ini harus ditulis ulang. Tanyakan ke user sebelum memilih.

---

**F-02 (HIGH). Dua jalur frontend yang saling bertentangan sudah ada di workspace; desain tidak menyebut `frontend/`**

Lokasi: `frontend-design.md` B1, B2 (tabel versi), B3 (struktur folder), B27 M0; workspace `frontend/` (`DESIGN.md`, `package.json`, `vite.config.ts`, `src/`, `node_modules/`, `.agents/plan.md`).

Masalah, dengan bukti:

- `frontend/package.json` adalah proyek Vite 7.3.7 + React 19.3.0 + TypeScript 5.9.3 + Vitest 4.1.11 + jsdom + Testing Library + vitest-axe, font Archivo dan IBM Plex Mono. `frontend/DESIGN.md` (91 KB, diubah 21:00) menyebut dirinya "approved-for-implementation draft", "single-screen", "There is no landing page", dan merujuk `../shipsafe-spec.md` (v3). `frontend/src` sudah berisi `api/mock/sample-zips.ts`, `config/agents.ts`, `parse-report.ts` (alur ZIP + report + prompt per agen) dan scaffold dibuat 21:10 sampai 21:26.
- Desain yang direview menetapkan Next.js 16.4.0 (App Router), TypeScript 6.0.3, Geist, landing page, wizard, GitHub login, dan "tanpa uji komponen". Struktur B3 menaruh `src/` di root repo `shipsafe/`, bukan di `frontend/`.
- Desain tidak menyebut `frontend/` sama sekali (grep `DESIGN.md|frontend/` nol hasil). M0 "Scaffold Next 16.4.0" akan bertabrakan dengan atau menduplikasi proyek yang sudah ada, dan "stack terkunci" di dua dokumen saling berbeda.

Perbaikan konkret: tambahkan bagian "Hubungan dengan `frontend/`" di B3 yang memutuskan salah satu, lalu perbarui B27 M0:

```
Keputusan: `frontend/` (Vite, spec v3) DIGANTIKAN oleh aplikasi Next di `apps/web`.   // atau sebaliknya
Tindakan M0: pindahkan `frontend/` ke `archive/frontend-vite/` (tanpa menghapus), tandai `frontend/DESIGN.md` SUPERSEDED.
Path aplikasi baru: <tentukan: apps/web | web | root>. Semua path di B3 relatif terhadap path ini.
```

Penghapusan atau pemindahan `frontend/` perlu konfirmasi user karena menyangkut pekerjaan yang sudah ada.

---

### MEDIUM

**F-03 (MEDIUM). Fitur dari KT-1 sampai KT-8 tidak punya requirement atau acceptance criteria yang terlacak**

Lokasi: `requirements.md` (hanya R1 sampai R16), `frontend-design.md` A5 (pemetaan R1-R16), A9 (AC1-AC48), A11, B20 sampai B23.

Masalah: login GitHub, persetujuan privasi, wizard upload dan batas KT-5, job dan kuota, perbaikan otomatis, diff, revert, re-scan, unduh dan penghapusan, sign-off pasca purge adalah mayoritas isi Bagian B, tetapi tidak ada di `requirements.md` dan tidak punya AC bernomor. A9 hanya memuat AC untuk widget dan mode manual (AC1 sampai AC48; hanya AC39 sampai AC45 menyentuh sedikit mock). Tanpa itu, tasks dan QA tidak bisa mengukur "selesai", dan pelaporan "amandemen Bagian A" tidak menutup celah ini. Ini juga bentuk perluasan scope yang belum tertulis sebagai requirement.

Perbaikan konkret: tambahkan di `requirements.md` (atau di Bagian A desain) requirement baru, minimal:

```
R17 Autentikasi GitHub (mock): WHEN pengguna belum login THE ShipSafe SHALL mengarahkan ke /masuk; scope hanya read:user; state denied/error/expired ditangani.
R18 Persetujuan privasi: THE wizard SHALL memblokir upload sampai kotak persetujuan dicentang dan mengirim noticeVersion.
R19 Batas upload (KT-5): THE validator SHALL menolak/melewati sesuai tabel B14 baris 1-12 dengan pesan actionable.
R20 Job dan kuota: 1 job aktif, 5 per hari, timeout 10 menit, tombol batalkan.
R21 Perbaikan otomatis: file asli tidak diubah; setiap Change membawa tag CIA, OWASP, severity, whySafeNow; Zod menolak yang tidak lengkap.
R22 Revert dan re-scan: revert per perubahan/file; re-scan menampilkan resolved/remaining/introduced.
R23 Unduh dan retensi: tiket 15 menit sekali pakai; purge setelah ack; TTL 24 jam; Hapus sekarang.
R24 Sign-off setelah purge (DK-5): RSO memakai salinan memori; empty state setelah refresh.
```

Lalu petakan tiap R17 sampai R24 ke AC di A9 (AC49 dan seterusnya).

---

**F-04 (MEDIUM). Urutan audit yang hilang: R8.2 dan AC21 meminta berurutan, B9 memutuskan paralel tanpa amandemen**

Lokasi: `requirements.md` R8.2; `frontend-design.md` A9 AC21, B9 ("Perencana", paragraf "mode run" dan "regenerate"), tabel Amandemen Bagian A.

Masalah: R8.2 berbunyi "run each missing audit in Dependency_Graph order (Secrets Audit, then Dependency Audit, then HTTP Hardening Audit)". AC21 mengulang "berurutan Secrets, Dependency, HTTP". B9 menjalankan ketiganya paralel dalam satu layer dan menyebutnya "interpretasi". Aturan prioritas desain (B > A) menyelesaikannya di atas kertas, tetapi menyimpang dari requirement tanpa persetujuan user dan tanpa baris di tabel Amandemen.

Perbaikan konkret (pilih satu dan tulis eksplisit):

- Patuhi requirement: untuk `mode: "run"` dan `"regenerate"`, bentuk layer sekuensial `[[Secrets Audit],[Dependency Audit],[HTTP Hardening Audit],[Go/No-Go Verdict]]` bagi audit yang hilang; paralel hanya untuk `mode: "full"` (R13.1).
- Atau tambahkan baris Amandemen: `| R8.2 / AC21 | DIUBAH (menunggu persetujuan user) | audit hilang dijalankan paralel dalam satu layer; verdict dikirim setelah ketiganya done |` dan ubah AC21 agar tidak memuat kata "berurutan".

---

**F-05 (MEDIUM). `promptDigest` dan `templateVersion` tidak terdefinisi, dan interaksinya dengan envelope acak membuat deteksi drift ambigu**

Lokasi: B13 (`GenerateRequest`, paragraf "Server me-resolve dan membungkus sendiri"), DK-4, B13 "Payload layer" butir 2.

Masalah: `promptDigest` disebut "SHA-256 hex dari teks ter-resolve klien", tetapi server membungkus nilai dengan penanda acak per request (`<<<UNTRUSTED:{id}:...>>>`). Tidak jelas teks mana yang di-hash di server, apakah dengan atau tanpa pembungkus, dan apa tindakan bila beda. `templateVersion` disebut "hash dari prompt" tanpa algoritma, urutan, atau cakupan (satu widget atau semua). Dua implementasi berbeda pasti menghasilkan 422 palsu.

Perbaikan konkret, tambahkan ke B13:

```ts
// Digest dihitung di KLIEN dan SERVER dari teks TANPA pembungkus (opts.render tidak dipakai):
const text = resolvePrompt(template, titles, getValue).text;      // single pass, nilai kosong -> [NOT PROVIDED]
const promptDigest = sha256Hex(new TextEncoder().encode(text));   // crypto.subtle.digest("SHA-256", ...)
// templateVersion per widget = sha256Hex(utf8(template)).slice(0, 16)  (template = isi prompt exact, LF)
// Server: digest beda -> 422 { code: "DIGEST_MISMATCH" } (kelas klien: invalid_request, recoverable, "Muat ulang halaman").
// Envelope acak ditambahkan SETELAH digest diverifikasi.
```

---

**F-06 (MEDIUM). Klaim DK-4 "endpoint bukan proxy LLM bebas" lemah, terutama untuk scope job dan RSO setelah purge**

Lokasi: DK-4, B13 (`GenerateRequest.inputs`, `ChatRequest.persona.inputs`, `messages`), DK-5, B22.

Masalah: `inputs` dan `messages` adalah teks bebas dari klien (sampai `MAX_TOTAL_CHARS`). Di mode manual, penyerang yang login tetap dapat memasukkan prompt apa pun lewat nilai input, dan `chat` menerima riwayat bebas. Pada scope job, DK-5 memaksa klien mengirim Verdict dan Fix-It dari memori setelah data server dihapus, sehingga system prompt persona berisi konten yang dikendalikan klien. Pembungkus acak tidak mengubah fakta ini. Desain tidak menyatakan apa yang dijamin dan apa yang tidak.

Perbaikan konkret, tambahkan ke B13 dan B21 (T4):

```
Scope job SEBELUM purge: server mengabaikan `inputs`/`persona.inputs` dari klien dan membaca Verdict/Fix-It/Project Profile dari penyimpanan job milik pemilik.
Scope job SETELAH purge dan scope manual: `inputs` dianggap tak tepercaya; server menerapkan envelope, batas ukuran, rate limit per user, dan kuota token harian. Endpoint TIDAK dijanjikan "bukan proxy"; klaim di DK-4 diganti "dibatasi oleh template, ukuran, kuota, dan rate limit".
```

---

**F-07 (MEDIUM). Kontrak `LlmClient` belum lengkap untuk diimplementasikan tanpa menebak**

Lokasi: B13 (`LlmClient`, aliran NDJSON, tabel kelas error), B9 (runner scope job).

Masalah:

1. `GenerateResult`, `ChatResult`, dan tipe `LlmError` dipakai di signature tetapi tidak didefinisikan.
2. Event `done` membawa `finishReason`, tetapi tidak ada aturan bila nilainya bukan `stop` (mis. `length` atau `content_filter`). Audit yang terpotong akan tampil sebagai hasil lengkap, padahal D17 dan R5.5 menuntut tidak ada output sebagian.
3. `GenerateRequest.scope` menyertakan `{ kind: "job" }`, sedangkan B9 menyatakan orkestrasi LLM scope job dilakukan server lewat `JobsClient` dan klien hanya polling. Tidak jelas kapan `generate` dengan scope job dipanggil.
4. Bentuk body error non-2xx (JSON `{ code, message, retryAfter }`?) tidak didefinisikan; tabel hanya memetakan status HTTP.

Perbaikan konkret, tambahkan:

```ts
type LlmEvent =
  | { type: "start"; requestId: string; model: string }
  | { type: "delta"; text: string }
  | { type: "done"; finishReason: "stop" | "length" | "content_filter" | "error"; usage: { promptTokens: number; completionTokens: number }; model: string }
  | { type: "error"; code: string; message: string; retryable: boolean };
type GenerateResult = { text: string; requestId: string; model: string; usage: { promptTokens: number; completionTokens: number } };
type ChatResult = GenerateResult;
class LlmError extends Error { constructor(readonly kind: LlmErrorKind, readonly retryable: boolean, readonly requestId?: string, readonly retryAfterSec?: number) { super(kind); } }
// Aturan: done.finishReason !== "stop" -> LlmError("invalid_response"), draft dibuang.
// Body error non-2xx: { code: string; message: string; retryAfterSec?: number } divalidasi Zod; bila gagal parse -> kelas dari status HTTP.
// scope "job" pada GenerateRequest dihapus dari union; scope job hanya lewat JobsClient. Chat scope job tetap ada (RSO).
```

---

**F-08 (MEDIUM). Giliran pembuka RSO tersembunyi: pesan pemicu tidak didefinisikan sebagai bagian riwayat**

Lokasi: D12, B20 (Sign-off RSO: "mengirim giliran pembuka tersembunyi 'Begin'"), A9 AC34, AC35, B13 `ChatRequest.messages`.

Masalah: pesan pemicu "Begin" muncul hanya sekali di B20 sebagai string literal, tanpa lokasi config dan tanpa aturan apakah ia tetap ada di `messages` pada giliran berikutnya. R11.7 mewajibkan riwayat penuh dikirim. Jika pemicu dibuang dari tampilan dan dari payload, riwayat berikutnya diawali pesan `assistant`, yang ditolak banyak API chat (pesan pertama harus `user`). Selain itu pemicu bukan teks UI sehingga tidak boleh berada di `strings.ts` (AC45).

Perbaikan konkret:

```ts
// config/app.ts
export const RSO_OPENER_TRIGGER = "Begin";                       // dikirim ke LLM, bukan teks UI
interface ChatMessage { role: "user" | "assistant"; content: string; hidden?: boolean }
// hidden=true: tidak dirender di transcript, TETAP disertakan di setiap ChatRequest.messages.
// Reset (R11.9) menghapus pemicu bersama riwayat; pembukaan berikutnya menambahkan pemicu baru.
```

---

**F-09 (MEDIUM). `VerdictHero` bergantung pada format output yang tidak ada di dokumen manapun; aturan parse Confidence, scorecard, dan alasan unreadable tidak ditentukan**

Lokasi: B11 (`VerdictHero`, `VerdictParse.reason`), A9 AC26 sampai AC28.

Masalah: `countBlockers` punya algoritma jelas, tetapi "Confidence (Low/Medium/High dari output, bila dapat di-parse)" dan "scorecard ... angka 0-10 dari tabel" tidak punya aturan (nama field, regex, nama kolom). Format output verdict ada di prompt Widget 11 yang tidak tersedia (F-01), jadi implementer harus menebak. Empat nilai `reason` (`no-line`, `unknown-value`, `multiple-values`, `wrong-format`) juga tidak punya aturan klasifikasi.

Perbaikan konkret (setelah F-01 selesai, rujuk teks prompt exact):

```ts
const CONFIDENCE_RE = /^\*{0,2}Confidence\*{0,2}\s*:\s*\**(Low|Medium|High)\**\s*$/im;   // sesuaikan dengan OUTPUT FORMAT prompt W11
// Scorecard: hanya ditampilkan bila tabel punya header persis "| Area | Score |" (sesuaikan) dan skor integer 0-10; selain itu disembunyikan.
// reason: baris pertama tak kosong tidak mengandung "VERDICT" -> no-line; mengandung >=2 nilai valid -> multiple-values;
//         mengandung "VERDICT:" + nilai di luar tiga -> unknown-value; sisanya -> wrong-format.
```

---

**F-10 (MEDIUM). Karakter emoji 🚦 rusak (mojibake) di dua tempat desain, bertentangan dengan B11**

Lokasi: `frontend-design.md` baris 116 (X5) dan baris 230 (AC26): tertulis `# ðŸš¦ VERDICT: ...`. B11 menulis 🚦 dengan benar.

Masalah: AC26 adalah kriteria uji; test atau parser yang diturunkan dari X5 atau AC26 akan mencocokkan urutan karakter yang salah. Ini bukan soal tampilan, melainkan teks yang menjadi acuan format verdict.

Perbaikan konkret: ganti keduanya menjadi `# 🚦 VERDICT: <GO|CONDITIONAL GO|NO-GO>` (U+1F6A6) dan tambahkan tes bahwa berkas desain dan `src/config/prompts/*` tidak mengandung `ðŸ` (deteksi mojibake) di `verify:widgets`.

---

**F-11 (MEDIUM). Cakupan pemindai secret terlalu sempit untuk klaim DK-3; ada pelolosan lewat filter placeholder**

Lokasi: DK-3 ("sehingga secret tidak pernah meninggalkan perangkat"), B17 (tabel pola dan `isPlaceholder`), B14 langkah 4.

Masalah:

1. DK-3 menyatakan redaksi di browser membuat secret tidak pernah meninggalkan perangkat. Registri B17 hanya 9 pola berprefiks (Stripe, AWS, GitHub, PEM, Google, Slack, JWT, URI berkredensial, Bearer). Tidak ada pola untuk berkas `.env` (`DB_PASSWORD=...`, `SECRET_KEY=...`), penugasan `password = "..."` di kode, atau kunci berentropi tinggi tanpa prefiks. Ini justru kasus paling umum di proyek vibe-coded. Klaim DK-3 terlalu kuat; R-PRIV-1 mengakui keterbatasan tetapi DK-3 tidak.
2. `isPlaceholder` bersifat substring tidak peka huruf: nilai nyata yang kebetulan memuat `example`, `dummy`, `changeme`, atau `xxxx` lolos total, dan penyerang yang menaruh kata itu di dalam secret dapat menghindari redaksi.

Perbaikan konkret:

```ts
// Tambah pola (patterns/env-assignment.ts), hanya untuk berkas .env*, *.properties, docker-compose*, dan baris KEY=VALUE:
//   /^\s*(?:export\s+)?[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY)[A-Z0-9_]*\s*[=:]\s*["']?([^\s"']{8,})/im
// Tambah pola generic-assignment dengan minEntropy >= 3.5 untuk nilai >= 20 karakter.
// isPlaceholder: cocokkan NILAI UTUH (anchor ^...$) untuk kata sihir; substring hanya untuk REDACTED dan deretan satu karakter berulang >= 8.
// DK-3 diubah menjadi: "Redaksi di browser mengurangi, tidak menjamin, secret yang terkirim. Pola terbatas pada jenis yang dikenali."
```

---

**F-12 (MEDIUM). Sampel secret palsu akan gagal pada `verify-bundle-secrets` dan pada push protection GitHub, atau tidak memicu dialog**

Lokasi: B3 (`config/samples.ts`), B17, B21 (`scripts/verify-bundle-secrets.mjs`, AC41), A9 AC10, B20 menu "Isi contoh".

Masalah: contoh "proyek rentan" harus berisi string yang memicu pemindai agar dialog (AC10) dan demo redaksi dapat diperlihatkan. String itu akan: (1) ikut ke `.next/static`, sehingga `verify-bundle-secrets`, yang memindai dengan registri pola yang sama, gagal; (2) memicu GitHub secret scanning push protection saat fase push nanti. Sebaliknya, jika disamarkan dengan placeholder (`REDACTED`, `XXXX`), `isPlaceholder` membuatnya tidak terdeteksi dan demo tidak memicu dialog. Desain tidak menjelaskan jalan keluarnya ("selalu palsu/placeholder" saja).

Perbaikan konkret:

```ts
// samples.ts: rakit saat runtime dari potongan agar tidak ada literal utuh di sumber maupun bundle
const fakeStripe = ["sk", "_live_", "SHIPSAFE", "DEMO", "0123456789abcdef"].join("");   // lolos regex stripe-secret, tidak berpola placeholder
// verify-bundle-secrets: tidak mengecualikan apa pun; karena literal tidak utuh, tidak ada kecocokan.
// Tambah tes: scanSecrets(sample.vulnerable.codeArtifacts) menghasilkan >= 1 hit; scan literal sumber samples.ts menghasilkan 0 hit.
```

---

**F-13 (MEDIUM). API asinkron `fflate` membuat Worker dari Blob URL; CSP `worker-src 'self'` memblokirnya**

Lokasi: B2 (fflate 0.8.3), B14 ("Web Worker dan CSP", "Mode folder"), B21 (CSP produksi, `worker-src 'self'`, tanpa `blob:`).

Masalah (terverifikasi): di paket `fflate@0.8.3`, `esm/browser.js` membuat worker dengan `new Worker(URL.createObjectURL(new Blob([...])))`. README fflate menyatakan setiap fungsi memiliki versi async yang berjalan di Worker terpisah. Jika implementer memanggil `zip`, `unzip`, `AsyncZipDeflate`, atau `compress` di dalam Web Worker buatan sendiri (atau di thread utama), pembuatan worker bersarang diblokir CSP `worker-src 'self'`, dan dokumen B14 juga menyatakan tidak ada fallback ke thread utama. Hasilnya upload folder dan redaksi-repack gagal hanya di produksi atau saat CSP aktif.

Perbaikan konkret: tambahkan aturan ke B14 dan B21, dan pasang di lint:

```
Di dalam zip.worker.ts hanya boleh memakai API SINKRON fflate: zipSync, unzipSync, strToU8, strFromU8, class Zip/ZipDeflate (streaming sinkron), Unzip/UnzipInflate.
DILARANG: zip, unzip, compress, decompress, AsyncZipDeflate, AsyncUnzipInflate (membuat Worker dari Blob URL -> dilarang CSP worker-src 'self').
```

```js
// eslint.config.mjs
{ files: ["src/**/*.ts", "src/**/*.tsx"],
  rules: { "no-restricted-syntax": ["error", { selector: "ImportSpecifier[imported.name=/^(zip|unzip|compress|decompress|AsyncZipDeflate|AsyncUnzipInflate|AsyncDeflate|AsyncInflate)$/][parent.source.value='fflate']", message: "Gunakan API sinkron fflate di worker sendiri (CSP worker-src 'self')." }] } }
```

---

**F-14 (MEDIUM). `@phosphor-icons/react` di Server Component harus diimpor dari `/ssr`; desain memakai ikon Phosphor di Server Component tanpa aturan ini**

Lokasi: B2 (ikon), B3 (landing, privasi, batasan, layout sebagai Server Component; "Batas komponen server dan klien"), B11 (ikon `SealCheck`, `SealWarning`, `Prohibit`, `SealQuestion`), B16 (`GithubLogo`), B26 AS-11.

Masalah (terverifikasi): README `@phosphor-icons/react@2.1.10` menyatakan, dalam lingkungan yang tidak mengizinkan Context API (contoh yang disebut: Next.js Server Component), ikon harus diimpor dari submodul `/ssr`. Paket mengekspor `./ssr`. Desain menyatakan landing, privasi, batasan, dan kerangka halaman adalah Server Component, tetapi tidak menyebut jalur impor. Impor default yang memakai Context akan error saat build di Server Component. Nama ikon (`SealCheck`, `Prohibit`, `GithubLogo`, dan lainnya) sendiri valid di versi ini (ada di `dist/ssr`).

Perbaikan konkret: tambahkan aturan impor:

```
Server Component (tanpa "use client"): import { SealCheck } from "@phosphor-icons/react/ssr";
Client Component ("use client"):      import { SealCheck } from "@phosphor-icons/react";
Satu pembungkus `components/ui/Icon.tsx` per konteks (IconServer, IconClient) agar `weight` konsisten (AS-11).
Lint: no-restricted-imports untuk "@phosphor-icons/react" pada berkas tanpa "use client" tidak mudah dideteksi; gantinya, uji build (M0) memuat satu ikon di layout Server Component.
```

---

**F-15 (MEDIUM). Banner disclaimer sticky: offset sticky, Focus Not Obscured, dan cara mengukur tinggi tanpa atribut `style` tidak ditentukan**

Lokasi: tabel Amandemen Bagian A (baris "Req R1.3"), B20 (halaman job: "kolom samping lengket (sticky di bawah banner)"), B24 (Fokus), B18 (z-index), B21 (CSP: larangan prop `style`), R-UX-1.

Masalah:

1. Teks Disclaimer panjang (satu paragraf berbahasa Inggris, tidak boleh dipotong atau dilipat, R1.2). Pada 320 px lebar tingginya besar. Satu-satunya mitigasi adalah mode statis untuk tinggi viewport kurang dari 520 px. Tidak ada anggaran tinggi untuk lebar sempit dengan tinggi normal (mis. 390x844).
2. WCAG 2.2 SC 2.4.11 Focus Not Obscured (AA): elemen yang fokus tidak boleh sepenuhnya tertutup konten sticky. Desain tidak menyebut `scroll-padding-top`/`scroll-margin-top`. Banner lengket plus sidebar lengket akan menutup elemen yang difokus lewat keyboard.
3. Sidebar lengket "di bawah banner" butuh tinggi banner, yang berubah menurut lebar. CSP melarang atribut `style`, dan desain tidak menyatakan cara mengukur tinggi tersebut.

Perbaikan konkret, tambahkan ke B18 dan B24:

```css
:root { --banner-h: 7.5rem; }                       /* token per breakpoint, bukan hasil ukur */
@media (min-width: 48rem) { :root { --banner-h: 5rem; } }
@media (min-width: 80rem) { :root { --banner-h: 3.5rem; } }
html { scroll-padding-top: calc(var(--banner-h) + 1rem); }
.sticky-below-banner { position: sticky; top: calc(var(--banner-h) + 1rem); }
```

Jika tinggi harus diukur: `new ResizeObserver(([e]) => document.documentElement.style.setProperty("--banner-h", `${e.contentRect.height}px`))` (CSSOM `element.style.setProperty` diizinkan CSP; atribut `style` di markup tidak). Tambahkan uji manual: tab melalui semua kontrol pada 320, 390, dan 1440 px dan pastikan fokus tidak tertutup banner; anggaran tinggi banner maksimum 30% tinggi viewport pada 390x844, dan jika dilampaui perilaku statis berlaku (bukan hanya tinggi < 520 px).

---

### NIT

**F-16 (NIT). Implementasi `urlTransform` tidak dituliskan**

Lokasi: B10 (baris "Link"), B2 butir 10.

Desain menyatakan "hanya `https:`, `http:`, `mailto:`; lainnya string kosong; link relatif ditolak" tetapi tidak menunjukkan cara mengurai skema. Menimpa `urlTransform` bawaan (`defaultUrlTransform`) adalah titik rawan XSS. Saran:

```ts
export function safeUrlTransform(value: string): string {
  try { const u = new URL(value); return ["https:", "http:", "mailto:"].includes(u.protocol) ? u.href : ""; }
  catch { return ""; }   // relatif atau tidak valid -> ditolak
}
```

Tes B25 sudah mencantumkan `javascript:`, `data:`, `vbscript:`; tambahkan `JaVa\tScRiPt:` dan `//evil.com`.

**F-17 (NIT). CSP mode http dan dev: host storage, asal URL unduhan, dan `upgrade-insecure-requests`**

Lokasi: B21 (header "nilai final"), B13 (UploadClient, tiket unduh).

Tabel diberi label "nilai final", tetapi `connect-src` mode http hanya menyebut "host storage unggahan" tanpa nilai, dan asal URL tiket unduh (fetch ke URL bertanda tangan) tidak disebut. `upgrade-insecure-requests` pada `next start` di `http://localhost` dapat merusak pemuatan aset di Safari, padahal `verify-headers.mjs` berjalan terhadap `next start`. Saran: tandai nilai mode http sebagai "ditetapkan di fase backend" dan tambahkan `upgrade-insecure-requests` hanya bila `NODE_ENV === "production"` dan host bukan `localhost`.

**F-18 (NIT). Pola `OPENROUTER` di `verify-bundle-secrets.mjs` ambigu terhadap huruf besar-kecil**

Lokasi: B21 (Hardening kode dan repo).

Teks privasi di `strings.ts` menyebut "OpenRouter". Jika pencarian tidak peka huruf, build gagal oleh teks sah. Saran: gunakan pola eksak `OPENROUTER_API_KEY`, `sk-or-v1-`, `GITHUB_CLIENT_SECRET` (peka huruf).

**F-19 (NIT). Parameter "belum final" untuk nilai yang sudah ditetapkan requirement; debounce tidak konsisten**

Lokasi: B6 (`MAX_FIELD_CHARS`, `COMMIT_DEBOUNCE_MS`), A3 D2, `requirements.md` R3.2 dan R3.5.

R3.5 menetapkan 50.000 karakter, tetapi B6 menandainya "belum final". A3 D2 menyebut debounce 500 ms, B6 menyebut 400 ms (R3.2 menuntut penyimpanan dalam 500 ms setelah ketikan terakhir, sehingga 400 ms menyisakan hanya 100 ms untuk render). Saran: tandai `MAX_FIELD_CHARS` "terkunci (R3.5)", dan tuliskan di D2 "debounce 400 ms (batas R3.2: 500 ms)".

**F-20 (NIT). `eslint-plugin-react` tidak dipin padahal aturan B21 membutuhkannya; belum ada `.gitattributes`**

Lokasi: B2 (tabel devDependencies), B21 (aturan `react/no-danger`, `react/forbid-dom-props`), B7 (LF).

`eslint-config-next@16.4.0` memang membawa `eslint-plugin-react ^7.37.0` sebagai dependency (terverifikasi), tetapi config sendiri mengimpor plugin itu secara langsung; bergantung pada hoisting transitif rapuh. Tambahkan pin eksplisit di devDependencies. Karena target dev adalah Windows dan prompt wajib LF, tambahkan `.gitattributes` berisi `* text=auto eol=lf` dan `src/config/prompts/** text eol=lf` di M0.

**F-21 (NIT). Bukti penggunaan Context7 tidak tercatat per pustaka**

Lokasi: B2 ("Metode"), permintaan user "baca context7".

B2 menyebut Context7 dipakai, tetapi hanya react-markdown yang disebut sumbernya (ID `remarkjs/react-markdown`). Untuk Next, Tailwind, dan Zustand disebut dokumentasi resmi langsung. Saran: tambahkan kolom "Sumber" di tabel B2 berisi ID pustaka Context7 dan topik yang ditanyakan (mis. `/vercel/next.js` topik "content security policy nonce"), agar jejak riset dapat diulang.

**F-22 (NIT). Parser verdict: `\s` lebih longgar dari toleransi yang dinyatakan**

Lokasi: B11 (Parser).

Teks menyatakan toleransi hanya spasi atau tab, tetapi regex memakai `\s` yang juga mencocokkan NBSP (U+00A0) dan spasi Unicode lain. Saran: `^[ \t]*#[ \t]+🚦\uFE0F?[ \t]+VERDICT[ \t]*:[ \t]*(GO|CONDITIONAL GO|NO-GO)[ \t]*\r?$` setelah BOM dibuang.

**F-23 (NIT). `AuthGate` di klien menyebabkan kedipan konten dan CLS pada halaman yang di-SSR**

Lokasi: B4 (paragraf setelah tabel route).

Semua halaman `(app)` dirender dinamis di server, tetapi sesi mock hanya terbaca di klien (`sessionStorage`). Tanpa skeleton berukuran tetap, konten terlihat sebentar lalu hilang atau berpindah. Saran: `AuthGate` merender skeleton ukuran tetap dan `aria-busy="true"` sampai sesi terbaca; pada mode http cukup dijaga `proxy.ts` (cookie) sehingga tidak ada kedipan.

---

## Verified Assumptions

Diverifikasi langsung terhadap sumber (bukan klaim dokumen):

1. Judul, urutan 1 sampai 13, dan tipe widget di B7 cocok persis dengan `requirements.md` R2.2 dan R2.3 (termasuk karakter `/` pada "Go/No-Go Verdict"; 1 Static_Text, 6 Input, 5 Generation, 1 Chatbot). Region sesuai R12.
2. Daftar `@` mention per widget di A6 cocok dengan R5.1, R6.1, R7.1, R8.1, R10.1, R11.1. Contoh stale di B9 konsisten dengan graf itu (Tech Stack memengaruhi tiga audit, Verdict, Fix-It; HTTP and Server Config hanya HTTP Hardening Audit, Verdict, Fix-It).
3. Semua versi pin di B2 ada di npm, dan klaim `latest` benar: next 16.4.0, react 19.3.0, zustand 5.0.15, react-markdown 10.1.0, remark-gfm 4.0.1, zod 4.6.7, fflate 0.8.3, @phosphor-icons/react 2.1.10, tailwindcss dan @tailwindcss/postcss 4.3.3, postcss 8.5.30, vitest 5.0.4, vite 8.3.4, prettier 3.9.10, globals 17.13.0, eslint-config-next 16.4.0, typescript-eslint 8.71.2, eslint-plugin-jsx-a11y 6.10.2. Versi yang sengaja ditahan juga ada dan alasannya benar: `typescript@6.0.3` (latest 7.0.2), `eslint@9.39.5` dan `@eslint/js@9.39.5` (latest eslint 10.12.0), `@types/node@24.19.2` (latest 26.6.5, sesuai Node 24), `@types/react` dan `@types/react-dom` 19.3.0.
4. Klaim peer: `typescript-eslint@8.71.2` mensyaratkan `typescript >=4.8.4 <6.1.0` dan menerima `eslint ^10`; `eslint-plugin-jsx-a11y@6.10.2` hanya sampai `eslint ^9`; `eslint-config-next@16.4.0` membawa `eslint-plugin-react-hooks ^7.1.0`, `typescript-eslint ^8.56.0`, `eslint-plugin-jsx-a11y ^6.10.0`, peer `eslint >=9.0.0`. Alasan menahan TypeScript dan ESLint valid.
5. `react-markdown@10.1.0` memiliki prop `skipHtml`, `allowedElements`, `disallowedElements`, `unwrapDisallowed`, `urlTransform` dan ekspor `defaultUrlTransform` (dari `lib/index.d.ts`). Rencana MarkdownView B10 dapat diimplementasikan dengan API itu tanpa `rehype-raw`.
6. Semua angka kontras di B18 yang saya hitung ulang cocok: GO terang 5,78 dan gelap 8,67; CONDITIONAL GO terang 6,48; NO-GO terang 6,21; severity critical terang 7,9; info terang 7,44; tepi kontrol terang 3,54 dan gelap 3,39; teks redup terang 6,98; aksen pada surface 6,36.
7. Nama ikon Phosphor yang dipakai (`SealCheck`, `SealWarning`, `Prohibit`, `SealQuestion`, `GithubLogo`) ada di `@phosphor-icons/react@2.1.10`.
8. Batasan fase (g): Direktif butir 5, A11, dan penutup B27 konsisten menyatakan fase ini tanpa `git init`, commit, push, atau deploy Vercel, dan backend (OAuth, upload token, jobs, OpenRouter) ditunda. M0 sampai M13 tidak memuat langkah git atau deploy. Tidak ada API key atau panggilan jaringan ke OpenRouter atau GitHub dari klien; satu-satunya env publik adalah `NEXT_PUBLIC_SHIPSAFE_MODE`.
9. Skill yang diwajibkan Direktif (`design-taste-frontend-2`, `ckm-design`, `ckm-design-system`, `ckm-ui-styling`) memang tersedia di lingkungan.
10. Rencana keamanan (b) secara internal konsisten: tanpa `dangerouslySetInnerHTML`, tanpa `rehype-raw`, `skipHtml`, `urlTransform` ketat, CSP bernonce tanpa `unsafe-inline` dan `unsafe-eval` di produksi, `frame-ancestors 'none'`, header statis lengkap, cookie tema non-sensitif, `__Host-` untuk cookie sesi masa depan, pemindaian bundel untuk secret. Tombol login berupa `<a href>` GET sehingga `form-action 'self'` tidak memutus redirect OAuth.

## Unverified / Wrong Assumptions

Salah atau tidak dapat dipenuhi berdasarkan sumber:

1. **Salah:** "Sumber kebenaran teks widget: `shipsafe-spec.md` Section 3-5 dan 10". Berkas itu sekarang v3 dan tidak memuat satupun (F-01).
2. **Salah:** validator B7 dapat mem-parse `docs/shipsafe-spec.md` dengan heading `### Widget N: ...` dan label `**Konten:**`, `**Placeholder:**`, `**Prompt:**`, `**Persona / initial prompt:**` (F-01).
3. **Salah/hilang konteks:** desain mengasumsikan tidak ada pekerjaan frontend lain; `frontend/` Vite sudah ada dan berisi implementasi serta `DESIGN.md` sendiri (F-02).
4. **Salah:** "`fflate` dalam Web Worker" aman di bawah `worker-src 'self'` bila API async dipakai; API async membuat Worker dari Blob URL (F-13).
5. **Salah:** ikon Phosphor dapat dipakai di Server Component tanpa impor khusus (F-14).
6. **Salah:** DK-4 mencegah endpoint dipakai sebagai proxy LLM bebas dan DK-3 memastikan secret tidak pernah meninggalkan perangkat (F-06, F-11).

Tidak dapat saya verifikasi di sini (tidak ada akses jaringan ke dokumentasi; dicatat sebagai asumsi yang harus dikonfirmasi implementer pada M0 dan M1):

1. Perilaku Next.js 16.4.0: konvensi `src/proxy.ts` menggantikan `middleware`, alur nonce `x-nonce`, kewajiban rendering dinamis, ketidakcocokan PPR dengan CSP bernonce, dan ketersediaan `Geist`/`Geist_Mono` di `next/font/google`.
2. Isi OpenRouter (`models` failover, `provider.data_collection`, `zdr`), katalog model (`anthropic/claude-sonnet-5.5`, `openai/gpt-6.1-sol`, `google/gemini-3.8-flash`) dan harganya, batas Vercel (payload 4,5 MB, durasi 300 sampai 800 detik), serta nama kategori OWASP Top 10:2025. Desain sendiri menandai model sebagai rekomendasi yang harus diverifikasi ulang di fase backend.
3. Bahwa Keputusan Terkunci KT-1 sampai KT-8 memang berasal dari user. Pesan user yang tersedia bagi saya hanya empat pesan awal; tidak ada yang memuat KT. Saya memperlakukannya sebagai terkunci karena desain menyatakannya, tetapi tidak bisa mengonfirmasi (terkait F-01, F-03).
4. Penggunaan Context7 untuk Next, Tailwind, dan Zustand (F-21).
5. Pernyataan di B7 bahwa semua prompt di spec tidak mengandung backtick, `${`, atau backslash (tidak ada teks prompt untuk diperiksa).

## Urutan perbaikan yang disarankan

1. F-01 dan F-02 dulu (butuh keputusan user), karena menentukan sumber teks widget dan lokasi proyek.
2. F-03 sampai F-08 (kontrak dan traceability) sebelum tasks disusun.
3. F-09 sampai F-15 sebelum M2, M8, dan M1 dikerjakan.
4. NIT boleh dikerjakan bersamaan dengan perbaikan di atas.
