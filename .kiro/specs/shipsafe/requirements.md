# Requirements Document

## Introduction

ShipSafe adalah pre-deployment security auditor berbantuan AI untuk aplikasi web modern dan proyek vibe-coded. Pengguna meng-upload satu berkas ZIP berisi codebase (maksimal 10 MB). ShipSafe mengekstrak dan memindai isi proyek secara aman, menjalankan audit keamanan berbantuan AI pada empat area (Secrets, Dependencies, HTTP & Server Hardening, Code Security), lalu menghasilkan Full Report. Setiap temuan menjelaskan apa masalahnya, di mana lokasinya, kenapa berbahaya, dan seberapa parah, disertai satu prompt remediation siap-tempel untuk coding agent pengguna (Generic, Cursor, Claude Code, GitHub Copilot, Windsurf).

Sumber kebenaran tunggal dokumen ini adalah `shipsafe-spec.md` (v3). Arsitektur terdiri dari tiga lapis:

- **Frontend** (di-deploy ke Vercel): UI upload, tampilan report dan prompt, UI autentikasi.
- **Backend** (di VPS): validasi dan ekstraksi ZIP aman, masking secret, pemanggilan LLM, penyusunan report dan prompt, verifikasi JWT.
- **Supabase**: Postgres untuk riwayat audit, Auth, dan Row Level Security.

Desain v1 (13 widget, verdict Go/No-Go, chatbot Release Security Officer, referensi `@`-mention) sudah dihapus dan tidak termasuk dalam requirements ini.

ShipSafe adalah review berbantuan AI, bukan pengganti scanner otomatis atau pentest profesional. ShipSafe tidak mengarang temuan, lokasi berkas, CVE ID, maupun nomor versi. Isi ZIP mentah tidak pernah disimpan permanen.

Catatan konteks implementasi (bukan requirement):

- Bagian 9.1 spec menyebut Next.js untuk Frontend, sementara Frontend yang sudah ada di `frontend/` memakai Vite + React + TypeScript + Tailwind v4 dan mengikuti `frontend/DESIGN.md`. Pemilihan framework Frontend adalah keputusan fase design, bukan requirement.
- `backend/src/server.ts` saat ini memakai CORS `origin: '*'`. Konfigurasi itu bertentangan dengan Requirement 18 (CORS whitelist ketat). Requirement tetap ketat; kode yang ada harus disesuaikan.
- Nilai batas yang di spec ditandai "mis." (contoh) diadopsi sebagai default yang dapat dikonfigurasi, dan ditandai demikian di setiap kriteria terkait.

## Glossary

- **ShipSafe**: Keseluruhan sistem yang dijelaskan dokumen ini, terdiri dari Frontend, Backend, dan Supabase.
- **Frontend**: Aplikasi web ShipSafe yang berjalan di browser dan di-deploy ke Vercel.
- **Backend**: Layanan API ShipSafe yang berjalan di VPS dan menjalankan seluruh pemrosesan ZIP serta pemanggilan LLM.
- **Supabase**: Layanan pihak ketiga yang menyediakan Postgres, Auth, dan Row Level Security untuk ShipSafe.
- **Supabase_Auth**: Komponen autentikasi Supabase (email/password dan/atau OAuth).
- **JWT**: JSON Web Token yang diterbitkan Supabase_Auth untuk pengguna yang login.
- **Audit_Endpoint**: Endpoint Backend `POST /api/audit` yang menerima ZIP dan mengembalikan Audit_Report.
- **Upload_Archive**: Satu berkas ZIP yang di-upload pengguna untuk diaudit.
- **Archive_Guard**: Komponen Backend yang memvalidasi dan mengekstrak Upload_Archive secara aman.
- **Sandbox_Dir**: Direktori temp ter-isolasi di disk VPS, unik per audit, tempat Upload_Archive diekstrak.
- **Zip_Slip**: Entri ZIP yang path-nya keluar dari Sandbox_Dir, misalnya mengandung `..`, path absolut, atau drive letter.
- **Zip_Bomb**: Upload_Archive yang ukuran dekompresi, rasio kompresi, jumlah entri, atau kedalaman direktorinya melampaui batas.
- **File_Selector**: Komponen Backend yang memfilter berkas noise, memprioritaskan berkas bernilai keamanan, dan menerapkan Token_Budget.
- **Skip_List**: Daftar pola berkas/direktori yang tidak dinilai, minimal: `node_modules`, `.git`, `dist`, `build`, `.next`, `vendor`, `__pycache__`, berkas biner, gambar, media, dan font.
- **Priority_File**: Berkas bernilai keamanan, minimal: source code (API routes, auth, DB, handlers), manifest dependency (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`), `.env*`, `Dockerfile`, `docker-compose.yml`, konfigurasi server (`next.config.js`, `vercel.json`, `nginx.conf`), dan konfigurasi CI/CD.
- **Token_Budget**: Batas total teks yang dikirim ke LLM dalam satu panggilan; nilainya dapat dikonfigurasi.
- **Chunk**: Potongan konteks audit yang dibentuk per area atau per berkas agar setiap panggilan LLM berada dalam Token_Budget.
- **Secret_Scanner**: Komponen Backend yang mendeteksi Secret dan menghasilkan Masked_Value.
- **Secret**: Nilai kredensial yang cocok dengan pola secret, minimal: `sk_live_`, `AKIA`, `ghp_`, `-----BEGIN PRIVATE KEY-----`, JWT, dan connection string.
- **Masked_Value**: Representasi Secret berupa 4 karakter pertama nilai asli diikuti `****`.
- **Compromised_Secret**: Secret yang tampak nyata (bukan placeholder) dan harus direkomendasikan untuk dirotasi.
- **LLM**: Layanan model bahasa besar (Claude) yang hanya dipanggil oleh Backend.
- **LLM_Input**: Prompt yang dikirim Backend ke LLM, berisi instruksi audit dan isi berkas yang sudah di-masking.
- **Artifact_Delimiter**: Penanda eksplisit yang membungkus isi setiap berkas di dalam LLM_Input.
- **Audit_Report**: Hasil audit terstruktur dengan bagian Executive Summary, Risk Scorecard, Findings, Secrets to Rotate, dan Gaps / Not Assessed.
- **Finding**: Satu temuan dalam Audit_Report.
- **Finding_ID**: Identitas Finding berformat `F-` diikuti tiga digit berurutan, misalnya `F-001`.
- **Location**: Field Finding yang menunjukkan lokasi masalah. Location berisi salah satu dari: (a) path berkas relatif terhadap root Upload_Archive yang menunjuk ke berkas yang ada di Upload_Archive, dengan nomor baris dan/atau snippet opsional; atau (b) teks "Not enough information" bila lokasi tidak dapat dipastikan.
- **CVE_ID**: Field Finding yang berisi identitas CVE berformat `CVE-YYYY-NNNN` (minimal 4 digit setelah tahun), atau "Not enough information" bila tidak dapat dipastikan.
- **Package_Version**: Field Finding yang berisi versi paket sebagaimana tertulis literal di manifest dependency atau lockfile, atau "Not enough information" bila tidak dapat dipastikan.
- **Severity**: Klasifikasi dampak Finding: Critical, High, Medium, Low, atau Info.
- **Area**: Lingkup audit Finding: Secrets, Dependencies, HTTP, atau Code.
- **Risk_Scorecard**: Tabel per Area berisi skor 0–10, status, dan perhatian utama.
- **Not_Assessed**: Daftar area, berkas, atau konteks yang tidak dapat dinilai beserta apa yang perlu disediakan pengguna.
- **Agent_Target**: Coding agent tujuan prompt remediation: Generic, Cursor, Claude Code, GitHub Copilot, atau Windsurf.
- **Remediation_Prompt**: Prompt mandiri siap-tempel untuk satu Finding, diformat sesuai Agent_Target.
- **Prompt_Generator**: Komponen Backend yang menghasilkan Remediation_Prompt untuk setiap Finding.
- **Report_View**: Tampilan Frontend yang merender Audit_Report dan Remediation_Prompt.
- **Disclaimer_Banner**: Banner peringatan di bagian atas Frontend.
- **Audit_History**: Daftar Audit_Report tersimpan milik pengguna yang login, disimpan di Supabase.
- **Anonymous_User**: Pengguna yang menjalankan audit tanpa login.
- **Authenticated_User**: Pengguna yang login melalui Supabase_Auth dan memiliki JWT valid.
- **RLS**: Row Level Security pada Postgres Supabase yang membatasi akses baris berdasarkan `user_id`.
- **Allowed_Origin_List**: Daftar domain Frontend (domain Vercel produksi dan domain pengembangan yang dikonfigurasi) yang diizinkan memanggil Backend.

## Requirements

### Requirement 1: Disclaimer

**User Story:** Sebagai pengguna, saya ingin melihat peringatan keamanan sebelum meng-upload, sehingga saya paham batasan ShipSafe dan risiko secret yang ter-upload.

#### Acceptance Criteria

1. WHEN halaman Frontend selesai dimuat, THE Frontend SHALL menampilkan Disclaimer_Banner dengan teks berikut, identik karakter demi karakter termasuk simbol peringatan di awal, tanpa pemotongan, singkatan, atau elipsis pada lebar viewport berapa pun:
   `⚠️ ShipSafe is an AI-assisted review, not a replacement for automated scanners or a professional pentest. If your ZIP contains real secrets, they are auto-masked for processing — but you should rotate any exposed credentials immediately. Always confirm findings with tools like gitleaks, trufflehog, npm audit / pip-audit / OSV-Scanner, and securityheaders.com.`
2. WHILE pengguna berada di halaman mana pun di Frontend, THE Frontend SHALL menampilkan Disclaimer_Banner sebagai blok konten pertama di bagian atas layout, yang terlihat penuh pada posisi gulir awal (paling atas) untuk lebar viewport 320 px sampai 1920 px.
3. THE Frontend SHALL menempatkan Disclaimer_Banner sebelum kontrol upload Upload_Archive, baik dalam urutan visual dari atas ke bawah maupun dalam urutan baca teknologi bantu (assistive technology).
4. THE Frontend SHALL menampilkan Disclaimer_Banner tanpa kontrol untuk menutup, menyembunyikan, atau meminimalkannya, sehingga banner tetap tampil selama sesi berlangsung dan setelah halaman dimuat ulang.
5. THE Frontend SHALL menyajikan teks Disclaimer_Banner sebagai teks yang dapat dibaca pembaca layar (screen reader), bukan sebagai gambar, dengan kontras teks terhadap latar minimal 4.5:1.

### Requirement 2: Autentikasi Opsional

**User Story:** Sebagai pengguna, saya ingin bisa mencoba audit tanpa akun dan login hanya bila ingin menyimpan riwayat, sehingga hambatan awal rendah.

#### Acceptance Criteria

1. WHEN Anonymous_User meng-upload Upload_Archive yang valid, THE ShipSafe SHALL menjalankan audit tanpa meminta login dan mengembalikan Audit_Report yang memuat kelima bagian (Executive Summary, Risk Scorecard, Findings, Secrets to Rotate, Gaps / Not Assessed) beserta Remediation_Prompt, dengan isi yang sama seperti yang diterima Authenticated_User untuk Upload_Archive yang sama.
2. WHEN Backend menyelesaikan audit untuk Anonymous_User, THE Backend SHALL tidak menyimpan Audit_Report tersebut ke Audit_History.
3. THE Frontend SHALL menyediakan aksi login, pendaftaran, dan logout melalui Supabase_Auth, dengan minimal metode email/password dan secara opsional metode OAuth yang dikonfigurasi.
4. WHILE pengguna berstatus Authenticated_User, THE Frontend SHALL menyertakan JWT pada header `Authorization: Bearer <JWT>` di setiap permintaan ke Audit_Endpoint.
5. WHEN Audit_Endpoint menerima permintaan yang memiliki header `Authorization`, THE Backend SHALL memverifikasi JWT terhadap Supabase sebelum memulai validasi atau ekstraksi Upload_Archive, dan mengambil `user_id` dari JWT yang valid.
6. WHEN Audit_Endpoint menerima permintaan tanpa header `Authorization`, THE Backend SHALL memproses audit sebagai Anonymous_User.
7. IF header `Authorization` tidak berformat `Bearer <JWT>`, atau JWT tidak valid, kedaluwarsa, atau tanda tangannya tidak cocok, THEN THE Backend SHALL menolak permintaan dengan status HTTP 401 dan pesan yang menyatakan sesi tidak valid, tanpa mengekstrak Upload_Archive, tanpa memanggil LLM, dan tanpa memproses permintaan sebagai Anonymous_User.
8. WHEN Frontend menerima respons HTTP 401 dari Audit_Endpoint, THE Frontend SHALL menghapus sesi lokal, mengubah status autentikasi yang ditampilkan menjadi anonim, dan menampilkan pesan yang meminta pengguna login ulang atau melanjutkan sebagai Anonymous_User.
9. IF Backend tidak dapat menghubungi Supabase untuk memverifikasi JWT, THEN THE Backend SHALL menolak permintaan dengan status HTTP 503 dan pesan error yang menyatakan layanan autentikasi tidak tersedia, tanpa memproses audit sebagai Anonymous_User.
10. IF login atau pendaftaran melalui Supabase_Auth gagal, THEN THE Frontend SHALL menampilkan pesan error yang menyatakan penyebab kegagalan (kredensial salah, email sudah terdaftar, atau layanan tidak tersedia), mempertahankan alamat email yang sudah diisi, dan mempertahankan status pengguna sebagai anonim.
11. THE Frontend SHALL menampilkan status autentikasi di header aplikasi: label anonim untuk Anonymous_User, atau alamat email akun untuk Authenticated_User, dan memperbarui tampilan tersebut dalam 2 detik setelah login atau logout berhasil.

### Requirement 3: Upload ZIP dan Validasi Klien

**User Story:** Sebagai pengguna, saya ingin meng-upload satu berkas ZIP dengan mudah dan langsung tahu bila berkas ditolak, sehingga saya tidak membuang waktu.

#### Acceptance Criteria

1. WHEN pengguna menjatuhkan berkas ke area drag-and-drop atau memilih berkas melalui file picker, THE Frontend SHALL menjalankan validasi klien pada kriteria 2, 3, 4, dan 7 sebelum menetapkan berkas tersebut sebagai Upload_Archive. Kedua metode input harus menghasilkan hasil validasi yang identik untuk berkas yang sama.
2. IF pengguna memilih atau menjatuhkan lebih dari satu berkas dalam satu aksi, THEN THE Frontend SHALL menolak seluruh pilihan tersebut, tidak mengirim request apa pun ke Backend, mempertahankan Upload_Archive yang sebelumnya valid (jika ada) tanpa perubahan, dan menampilkan pesan error yang menyatakan bahwa hanya satu berkas ZIP yang diterima.
3. IF berkas yang dipilih berukuran lebih dari 10 MB (10.485.760 byte), THEN THE Frontend SHALL menolak berkas tanpa mengirim request apa pun ke Backend, mempertahankan Upload_Archive yang sebelumnya valid (jika ada) tanpa perubahan, dan menampilkan pesan error yang menyebut batas 10 MB. Berkas berukuran tepat 10.485.760 byte harus diterima.
4. IF nama berkas yang dipilih tidak diakhiri ekstensi `.zip` (perbandingan tidak peka huruf besar/kecil, sehingga `.ZIP` dan `.Zip` diterima), THEN THE Frontend SHALL menolak berkas tanpa mengirim request apa pun ke Backend, mempertahankan Upload_Archive yang sebelumnya valid (jika ada) tanpa perubahan, dan menampilkan pesan error yang menyatakan bahwa hanya berkas ZIP yang diterima.
5. WHEN pengguna memulai audit dan satu atau lebih field formulir konteks opsional (deskripsi proyek, target deployment, penanganan PII/pembayaran) berisi nilai tidak kosong, THE Frontend SHALL mengirim nilai field yang terisi tersebut bersama Upload_Archive dalam request yang sama ke Audit_Endpoint, dan SHALL tidak mengirim field yang kosong atau hanya berisi spasi.
6. THE Frontend SHALL menyediakan pemilih Agent_Target dengan tepat lima pilihan (Generic, Cursor, Claude Code, GitHub Copilot, dan Windsurf), dengan Generic terpilih saat halaman pertama kali dimuat, dan SHALL mengirim Agent_Target yang terpilih bersama Upload_Archive ke Audit_Endpoint.
7. IF berkas yang dipilih berukuran 0 byte, THEN THE Frontend SHALL menolak berkas tanpa mengirim request apa pun ke Backend dan menampilkan pesan error yang menyatakan bahwa berkas kosong.
8. WHILE belum ada Upload_Archive yang lolos validasi klien, THE Frontend SHALL menonaktifkan aksi untuk memulai audit sehingga tidak ada request yang dikirim ke Audit_Endpoint.
9. IF pengguna memasukkan teks yang melebihi 2.000 karakter (nilai default yang dapat dikonfigurasi) pada field formulir konteks opsional mana pun, THEN THE Frontend SHALL mencegah input melebihi batas tersebut dan menampilkan indikator yang menyebut batas karakter field itu.

### Requirement 4: Progres Bertahap

**User Story:** Sebagai pengguna, saya ingin melihat tahap pemrosesan yang sedang berjalan, sehingga saya tahu audit masih berjalan dan tidak macet.

#### Acceptance Criteria

1. WHILE audit berjalan, THE Frontend SHALL menampilkan indikator progres dengan empat tahap berurutan: upload, scanning, auditing, report. Setiap tahap SHALL berada tepat pada satu status: menunggu, aktif, selesai, atau gagal. Pada satu waktu, paling banyak satu tahap berstatus aktif.
2. WHEN pengguna mengirim Upload_Archive ke Audit_Endpoint, THE Frontend SHALL menampilkan indikator progres dalam 1 detik. Tahap upload SHALL berstatus aktif, dan tahap scanning, auditing, serta report SHALL berstatus menunggu.
3. WHEN sebuah tahap selesai, THE Frontend SHALL menandai tahap itu selesai dan menandai tahap berikutnya sesuai urutan sebagai aktif dalam 1 detik. Tahap tidak boleh dilewati, dan tahap yang sudah selesai tidak boleh kembali ke status sebelumnya.
4. WHEN tahap report selesai, THE Frontend SHALL menandai keempat tahap sebagai selesai dan menampilkan Audit_Report di Report_View.
5. IF Backend mengembalikan error pada tahap mana pun, THEN THE Frontend SHALL menghentikan indikator progres, menandai tahap yang sedang aktif sebagai gagal, mempertahankan status selesai pada tahap-tahap sebelumnya, membiarkan tahap-tahap berikutnya berstatus menunggu, menampilkan pesan error dari Backend, dan tidak menampilkan Audit_Report parsial.
6. IF Frontend tidak menerima respons dari Backend dalam batas waktu audit (default 180 detik, dapat dikonfigurasi), atau koneksi jaringan ke Backend terputus sebelum Audit_Report diterima, THEN THE Frontend SHALL menghentikan indikator progres, menandai tahap yang sedang aktif sebagai gagal, dan menampilkan pesan error yang menyatakan audit melewati batas waktu atau koneksi terputus.
7. WHILE audit berjalan, THE Frontend SHALL menampilkan waktu yang sudah berlalu sejak audit dikirim, dalam detik, dan memperbaruinya minimal sekali per detik.
8. WHILE audit berjalan, THE Frontend SHALL menonaktifkan kontrol upload agar tidak ada audit kedua yang dikirim bersamaan dari sesi yang sama.
9. WHEN audit berakhir, baik selesai maupun gagal, THE Frontend SHALL mengaktifkan kembali kontrol upload dalam 1 detik.

### Requirement 5: Validasi Unggahan di Backend

**User Story:** Sebagai operator ShipSafe, saya ingin Backend memvalidasi setiap unggahan secara independen dari Frontend, sehingga berkas berbahaya tidak lolos meskipun validasi klien dilewati.

#### Acceptance Criteria

1. IF jumlah byte Upload_Archive yang diterima melebihi 10 MB (10.485.760 byte), THEN THE Backend SHALL menghentikan penerimaan data paling lambat saat byte ke-10.485.761 diterima, tanpa membaca sisa body, dan mengembalikan status HTTP 413 dengan pesan yang menyebut batas 10 MB.
2. IF Upload_Archive berukuran kurang dari 4 byte (termasuk 0 byte), atau 4 byte pertamanya tidak sama dengan magic bytes `PK\x03\x04`, THEN THE Archive_Guard SHALL menolak Upload_Archive dengan status HTTP 400 dan pesan bahwa berkas bukan ZIP valid, terlepas dari ekstensi nama berkas maupun MIME type yang dikirim klien.
3. IF Upload_Archive lolos pemeriksaan magic bytes tetapi central directory atau header entrinya tidak dapat diurai sebagai ZIP, THEN THE Archive_Guard SHALL menolak Upload_Archive dengan status HTTP 400 dan pesan bahwa berkas ZIP rusak.
4. IF permintaan ke Audit_Endpoint memuat nol berkas atau lebih dari satu berkas, THEN THE Backend SHALL menolak permintaan dengan status HTTP 400 dan pesan yang menyebut jumlah berkas yang diterima serta bahwa tepat satu berkas ZIP diperlukan.
5. THE Backend SHALL menjalankan pemeriksaan unggahan dengan urutan: jumlah berkas (kriteria 4), ukuran (kriteria 1), magic bytes (kriteria 2), lalu struktur ZIP (kriteria 3), dan mengembalikan hanya respons penolakan dari pemeriksaan pertama yang gagal.
6. IF salah satu pemeriksaan pada kriteria 1 sampai 4 gagal, THEN THE Backend SHALL tidak membuat Sandbox_Dir, tidak memanggil LLM, tidak menyimpan Audit_Report atau entri Audit_History, dan menghapus seluruh data unggahan yang sudah diterima sebelum respons penolakan dikirim.
7. WHEN Upload_Archive lolos seluruh pemeriksaan pada kriteria 1 sampai 4, THE Archive_Guard SHALL meneruskan Upload_Archive ke tahap ekstraksi ke Sandbox_Dir.

### Requirement 6: Ekstraksi ZIP Aman

**User Story:** Sebagai operator ShipSafe, saya ingin ekstraksi ZIP tahan terhadap serangan arsip, sehingga VPS tidak dapat disusupi atau dilumpuhkan melalui berkas yang di-upload.

#### Acceptance Criteria

1. IF sebuah entri Upload_Archive merupakan Zip_Slip (mengandung segmen `..`, path absolut, atau drive letter, atau path ter-resolve berada di luar Sandbox_Dir), THEN THE Archive_Guard SHALL menolak seluruh Upload_Archive tanpa menulis berkas apa pun di luar Sandbox_Dir, dan THE Backend SHALL mengembalikan pesan error yang menyatakan arsip mengandung path tidak aman tanpa menghasilkan Audit_Report dan tanpa memanggil LLM.
2. IF total ukuran dekompresi Upload_Archive melebihi 100 MB (default yang dapat dikonfigurasi), dihitung dari jumlah byte aktual yang dihasilkan selama dekompresi dan bukan hanya dari ukuran yang dideklarasikan di header ZIP, THEN THE Archive_Guard SHALL menghentikan ekstraksi paling lambat saat byte melampaui batas, dan THE Backend SHALL mengembalikan pesan error yang menyatakan arsip ditolak sebagai Zip_Bomb karena ukuran dekompresi melebihi batas, tanpa menghasilkan Audit_Report dan tanpa memanggil LLM.
3. IF rasio ukuran dekompresi terhadap ukuran terkompresi untuk Upload_Archive secara keseluruhan atau untuk satu entri melebihi 100:1 (default yang dapat dikonfigurasi), THEN THE Archive_Guard SHALL menghentikan ekstraksi, dan THE Backend SHALL mengembalikan pesan error yang menyatakan arsip ditolak sebagai Zip_Bomb karena rasio kompresi melebihi batas, tanpa menghasilkan Audit_Report dan tanpa memanggil LLM.
4. IF jumlah entri Upload_Archive (berkas dan direktori) melebihi 5.000 (default yang dapat dikonfigurasi), THEN THE Archive_Guard SHALL menolak Upload_Archive sebelum mengekstrak entri apa pun, dan THE Backend SHALL mengembalikan pesan error yang menyatakan jumlah entri melebihi batas, tanpa menghasilkan Audit_Report dan tanpa memanggil LLM.
5. IF kedalaman direktori sebuah entri, dihitung sebagai jumlah segmen direktori pada path entri relatif terhadap akar Upload_Archive, melebihi 32 tingkat (default yang dapat dikonfigurasi), THEN THE Archive_Guard SHALL menolak seluruh Upload_Archive, dan THE Backend SHALL mengembalikan pesan error yang menyatakan kedalaman direktori melebihi batas, tanpa menghasilkan Audit_Report dan tanpa memanggil LLM.
6. WHEN Archive_Guard menemukan entri symlink atau entri non-reguler (device, FIFO, socket), THE Archive_Guard SHALL melewati entri tersebut tanpa membuat entri itu maupun target-nya di disk, mencatat path entri ke daftar berkas yang dilewati, dan THE Backend SHALL mencantumkan setiap path yang dilewati tersebut di bagian Not_Assessed pada Audit_Report.
7. THE Archive_Guard SHALL mengekstrak Upload_Archive hanya ke Sandbox_Dir yang dibuat baru untuk setiap audit, tidak pernah dipakai ulang oleh audit lain, dan tidak berisi berkas apa pun dari audit lain pada saat ekstraksi dimulai.
8. IF pemrosesan satu audit, diukur dari diterimanya Upload_Archive oleh Audit_Endpoint hingga respons dikirim, melebihi 120 detik (default yang dapat dikonfigurasi), THEN THE Backend SHALL menghentikan pemrosesan termasuk panggilan LLM yang sedang berjalan, menghapus Sandbox_Dir, dan mengembalikan status HTTP 504 dengan pesan bahwa audit melewati batas waktu tanpa Audit_Report parsial.
9. IF Archive_Guard menolak Upload_Archive karena alasan apa pun, THEN THE Backend SHALL menghapus Sandbox_Dir beserta seluruh berkas yang telah terekstrak sebelum mengembalikan respons error, sehingga tidak ada berkas dari Upload_Archive tersebut yang tersisa di disk VPS setelah respons dikirim.
10. IF Upload_Archive tidak dapat dibaca sebagai arsip ZIP yang valid (struktur rusak, terpotong, atau entri terenkripsi dengan password), THEN THE Archive_Guard SHALL menolak Upload_Archive, dan THE Backend SHALL menghapus Sandbox_Dir serta mengembalikan pesan error yang menyatakan arsip rusak atau tidak didukung, tanpa menghasilkan Audit_Report dan tanpa memanggil LLM.
11. WHEN audit selesai dan Audit_Report telah dikirim ke pemanggil, THE Backend SHALL menghapus Sandbox_Dir beserta seluruh berkas terekstrak dan Upload_Archive mentah dari disk VPS dalam batas waktu yang ditetapkan Requirement 17.1.

### Requirement 7: Larangan Eksekusi Kode

**User Story:** Sebagai operator ShipSafe, saya ingin kode dari ZIP tidak pernah dijalankan, sehingga isi ZIP berbahaya tidak dapat mengeksekusi apa pun di VPS.

#### Acceptance Criteria

1. THE Backend SHALL memperlakukan setiap berkas hasil ekstraksi, termasuk berkas berekstensi script atau biner executable (misalnya `.sh`, `.js`, `.py`, `.exe`), hanya sebagai teks atau byte yang dibaca, dan SHALL memproses manifest dependency (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`) hanya dengan mem-parsing isinya sebagai data.
2. THE Backend SHALL menyelesaikan seluruh audit tanpa mengeksekusi, menginstal, meng-import, me-load sebagai modul, atau menjalankan berkas, script, atau dependency apa pun dari Upload_Archive, termasuk install script dan lifecycle script (misalnya `preinstall`, `postinstall`) pada manifest dependency, sehingga tidak ada proses baru yang dijalankan dengan berkas dari Sandbox_Dir sebagai program atau argumen interpreter.
3. THE Archive_Guard SHALL menulis setiap berkas hasil ekstraksi ke Sandbox_Dir tanpa bit permission executable untuk owner, group, maupun others, terlepas dari permission yang tercatat pada metadata entri di Upload_Archive.
4. IF Archive_Guard gagal menulis berkas hasil ekstraksi tanpa bit permission executable, THEN THE Backend SHALL menghentikan audit tersebut sebelum ada isi berkas yang dikirim ke LLM, menghapus Sandbox_Dir audit tersebut, dan mengembalikan respons error kepada pemanggil Audit_Endpoint yang menunjukkan bahwa ekstraksi gagal tanpa menghasilkan Audit_Report.

### Requirement 8: Seleksi Berkas dan Token Budget

**User Story:** Sebagai pengguna, saya ingin audit berfokus pada berkas yang relevan untuk keamanan, sehingga hasilnya akurat dan proses tidak terbuang pada noise.

#### Acceptance Criteria

1. WHEN File_Selector menelusuri Sandbox_Dir, THE File_Selector SHALL melewati setiap berkas atau direktori yang cocok dengan Skip_List pada kedalaman direktori mana pun, termasuk seluruh isi direktori yang dilewati, tanpa membaca isi berkas tersebut.
2. WHEN File_Selector menemukan lockfile (minimal `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`), THE File_Selector SHALL menyertakan ringkasan lockfile yang hanya berisi nama paket dan versi ter-resolve setiap paket alih-alih isi penuh lockfile.
3. IF lockfile tidak dapat diurai menjadi ringkasan nama paket dan versi, THEN THE File_Selector SHALL mengecualikan lockfile tersebut dari LLM_Input, mencatatnya di `skippedFiles` dengan alasan tidak dapat diurai, dan melanjutkan seleksi berkas lain.
4. THE File_Selector SHALL memasukkan seluruh Priority_File ke konteks audit sebelum berkas non-Priority_File mana pun, sehingga tidak ada berkas non-Priority_File yang disertakan selama masih ada Priority_File yang belum disertakan dan masih muat dalam Token_Budget atau Chunk.
5. WHEN File_Selector melewati atau mengecualikan sebuah berkas, THE File_Selector SHALL mencatat path relatif berkas tersebut terhadap Sandbox_Dir beserta tepat satu alasan (Skip_List, biner, melebihi Token_Budget, tidak dapat diurai, atau symlink/non-reguler) ke daftar `skippedFiles` pada Audit_Report.
6. IF total konteks berkas terpilih melebihi Token_Budget (nilai default dapat dikonfigurasi), THEN THE Backend SHALL membagi konteks menjadi Chunk per Area atau per berkas sehingga ukuran setiap Chunk, termasuk instruksi audit, tidak melebihi Token_Budget, mengaudit setiap Chunk, dan menggabungkan Finding dari semua Chunk ke satu Audit_Report.
7. IF satu berkas terpilih berukuran melebihi Token_Budget secara sendiri, THEN THE File_Selector SHALL mengecualikan berkas tersebut dari LLM_Input dan mencatatnya di `skippedFiles` dengan alasan melebihi Token_Budget.
8. IF panggilan LLM untuk satu Chunk gagal, hasilnya tidak dapat diurai, atau hasilnya tidak lolos validasi schema setelah normalisasi sesuai Requirement 12, dan minimal satu Chunk lain berhasil, THEN THE Backend SHALL tetap menghasilkan Audit_Report dari Finding Chunk yang berhasil, dan mencantumkan Area serta berkas dari Chunk yang gagal di Not_Assessed.
9. IF seluruh Chunk dalam satu audit gagal sebagaimana dijelaskan pada kriteria 8, THEN THE Backend SHALL mengembalikan status HTTP 502 dengan pesan error yang menyatakan report tidak dapat disusun, tanpa Audit_Report parsial dan tanpa menyimpan apa pun ke Audit_History.
10. WHEN Backend menggabungkan Finding dari beberapa Chunk, THE Backend SHALL menghapus Finding duplikat yang memiliki Area, judul (dibandingkan tanpa membedakan huruf besar-kecil dan spasi di awal/akhir), dan path berkas yang sama, mempertahankan satu Finding dengan Severity tertinggi, lalu memberi Finding_ID berurutan tanpa celah mulai dari `F-001`.
11. WHEN satu atau lebih berkas atau Area tidak dinilai, THE Backend SHALL mencantumkan setiap Area yang terdampak di Not_Assessed beserta path berkas yang tidak dinilai dan jenis berkas atau konteks yang perlu disediakan pengguna agar Area tersebut dapat dinilai.

### Requirement 9: Deteksi dan Masking Secret

**User Story:** Sebagai pengguna, saya ingin secret yang terlanjur ter-upload di-masking otomatis dan saya diberi tahu untuk merotasinya, sehingga kredensial saya tidak bocor lebih jauh.

#### Acceptance Criteria

1. WHEN Secret_Scanner memindai isi setiap berkas yang dipilih File_Selector, THE Secret_Scanner SHALL mendeteksi setiap kemunculan Secret yang cocok dengan pola `sk_live_`, `AKIA`, `ghp_`, `-----BEGIN PRIVATE KEY-----`, JWT, dan connection string yang memuat kredensial, dan mencatat path relatif berkas serta nomor baris (dimulai dari 1) untuk setiap kemunculan.
2. WHEN Secret_Scanner mendeteksi Secret, THE Secret_Scanner SHALL mengganti setiap kemunculan Secret tersebut dengan Masked_Value (4 karakter pertama nilai asli diikuti `****`, atau `****` saja jika nilai asli 4 karakter atau kurang) sebelum isi berkas dimasukkan ke LLM_Input, termasuk pada cuplikan baris yang menyertai Finding.
3. THE Frontend SHALL menampilkan setiap Secret hanya dalam bentuk Masked_Value pada Report_View, Remediation_Prompt, dan berkas ekspor `.md`, tanpa menyediakan kontrol apa pun untuk menampilkan nilai asli.
4. WHEN Secret_Scanner mengklasifikasikan Secret sebagai Compromised_Secret, THE Backend SHALL menambahkan satu entri ke bagian Secrets to Rotate yang berisi Masked_Value, path relatif berkas, nomor baris, jenis pola Secret, dan rekomendasi untuk merotasi kredensial tersebut.
5. IF nilai yang cocok dengan pola Secret mengandung penanda placeholder (misalnya `EXAMPLE`, `PLACEHOLDER`, `YOUR_`, `DUMMY`, `CHANGE_ME`, `XXXX`, `****`, tidak peka huruf besar/kecil) atau seluruhnya terdiri dari satu karakter berulang, THEN THE Secret_Scanner SHALL tidak mengklasifikasikannya sebagai Compromised_Secret dan tidak menambahkannya ke bagian Secrets to Rotate.
6. IF Secret terdeteksi pada variabel environment berprefix publik `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, atau `EXPO_PUBLIC_`, THEN THE Backend SHALL membuat Finding pada Area Secrets dengan Severity Critical yang menyatakan bahwa secret terekspos ke client, beserta nama variabel, path relatif berkas, dan nomor baris.
7. IF Secret_Scanner gagal memindai atau melakukan masking pada berkas terpilih mana pun, THEN THE Backend SHALL tidak mengirim berkas tersebut ke LLM, mencantumkan berkas tersebut di bagian Gaps / Not Assessed beserta alasan bahwa pemindaian secret gagal, dan melanjutkan audit untuk berkas lainnya.
8. FOR ALL teks yang mengandung Secret, menerapkan masking dua kali SHALL menghasilkan teks yang identik byte-per-byte dengan hasil menerapkan masking satu kali (idempoten).
9. FOR ALL Audit_Report yang dihasilkan, nilai asli Secret mana pun yang terdeteksi SHALL tidak muncul sebagai substring di Audit_Report, di Remediation_Prompt mana pun untuk kelima Agent_Target, di LLM_Input, maupun di berkas ekspor `.md`.

### Requirement 10: Anti Prompt-Injection

**User Story:** Sebagai operator ShipSafe, saya ingin instruksi tersembunyi di dalam isi ZIP diabaikan oleh LLM, sehingga hasil audit tidak dapat dimanipulasi oleh berkas yang diaudit.

#### Acceptance Criteria

1. WHEN Backend menyusun LLM_Input, THE Backend SHALL membungkus isi setiap berkas yang dikirim ke LLM dengan sepasang Artifact_Delimiter (satu penanda pembuka dan satu penanda penutup) yang keduanya memuat path berkas relatif terhadap root Sandbox_Dir, sehingga setiap byte isi berkas berada di antara penanda pembuka dan penanda penutup miliknya sendiri dan tidak ada isi berkas yang berada di luar Artifact_Delimiter.
2. WHEN Backend menyusun LLM_Input, THE Backend SHALL menempatkan instruksi eksplisit sebelum Artifact_Delimiter pertama yang menyatakan bahwa (a) seluruh konten di dalam Artifact_Delimiter adalah data tak tepercaya yang hanya boleh dianalisis, dan (b) setiap instruksi, perintah, atau permintaan perubahan format di dalam Artifact_Delimiter harus diabaikan.
3. IF isi berkas atau path berkas mengandung string yang identik dengan penanda pembuka atau penanda penutup Artifact_Delimiter, THEN THE Backend SHALL melakukan escape pada setiap kemunculan string tersebut sebelum dimasukkan ke LLM_Input, sehingga jumlah penanda penutup yang tidak ter-escape dalam LLM_Input sama dengan jumlah berkas yang disertakan.
4. IF Upload_Archive mengandung berkas berisi instruksi yang ditujukan ke LLM (misalnya perintah untuk mengabaikan instruksi sebelumnya, mengubah format output, atau menyatakan proyek aman), THEN THE Backend SHALL menghasilkan Audit_Report yang memuat seluruh bagian wajib dan mematuhi aturan konten sebagaimana ditetapkan Requirement 11 dan Requirement 12.
5. IF Upload_Archive mengandung berkas berisi instruksi yang ditujukan ke LLM dan Secret_Scanner mendeteksi satu atau lebih Secret dalam Upload_Archive yang sama, THEN THE Backend SHALL memasukkan setiap Secret yang terdeteksi tersebut ke dalam Audit_Report sebagai Finding dengan Area Secrets, terlepas dari isi instruksi di dalam berkas.
6. THE Backend SHALL memperlakukan isi berkas dari Upload_Archive hanya sebagai teks untuk dianalisis, dan SHALL NOT mengeksekusi, menginterpretasi sebagai kode, atau menjalankan perintah apa pun yang terdapat di dalam isi berkas tersebut selama pemrosesan audit.
7. IF Audit_Report gabungan akhir (setelah penggabungan Chunk sesuai Requirement 8.10) tidak memuat seluruh bagian wajib Audit_Report sebagaimana ditetapkan Requirement 11, THEN THE Backend SHALL tidak mengembalikan hasil tersebut sebagai Audit_Report dan SHALL mengembalikan status HTTP 502 ke pemanggil Audit_Endpoint dengan pesan yang menyatakan bahwa audit gagal diselesaikan, tanpa menyimpan hasil parsial ke Audit_History. Kegagalan satu Chunk mengikuti Requirement 8.8, dan kegagalan seluruh Chunk mengikuti Requirement 8.9.

### Requirement 11: Struktur Full Report

**User Story:** Sebagai pengguna, saya ingin report yang terstruktur dan lengkap, sehingga saya cepat memahami kondisi keamanan proyek dan tahu apa yang harus diperbaiki.

#### Acceptance Criteria

1. THE Backend SHALL menghasilkan Audit_Report yang memuat kelima bagian berikut dalam urutan ini: Executive Summary, Risk Scorecard, Findings, Secrets to Rotate, dan Gaps / Not Assessed, dan setiap bagian SHALL tetap ada walaupun isinya kosong.
2. THE Executive Summary SHALL memuat satu paragraf penilaian keseluruhan yang tidak kosong, jumlah Finding untuk masing-masing dari kelima Severity (Critical, High, Medium, Low, Info) termasuk Severity yang jumlahnya 0, dan daftar area yang tidak dapat dinilai yang isinya sama dengan bagian Gaps / Not Assessed.
3. THE Risk_Scorecard SHALL memuat tepat empat baris, satu untuk setiap Area (Secrets, Dependencies, HTTP, Code), masing-masing berisi skor bilangan bulat dalam rentang 0 sampai 10 inklusif, status yang tidak kosong, dan perhatian utama yang tidak kosong.
4. THE Backend SHALL menyertakan pada setiap Finding: Finding_ID, Title, Severity, Area, Location, What, Why it matters, Recommended fix, Verify with, dan satu Remediation_Prompt untuk masing-masing dari kelima Agent_Target; Title, What, Why it matters, Recommended fix, Verify with, dan setiap Remediation_Prompt SHALL tidak kosong, Location SHALL berisi nilai sesuai kriteria 12, Severity SHALL bernilai salah satu dari lima Severity yang didefinisikan, dan Area SHALL bernilai salah satu dari empat Area yang didefinisikan.
5. FOR ALL Audit_Report, jumlah Finding per Severity di Executive Summary SHALL sama dengan jumlah Finding dengan Severity tersebut di bagian Findings, dan total kelima jumlah tersebut SHALL sama dengan jumlah seluruh Finding di bagian Findings.
6. WHEN Backend menerima output LLM, THE Backend SHALL terlebih dahulu menerapkan normalisasi sesuai Requirement 12 (kriteria 2, 3, 4, 5, dan 9), lalu memvalidasi hasil normalisasi terhadap schema Audit_Report, termasuk aturan pada kriteria 1 sampai 5, 11, dan 12, dan hanya mengembalikan Audit_Report yang lolos validasi.
7. IF Audit_Report gabungan akhir tidak lolos validasi schema Audit_Report, THEN THE Backend SHALL mengembalikan status HTTP 502 dengan pesan error yang menyatakan report tidak dapat disusun, tanpa mengembalikan report parsial dan tanpa menyimpan Audit_Report tersebut ke Audit_History. Output LLM satu Chunk yang tidak lolos validasi diperlakukan sebagai Chunk gagal sesuai Requirement 8.8.
8. FOR ALL Audit_Report yang valid, serialisasi ke JSON lalu parsing kembali dengan schema Audit_Report SHALL menghasilkan objek yang setara (round-trip), yaitu semua field dan urutan Finding identik dengan objek awal.
9. THE Report_View SHALL merender setiap Finding dengan badge Severity yang memuat nama Severity sebagai teks dan memakai warna yang berbeda untuk masing-masing dari kelima Severity, dengan Critical berwarna merah dan Info berwarna abu-abu.
10. THE Report_View SHALL merender konten markdown Audit_Report, termasuk tabel, dengan HTML mentah dihapus sehingga tidak ada elemen HTML, atribut event handler, atau script dari output LLM yang dieksekusi di browser.
11. THE Backend SHALL memberi setiap Finding dalam satu Audit_Report Finding_ID yang unik dan berurutan mulai dari `F-001` tanpa nomor yang terlewat.
12. THE Backend SHALL mengisi Location setiap Finding dengan salah satu dari: (a) path berkas yang benar-benar ada di Upload_Archive yang diekstrak, dengan nomor baris (dalam rentang 1 sampai jumlah baris berkas tersebut) atau snippet hanya disertakan bila tersedia dari isi berkas tersebut; atau (b) "Not enough information" bila lokasi tidak dapat dipastikan.
13. IF audit tidak menghasilkan Finding apa pun, THEN THE Report_View SHALL menampilkan bagian Findings dengan pesan yang menyatakan tidak ada temuan, dan Executive Summary SHALL menampilkan jumlah 0 untuk kelima Severity.
14. THE Backend SHALL mengisi bagian Secrets to Rotate hanya dengan Masked_Value dari setiap Compromised_Secret yang terdeteksi, masing-masing disertai path berkas tempat Secret ditemukan, dan tidak pernah memuat nilai Secret asli.

### Requirement 12: Aturan Konten Report

**User Story:** Sebagai pengguna, saya ingin report yang jujur dan tidak mengarang, sehingga saya bisa mempercayai dan memverifikasi setiap temuan.

#### Acceptance Criteria

1. WHERE Location pada Finding berisi path berkas, THE Backend SHALL mencantumkan path tersebut hanya dalam bentuk path berkas relatif terhadap root Upload_Archive yang menunjuk ke berkas yang ada di dalam Upload_Archive, dengan nomor baris opsional berupa bilangan bulat dari 1 sampai jumlah baris berkas tersebut.
2. IF output LLM memuat Location dengan path berkas yang tidak ada di Upload_Archive, THEN THE Backend SHALL menghapus Location tersebut dari Finding, mengisi field Location dengan "Not enough information", dan mempertahankan field Finding lainnya tanpa perubahan.
3. IF output LLM memuat Location dengan path berkas yang ada di Upload_Archive tetapi nomor barisnya kurang dari 1 atau lebih besar dari jumlah baris berkas tersebut, THEN THE Backend SHALL menghapus nomor baris itu dan mempertahankan path berkas sebagai Location.
4. IF CVE_ID untuk sebuah Finding tidak ada dalam output LLM atau tidak berformat `CVE-` diikuti 4 digit tahun, tanda hubung, dan minimal 4 digit, THEN THE Backend SHALL menuliskan "Not enough information" pada field CVE_ID Finding tersebut alih-alih mengisi nilai dugaan.
5. IF Package_Version untuk sebuah Finding tidak tertulis secara literal di manifest dependency atau lockfile di dalam Upload_Archive, THEN THE Backend SHALL menuliskan "Not enough information" pada field Package_Version Finding tersebut alih-alih mengisi nilai dugaan.
6. THE Backend SHALL memberi label "Likely, verify" beserta minimal satu langkah verifikasi tertulis pada setiap Finding di Area Dependencies yang menyatakan kerentanan atau status usang suatu paket.
7. THE Backend SHALL mengisi field Verify with pada setiap Finding Area Dependencies dengan minimal satu perintah atau tool verifikasi yang sesuai dengan ekosistem manifest dependency berkas terkait (misalnya `npm audit` untuk `package.json`, `pip-audit` untuk `requirements.txt` atau `pyproject.toml`, atau OSV-Scanner untuk ekosistem apa pun).
8. THE Backend SHALL menetapkan tepat satu Severity (Critical, High, Medium, Low, atau Info) untuk setiap Finding, disertai minimal satu kalimat alasan dampak yang merujuk ke Location atau ke berkas dan konfigurasi proyek yang diaudit.
9. IF output LLM untuk sebuah Finding tidak memuat Severity atau memuat Severity di luar lima nilai yang diizinkan, THEN THE Backend SHALL menetapkan Severity Finding tersebut ke Medium, memberi label "Likely, verify", dan mempertahankan Finding di dalam Audit_Report.

### Requirement 13: Prompt Remediation per Temuan

**User Story:** Sebagai pengguna, saya ingin satu prompt siap-tempel untuk setiap temuan, sehingga coding agent saya bisa langsung memperbaikinya.

#### Acceptance Criteria

1. WHEN Audit_Report selesai disusun, THE Prompt_Generator SHALL menghasilkan tepat satu Remediation_Prompt untuk setiap kombinasi Finding dan Agent_Target (lima Agent_Target per Finding), dengan setiap Remediation_Prompt terhubung ke Finding_ID asalnya.
2. THE Prompt_Generator SHALL menyertakan enam bagian berikut di setiap Remediation_Prompt: (a) peran dan tujuan, yaitu security engineer yang memperbaiki kerentanan tanpa mengubah perilaku lain; (b) konteks masalah, yaitu Finding_ID, judul, Area, Severity, dan penjelasan Finding; (c) lokasi, yaitu path berkas dan baris atau snippet dari Finding; (d) perilaku yang diharapkan setelah perbaikan beserta minimal satu kriteria verifikasi yang dapat diamati; (e) batasan, yaitu tidak menambah hardcoded secret baru, tidak mengubah fitur di luar lokasi Finding, mengikuti konvensi proyek, dan menambah atau memperbarui test apabila Upload_Archive berisi berkas test; (f) catatan keamanan, yaitu larangan menempel secret nyata ke prompt dan instruksi rotasi apabila Finding menyangkut Compromised_Secret.
3. THE Prompt_Generator SHALL mengambil path berkas, baris, dan snippet pada Remediation_Prompt hanya dari Location Finding terkait, tanpa menambah path atau nomor baris yang tidak ada di Finding tersebut.
4. IF Location Finding berisi path berkas tetapi tidak memuat nomor baris atau snippet, THEN THE Prompt_Generator SHALL menyertakan hanya path berkas yang tersedia dan menyatakan di Remediation_Prompt bahwa baris spesifik tidak diketahui.
5. IF Location Finding bernilai "Not enough information", THEN THE Prompt_Generator SHALL menyatakan di Remediation_Prompt bahwa lokasi tidak diketahui dan menginstruksikan coding agent untuk mencari lokasi masalah di repository berdasarkan konteks masalah Finding.
6. THE Prompt_Generator SHALL merujuk secret di Remediation_Prompt hanya dengan nama variabel, placeholder, atau Masked_Value, sehingga tidak ada Remediation_Prompt yang memuat lebih dari 4 karakter pertama nilai Secret asli.
7. WHERE Agent_Target adalah Generic, THE Prompt_Generator SHALL memformat Remediation_Prompt secara netral dengan langkah bernomor.
8. WHERE Agent_Target adalah Cursor, THE Prompt_Generator SHALL memformat Remediation_Prompt sebagai instruksi edit berbasis berkas dengan referensi `@<path berkas>` untuk setiap path berkas di Location Finding.
9. WHERE Agent_Target adalah Claude Code, THE Prompt_Generator SHALL memformat Remediation_Prompt sebagai tugas yang menyertakan minimal satu langkah menjalankan test atau build untuk verifikasi.
10. WHERE Agent_Target adalah GitHub Copilot, THE Prompt_Generator SHALL memformat Remediation_Prompt sebagai instruksi inline atau komentar beserta deskripsi perubahan, dengan panjang lebih pendek daripada Remediation_Prompt Generic untuk Finding yang sama.
11. WHERE Agent_Target adalah Windsurf, THE Prompt_Generator SHALL memformat Remediation_Prompt sebagai instruksi edit berbasis workspace dengan referensi path berkas relatif terhadap root proyek.
12. WHEN Audit_Report pertama kali tampil di Report_View, THE ShipSafe SHALL menampilkan Remediation_Prompt untuk Agent_Target yang dipilih pengguna saat upload sesuai Requirement 3.6, yaitu Generic bila pengguna tidak mengubah pilihan.
13. WHEN pengguna mengganti Agent_Target setelah Audit_Report tampil, THE ShipSafe SHALL menampilkan Remediation_Prompt untuk Agent_Target baru dalam waktu 1 detik dari Remediation_Prompt yang sudah diterima Frontend bersama Audit_Report sesuai kriteria 1, tanpa meng-upload ulang Upload_Archive, tanpa request tambahan ke Backend, dan tanpa mengubah isi Audit_Report.
14. IF data Audit_Report yang diterima Frontend tidak memuat Remediation_Prompt untuk sebuah Finding dan Agent_Target yang dipilih, THEN THE Frontend SHALL tetap menampilkan Finding tersebut dan Finding lain di Audit_Report, serta menampilkan indikasi di Finding tersebut bahwa Remediation_Prompt tidak tersedia. Kriteria ini hanya mengatur fallback tampilan Frontend; Backend tetap wajib memenuhi Requirement 11.4.

### Requirement 14: Ekspor Prompt

**User Story:** Sebagai pengguna, saya ingin menyalin satu atau semua prompt dan mengunduhnya, sehingga saya mudah memindahkannya ke coding agent.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol Copy Prompt pada sebuah Finding, THE Frontend SHALL menyalin ke clipboard teks Remediation_Prompt Finding tersebut untuk Agent_Target yang sedang dipilih, identik karakter-per-karakter dengan teks yang ditampilkan di Report_View, lalu menampilkan konfirmasi bahwa prompt telah disalin selama minimal 2 detik dan maksimal 5 detik.
2. WHEN pengguna menekan tombol Copy All Prompts, THE Frontend SHALL menyalin ke clipboard semua Remediation_Prompt untuk Agent_Target yang sedang dipilih, diurutkan naik berdasarkan Finding_ID, masing-masing didahului satu header yang memuat Finding_ID dan Title Finding tersebut, lalu menampilkan konfirmasi bahwa semua prompt telah disalin selama minimal 2 detik dan maksimal 5 detik.
3. WHEN pengguna menekan tombol unduh `.md`, THE Frontend SHALL mengunduh satu berkas dengan ekstensi `.md` berisi semua Remediation_Prompt untuk Agent_Target yang sedang dipilih, diurutkan naik berdasarkan Finding_ID, masing-masing didahului satu header yang memuat Finding_ID dan Title Finding tersebut.
4. IF penyalinan ke clipboard gagal pada tombol Copy Prompt atau Copy All Prompts, THEN THE Frontend SHALL menampilkan pesan yang menunjukkan bahwa penyalinan gagal, menampilkan teks lengkap yang seharusnya disalin dalam area teks yang dapat diseleksi untuk disalin manual, dan mempertahankan Audit_Report yang sedang ditampilkan tanpa perubahan.
5. THE Frontend SHALL menghasilkan berkas `.md` ekspor yang memuat tepat satu header untuk setiap Finding dalam Audit_Report, tidak ada header untuk Finding_ID yang tidak ada dalam Audit_Report, dan setiap Remediation_Prompt utuh tanpa pemotongan atau modifikasi isi.
6. IF Audit_Report memuat nol Finding, THEN THE Frontend SHALL menonaktifkan tombol Copy All Prompts dan tombol unduh `.md` serta menampilkan keterangan bahwa tidak ada prompt untuk diekspor.
7. IF pembuatan atau pengunduhan berkas `.md` gagal, THEN THE Frontend SHALL menampilkan pesan yang menunjukkan bahwa pengunduhan gagal dan mempertahankan Audit_Report yang sedang ditampilkan tanpa perubahan.

### Requirement 15: Riwayat Audit untuk Pengguna Login

**User Story:** Sebagai pengguna yang login, saya ingin report saya tersimpan dan bisa dibuka lagi, sehingga saya dapat melacak perbaikan dari waktu ke waktu.

#### Acceptance Criteria

1. WHEN audit milik Authenticated_User selesai dan Audit_Report berhasil dibentuk, THE Backend SHALL menyimpan tepat satu baris Audit_Report ke tabel `audits` di Supabase dengan `user_id` yang diambil dari JWT terverifikasi (bukan dari input request) dan waktu pembuatan, sebelum Audit_Report dikembalikan ke Frontend.
2. THE Backend SHALL menyimpan ke Supabase hanya Audit_Report (summary, jumlah per Severity, Risk_Scorecard, Findings, Secrets to Rotate dalam bentuk Masked_Value, Not_Assessed, skippedFiles) tanpa isi berkas dari Upload_Archive dan tanpa nilai asli Secret dalam bentuk apa pun.
3. THE Supabase SHALL menerapkan RLS pada tabel `audits` sehingga Authenticated_User hanya dapat membaca, membuat, dan menghapus baris dengan `user_id` yang sama dengan identitas pada JWT-nya, dan permintaan tanpa JWT valid tidak dapat membaca, membuat, maupun menghapus baris apa pun.
4. WHILE pengguna berstatus Authenticated_User, THE Frontend SHALL menampilkan Audit_History berisi daftar audit milik pengguna, diurutkan dari waktu pembuatan terbaru ke terlama, maksimal 20 entri per halaman dengan navigasi ke halaman berikutnya, di mana setiap entri menampilkan waktu pembuatan dan jumlah Finding untuk masing-masing dari lima Severity, serta menampilkan keadaan kosong yang menyatakan belum ada audit tersimpan apabila pengguna memiliki 0 audit.
5. WHEN Authenticated_User memilih satu entri di Audit_History, THE Frontend SHALL menampilkan Audit_Report tersimpan tersebut di Report_View dengan isi bagian Executive Summary, Risk_Scorecard, Findings, Secrets to Rotate, dan Not_Assessed yang identik dengan data yang tersimpan untuk entri tersebut.
6. IF penyimpanan Audit_Report ke Supabase gagal, THEN THE Backend SHALL tetap mengembalikan Audit_Report lengkap ke Frontend beserta penanda bahwa report tidak tersimpan tanpa membuat baris parsial di tabel `audits`, dan THE Frontend SHALL menampilkan pemberitahuan bahwa report tidak tersimpan ke riwayat.
7. WHEN audit milik Anonymous_User selesai, THE Backend SHALL mengembalikan Audit_Report ke Frontend tanpa menyimpan baris apa pun ke tabel `audits`.
8. WHEN Authenticated_User mengonfirmasi penghapusan satu entri di Audit_History, THE Frontend SHALL menghapus baris tersebut dari tabel `audits` dan menghilangkan entri itu dari daftar Audit_History tanpa memuat ulang halaman.
9. IF penghapusan entri Audit_History gagal, THEN THE Frontend SHALL mempertahankan entri tersebut di daftar Audit_History dan menampilkan pesan error yang menyatakan penghapusan gagal.
10. IF pemuatan Audit_History atau Audit_Report tersimpan gagal, atau entri yang dipilih sudah tidak ada, THEN THE Frontend SHALL menampilkan pesan error yang menyatakan riwayat atau report tidak dapat dimuat beserta opsi untuk mencoba lagi, tanpa menampilkan data audit milik pengguna lain.

### Requirement 16: Report Sesi untuk Pengguna Anonim

**User Story:** Sebagai pengguna anonim, saya ingin mendapat report tanpa data saya disimpan, sehingga privasi saya terjaga.

#### Acceptance Criteria

1. WHEN Audit_Endpoint selesai memproses audit dari request yang tidak membawa JWT, THE Backend SHALL mengembalikan Audit_Report lengkap di dalam response ke Frontend tanpa menulis Audit_Report, Finding, Remediation_Prompt, maupun daftar nama berkas proyek ke Supabase.
2. WHEN Backend selesai mengirim response audit milik Anonymous_User, THE Backend SHALL tidak menyimpan salinan Audit_Report di disk VPS atau penyimpanan persisten lain, sehingga Audit_Report tersebut tidak dapat diambil kembali dari Backend melalui request apa pun setelahnya.
3. WHILE pengguna berstatus Anonymous_User, THE Frontend SHALL menyimpan Audit_Report hanya di memori runtime halaman (state aplikasi di tab yang aktif) dan tidak di localStorage, sessionStorage, IndexedDB, cookie, maupun Cache Storage.
4. WHEN Anonymous_User menutup tab, memuat ulang tab, atau berpindah ke halaman di luar Frontend, THE Frontend SHALL membuang Audit_Report sehingga setelah tab dibuka atau dimuat ulang tidak ada Audit_Report sebelumnya yang ditampilkan.
5. WHILE pengguna berstatus Anonymous_User dan Audit_Report tampil di Report_View, THE Frontend SHALL menampilkan pemberitahuan di bagian atas Report_View, terlihat tanpa scroll dan tetap tampil selama Report_View terbuka, yang menyatakan bahwa report tidak disimpan dan akan hilang saat tab ditutup atau dimuat ulang.
6. WHEN Anonymous_User login melalui Supabase_Auth saat Audit_Report anonim sedang tampil, THE ShipSafe SHALL tidak menyimpan Audit_Report anonim tersebut ke Audit_History secara otomatis.

### Requirement 17: Retensi Data ZIP

**User Story:** Sebagai pengguna, saya ingin isi ZIP saya tidak disimpan permanen, sehingga kode saya tidak tertinggal di server.

#### Acceptance Criteria

1. WHEN pemrosesan sebuah audit berakhir, baik karena sukses, gagal validasi, gagal ekstraksi, gagal pemanggilan LLM, timeout, maupun koneksi klien terputus, THE Backend SHALL menghapus Sandbox_Dir milik audit tersebut beserta seluruh isinya, berkas Upload_Archive, dan setiap buffer di memori yang berisi isi berkas paling lambat 5 detik (default yang dapat dikonfigurasi) setelah respons dikirim atau setelah pemrosesan dihentikan, sehingga tidak ada satu pun berkas dari audit tersebut yang tersisa di disk VPS.
2. THE Backend SHALL menulis setiap entri log tanpa menyertakan isi berkas dari Upload_Archive maupun nilai asli Secret; entri log hanya boleh memuat path berkas relatif, ukuran, jumlah entri, kode status, durasi, dan Masked_Value.
3. WHEN Backend dijalankan ulang, THE Backend SHALL menghapus setiap Sandbox_Dir dan berkas Upload_Archive sisa dari proses sebelumnya sebelum Audit_Endpoint mulai menerima permintaan baru.
4. IF penghapusan Sandbox_Dir atau Upload_Archive gagal, THEN THE Backend SHALL mencoba ulang penghapusan maksimal 3 kali dengan jeda minimal 1 detik antar percobaan, dan jika tetap gagal SHALL mencatat entri log berisi identitas audit dan path Sandbox_Dir tanpa isi berkas, tanpa mengubah respons yang sudah atau akan dikirim ke pengguna.
5. WHILE Backend berjalan, THE Backend SHALL menghapus setiap Sandbox_Dir yang berumur lebih dari 15 menit sejak dibuat (nilai default yang dapat dikonfigurasi) dengan pemeriksaan minimal setiap 5 menit.
6. THE ShipSafe SHALL menyimpan ke Supabase hanya Audit_Report dan Remediation_Prompt, tanpa menyimpan Upload_Archive, isi berkas dari Upload_Archive, maupun nilai asli Secret.

### Requirement 18: Keamanan Aplikasi ShipSafe Sendiri

**User Story:** Sebagai operator ShipSafe, saya ingin ShipSafe sendiri ter-hardening, sehingga ShipSafe lolos audit keamanannya sendiri.

#### Acceptance Criteria

1. THE Backend SHALL menyimpan LLM API key hanya pada environment server VPS dan melakukan setiap panggilan LLM dari Backend, tanpa menyertakan nilai LLM API key di respons API, pesan error, maupun log aplikasi.
2. THE Frontend SHALL beroperasi tanpa LLM API key di bundle client, variabel environment publik, maupun respons API, dan tanpa melakukan panggilan langsung dari browser ke LLM.
3. IF jumlah permintaan ke Audit_Endpoint dari satu alamat IP melebihi 10 permintaan dalam jendela 10 menit (default yang dapat dikonfigurasi), THEN THE Backend SHALL menolak setiap permintaan berikutnya dari alamat IP tersebut dengan status HTTP 429 dan header `Retry-After` berisi jumlah detik hingga jendela berakhir, tanpa memproses Upload_Archive dan tanpa memanggil LLM, hingga jendela 10 menit tersebut berakhir.
4. THE Backend SHALL menerapkan CORS dengan Allowed_Origin_List eksplisit dan tanpa wildcard `*`, serta mengembalikan header `Access-Control-Allow-Origin` yang bernilai persis sama dengan origin peminta hanya bila origin tersebut ada di Allowed_Origin_List.
5. IF permintaan, termasuk permintaan preflight, berasal dari origin yang tidak ada di Allowed_Origin_List, THEN THE Backend SHALL menolak permintaan tanpa header `Access-Control-Allow-Origin` untuk origin tersebut dan tanpa memproses Upload_Archive maupun memanggil LLM.
6. THE Frontend SHALL mengirim header keamanan Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options bernilai `nosniff`, Referrer-Policy, Permissions-Policy, dan frame-ancestors (atau X-Frame-Options) pada setiap respons halaman, termasuk halaman error.
7. THE Backend SHALL mengirim header keamanan Strict-Transport-Security, X-Content-Type-Options bernilai `nosniff`, dan Referrer-Policy pada setiap respons, termasuk respons error dan respons penolakan rate limit.
8. THE Backend SHALL menerapkan batas ukuran Upload_Archive 10 MB dan batas waktu pemrosesan 120 detik per permintaan (default yang dapat dikonfigurasi) pada Audit_Endpoint.
9. IF ukuran Upload_Archive melebihi batas ukuran atau pemrosesan Audit_Endpoint melampaui batas waktu, THEN THE Backend SHALL menghentikan pemrosesan, mengembalikan respons error yang menunjukkan batas mana yang terlampaui, tidak mengembalikan Audit_Report parsial, dan menghapus Sandbox_Dir milik audit tersebut.
10. IF terjadi error internal pada Backend, THEN THE Backend SHALL mengembalikan pesan error generik tanpa stack trace, path server, isi berkas, nilai Secret, maupun LLM API key.
11. WHILE Backend berjalan di lingkungan produksi, THE Backend SHALL melayani Audit_Endpoint hanya melalui HTTPS dan menolak setiap permintaan ke Audit_Endpoint melalui HTTP tanpa enkripsi tanpa memproses Upload_Archive.
