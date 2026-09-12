-- Jalankan seluruh script ini di Supabase: buka project kamu > SQL Editor > New query > paste > Run

create table if not exists kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

-- Semua orang boleh baca data (biar pengunjung situs bisa lihat novel & komentar)
create policy "Public read access"
  on kv_store for select
  using (true);

-- Semua orang boleh menulis/menghapus data lewat anon key ini.
-- Di aplikasi, tombol tambah/edit/hapus tetap disembunyikan di balik
-- password admin, tapi ini BUKAN keamanan tingkat database — anggap
-- ini setup versi sederhana. Kalau nanti butuh lebih aman, tambahkan
-- Supabase Auth dan ganti policy ini supaya hanya user admin yang login
-- yang boleh insert/update/delete.
create policy "Public write access"
  on kv_store for insert
  with check (true);

create policy "Public update access"
  on kv_store for update
  using (true);

create policy "Public delete access"
  on kv_store for delete
  using (true);
