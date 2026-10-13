# 🔄 ShipSafe n8n Orchestration Workflow

Berkas ini menyediakan alur kerja (workflow) n8n untuk orkestrasi pemrosesan audit keamanan kode AI secara visual.

## 📌 Alur Pipeline n8n
1. **Node 1: Webhook Ingestion (`POST /webhook/shipsafe-audit`)**: Menerima unggahan berkas ZIP proyek (maksimal 10 MB) beserta metadata konteks dan target coding agent pengguna.
2. **Node 2: Code Node (Zip Guard & Pre-Process)**: Memvalidasi integritas file, batas ukuran, dan persiapan payload binary.
3. **Node 3: HTTP Request Node (Engine Audit & AI Analyzer)**: Menghubungkan ke ShipSafe API di `http://213.163.197.214:23010/api/audit` yang menjalankan ekstraksi aman, filter noise, regex masking secret, dan inferensi AI model `hermes-agent`.
4. **Node 4: Code Node (Prompt Synthesizer)**: Mengekstrak daftar temuan (`findings`), scorecard, kredensial yang wajib dirotasi, serta menyusun prompt remediasi siap-tempel untuk coding agent (Cursor, Claude Code, GitHub Copilot, Windsurf, Generic).
5. **Node 5: Respond to Webhook Node**: Mengembalikan respons JSON lengkap secara instan kepada pengguna.

## 🚀 Cara Import ke n8n
1. Buka dashboard n8n Anda.
2. Klik tombol **`Workflows`** > **`Add Workflow`** > Klik menu titik tiga `...` di kanan atas > Pilih **`Import from File`**.
3. Pilih berkas `n8n/shipsafe-workflow.json`.
4. Aktifkan workflow dengan menggeser toggle **Active** ke posisi ON.
