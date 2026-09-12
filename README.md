# Ra Translation

Website galeri novel terjemahan (React + Vite + Tailwind), datanya disimpan di Supabase supaya bisa online beneran dan diakses siapa aja.

Panduan ini **tidak butuh instal apa-apa di komputer** — semua lewat browser. GitHub yang akan build & publish situsnya otomatis tiap kali ada perubahan.

## Langkah 1 — Siapkan database gratis di Supabase

1. Buka https://supabase.com → daftar/login (bisa pakai akun GitHub).
2. Klik **New project**. Isi nama bebas, bikin database password (simpan saja, tidak dipakai di kode), pilih region terdekat (Singapore).
3. Tunggu ±2 menit sampai project siap.
4. Di sidebar kiri klik **SQL Editor** → **New query**.
5. Buka file `supabase-setup.sql` di folder ini, copy semua isinya, paste ke editor, klik **Run**.
6. Di sidebar kiri klik **Project Settings** (ikon gerigi) → **API**.
7. Catat dua hal: **Project URL** (`https://xxxxx.supabase.co`) dan **anon public key** (kunci panjang).

## Langkah 2 — Buat repo baru di GitHub

1. Buka https://github.com/new
2. Isi nama repo, misalnya `ra-translation` (nama ini nanti dipakai lagi di Langkah 4).
3. Pilih **Public**, jangan centang opsi tambahan apa pun.
4. Klik **Create repository**.

## Langkah 3 — Upload semua file project ke repo

1. Di halaman repo yang masih kosong, klik **uploading an existing file**.
2. Buka folder `ra-translation-site` hasil ekstrak zip di komputer kamu, lalu **drag semua isi folder** (bukan folder luarnya, tapi isinya: `src`, `.github`, `package.json`, dst) ke halaman upload GitHub tadi.
   - Kalau browser kamu tidak bisa drag folder, upload file satu-satu — pastikan struktur foldernya tetap sama (`src/App.jsx`, `.github/workflows/deploy.yml`, dst).
3. Scroll ke bawah, klik **Commit changes**.

## Langkah 4 — Sesuaikan nama repo di `vite.config.js`

1. Di halaman repo GitHub, buka file `vite.config.js`, klik ikon pensil (Edit).
2. Cari baris `base: "/ra-translation/"`, ganti `ra-translation` dengan nama repo kamu di Langkah 2 (persis, termasuk tanda `/` di awal dan akhir).
3. Klik **Commit changes**.

## Langkah 5 — Masukkan kunci Supabase sebagai secret

1. Di repo GitHub, klik **Settings** → **Secrets and variables** → **Actions**.
2. Klik **New repository secret**, buat dua secret:
   - Name: `VITE_SUPABASE_URL`, Value: Project URL dari Langkah 1
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: anon key dari Langkah 1

## Langkah 6 — Nyalakan GitHub Pages

1. Masih di **Settings** → klik **Pages** di sidebar.
2. Di bagian **Build and deployment**, pilih source: **GitHub Actions**.

Selesai — nggak perlu langkah lain. Workflow otomatis (`.github/workflows/deploy.yml`) akan langsung jalan (cek tab **Actions** di repo buat lihat prosesnya, tanda ✅ hijau kalau sukses). Setelah selesai (biasanya 1-2 menit), situs kamu aktif di:

```
https://USERNAME.github.io/NAMA-REPO/
```

Tiap kali kamu edit/upload file baru ke repo ini (lewat GitHub, kapan saja), situs otomatis ter-update lagi.

## Langkah 7 — Ganti password admin

Buka file `src/App.jsx` di GitHub (klik pensil untuk edit), cari baris:
```js
const ADMIN_PASSWORD = "ratranslation2026";
```
Ganti dengan password sendiri, lalu **Commit changes** — situs akan otomatis ter-deploy ulang dengan password baru.

Catatan: ini gerbang sederhana di sisi tampilan, bukan sistem login yang aman di level database (lihat catatan di `supabase-setup.sql`). Cocok untuk pemakaian pribadi/skala kecil.

---

## Kalau kamu memang punya Git & Node.js terinstal (opsional)

Kalau lebih familiar pakai terminal, ini jalan pintasnya — hasilnya sama saja dengan langkah di atas:

```bash
npm install
npm run dev        # coba dulu di komputer sendiri (butuh file .env, lihat .env.example)

git init
git add .
git commit -m "Ra Translation - initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
Setelah push, tetap lanjut ke Langkah 4-6 di atas (edit `vite.config.js`, isi secrets, nyalakan Pages) — workflow GitHub Actions yang akan build & deploy-nya, jadi kamu tidak perlu jalankan `npm run deploy` secara manual.

## Struktur singkat
- `src/App.jsx` — seluruh tampilan & logika situs
- `src/supabaseClient.js` — koneksi ke database
- `supabase-setup.sql` — skema tabel database
- `.github/workflows/deploy.yml` — robot yang build & publish situs otomatis
- `.env` — kunci rahasia koneksi Supabase, dipakai kalau coba jalankan di komputer sendiri (jangan di-upload)

