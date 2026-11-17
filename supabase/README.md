# Tahap 2 — database dan RLS

Migrasi: `migrations/202611170001_create_entries.sql`.

## Terapkan ke proyek Supabase Anda

1. Buka proyek Supabase yang sama dengan aplikasi (cocokkan Project URL di `.env.local`).
2. Pilih **SQL Editor → New query**.
3. Salin **seluruh isi** `migrations/202611170001_create_entries.sql`, lalu klik **Run**.
4. Pastikan query berhasil. Tabel `public.entries` akan muncul di Table Editor dengan RLS aktif.

Jalankan migrasi satu kali. Migrasi memakai transaksi: jika ada kegagalan, perubahan di dalamnya dibatalkan. Jika tabel `entries` ternyata sudah ada, jangan menghapusnya; periksa skema dahulu. Migrasi sengaja tidak memakai `IF NOT EXISTS` agar perbedaan skema tidak tersembunyi.

Jangan menjalankan `tests/bootstrap.sql` atau `tests/rls.sql` di proyek Supabase Anda. Kedua file itu khusus untuk database uji kosong yang dibuat `npm run test:db`.

Jika memakai Supabase CLI dan proyek sudah ditautkan, alternatifnya gunakan `supabase db push`. Pilih salah satu cara penerapan dan catat migrasi yang sudah dijalankan; SQL Editor tidak otomatis mengisi riwayat migrasi CLI.

## Skema entri

| Kolom | Tipe | Perilaku |
|---|---|---|
| `id` | `uuid` | Primary key, dibuat otomatis |
| `owner_id` | `uuid` | Wajib, default `auth.uid()`, foreign key ke `auth.users` |
| `activity_date` | `date` | Tanggal kegiatan wajib; beberapa entri pada tanggal sama diperbolehkan |
| `activity` | `text` | Kegiatan wajib; teks kosong atau hanya whitespace ditolak |
| `result` | `text` | Hasil wajib; teks kosong atau hanya whitespace ditolak |
| `evidence_url` | `text` | Satu URL opsional; `null` dan string kosong diterima |
| `created_at` | `timestamptz` | Waktu penyimpanan otomatis |

URL yang terisi harus memakai HTTP/HTTPS dan tidak mengandung whitespace. Ini pemeriksaan dasar di database; formulir tahap 3 tetap perlu memvalidasi URL lengkap. Izin membuka dokumen bukti mengikuti layanan asal.

Indeks `(owner_id, activity_date desc, created_at desc)` mendukung daftar dan rekap milik pengguna. Penghapusan user Auth menghapus entri miliknya melalui foreign key `ON DELETE CASCADE`.

## Aturan akses

- Pengguna anonim tidak diberi hak baca/tambah/ubah/hapus.
- Pengguna terautentikasi hanya bisa membaca, mengubah, dan menghapus entri dengan `owner_id = auth.uid()`.
- Insert hanya boleh memakai identitas sendiri; `owner_id` boleh dihilangkan agar memakai default.
- Update memeriksa pemilik sebelum **dan** sesudah perubahan. Pengguna tidak bisa memindahkan entri ke akun lain.
- Tidak ada kebijakan untuk akses umum atau berbagi entri.

Query langsung ke ID milik orang lain menghasilkan nol baris untuk SELECT/UPDATE/DELETE. Percobaan insert atas nama orang lain dan pergantian pemilik ditolak dengan kode PostgreSQL `42501`.

RLS melindungi permintaan dari role aplikasi, bukan administrator database. SQL Editor biasanya memakai role administrator yang dapat melewati RLS. Karena itu, membaca seluruh baris lewat SQL Editor bukan bukti kebocoran RLS; gunakan pengujian berikut dengan akun pengguna dan kunci publik.

## Uji database lokal otomatis

Prasyarat: Docker aktif dan koneksi untuk mengunduh image `postgres:17-alpine` pada pemakaian pertama.

```bash
npm run test:db
```

Skrip membuat container PostgreSQL sementara tanpa membuka port, menyiapkan pengganti minimal schema Auth, menerapkan migrasi asli, lalu menjalankan query sebagai role `authenticated` dan `anon`. Dua identitas uji menjalankan operasi sendiri dan percobaan akses silang. Tes juga memeriksa pemalsuan pemilik, pergantian pemilik, bidang wajib, tautan, dan beberapa entri pada tanggal sama. Container dihapus setelah tes selesai; database Supabase Anda tidak disentuh.

Tes lokal ini menguji PostgreSQL/RLS nyata, tetapi bukan layanan Supabase Auth atau API proyek Anda.

## Uji API Supabase dengan dua akun

Setelah migrasi diterapkan:

1. Siapkan dua akun uji berbeda di **Authentication → Users**. Pastikan keduanya telah dikonfirmasi. Akun yang sudah Anda pakai login boleh menjadi akun A; buat akun B khusus untuk tes.
2. Pastikan `.env.local` berisi URL dan publishable/anon key proyek yang benar.
3. Salin `.env.rls.example` menjadi `.env.rls.local`. Isi email dan kata sandi A/B **di komputer Anda**. Jangan tambahkan awalan `VITE_` pada variabel kata sandi, jangan kirim kredensial lewat chat, dan jangan commit file tersebut. Jika kata sandi mengandung `#`, tulis nilainya di dalam tanda kutip sesuai format dotenv.
4. Jalankan dari terminal folder proyek:

   ```bash
   npm run test:rls:api
   ```

Skrip masuk memakai Supabase Auth nyata, lalu memanggil API `entries` langsung sebagai A, B, dan anonim. Tes harus lulus untuk insert/baca/update/delete milik sendiri, isolasi dua arah termasuk query berdasarkan ID, insert pemilik palsu, perubahan pemilik, dan larangan akses anonim. Kunci `service_role` atau secret key ditolak agar tes tidak melewati RLS.

Skrip memakai data sintetis berlabel `UJI RLS` dan UUID acak. Bagian `finally` membersihkan hanya UUID milik tes. Jika jaringan putus atau pembersihan gagal, skrip menampilkan UUID yang perlu diperiksa secara manual. Entri asli tidak dihapus. Email, kata sandi, dan token tidak dicetak oleh skrip; sesi tidak disimpan di disk.

Jika muncul kode `PGRST205` atau tabel tidak ditemukan, periksa proyek dan penerapan migrasi. Jika login gagal, periksa email, kata sandi, dan konfirmasi akun secara lokal. Bila salah satu tes gagal, jangan lanjut ke fitur entri sebelum penyebabnya diperbaiki.

Tahap ini belum menambahkan formulir atau daftar entri ke aplikasi. Fitur tersebut dikerjakan pada tahap 3 setelah database dan isolasi pengguna terverifikasi.
