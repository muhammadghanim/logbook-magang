# Hasil verifikasi tahap 1

Tanggal: 17 November 2026.

## Lingkungan dan kondisi awal

- Folder `/workspace` belum berisi aplikasi atau konfigurasi Supabase; lampiran dipertahankan.
- Repo `https://github.com/muhammadghanim/logbook-magang.git` berhasil diklon ke `/workspace/logbook-magang` dan masih kosong (belum ada commit).
- Node.js v24.22.1, npm 11.9.0.
- Tidak tersedia URL proyek, publishable key, atau akun Supabase nyata. Tidak ada kredensial asli yang ditambahkan.
- Pada verifikasi awal, belum dilakukan commit atau push. Migrasi database dan deployment tidak termasuk tahap 1.

## Lulus

- Instalasi dependensi; `package-lock.json` dibuat untuk instalasi ulang dengan `npm ci`.
- `npm run build`: Vite 7.3.8 berhasil menghasilkan bundle produksi.
- `npm audit --omit=dev --audit-level=moderate`: 0 kerentanan dependensi produksi pada saat pemeriksaan.
- `git check-ignore .env.local`: konfigurasi lokal diabaikan Git.
- Browser Chromium/Playwright: layar panduan konfigurasi terbuka ketika variabel belum diisi; formulir login tidak aktif.
- Preview produksi: terbuka pada ukuran 390 dan 1280 piksel tanpa overflow horizontal dan tanpa exception JavaScript.
- Browser dengan respons Supabase yang disimulasikan: validasi form kosong, kata sandi salah, email belum dikonfirmasi, kegagalan jaringan, login berhasil, email pada halaman awal, pemulihan sesi setelah reload, keluar, serta reload setelah keluar.
- Pemeriksaan browser simulasi tidak menemukan exception JavaScript. Respons HTTP 400 dan kegagalan jaringan memang disimulasikan untuk menguji pesan kesalahan.

Simulasi dilakukan memakai Supabase JS asli dengan permintaan Auth dicegat oleh Playwright; URL dan kunci uji disuntikkan hanya ke proses pengujian, tidak ditulis ke `.env.local`. Skrip dan dependensi pemeriksaan browser berada di `/workspace/work/browser-check`, terpisah dari dependensi aplikasi.

## Masih perlu diuji dengan Supabase nyata

Isi `.env.local` mengikuti README, siapkan akun uji terkonfirmasi, kemudian uji login benar/salah, akun belum dikonfirmasi, pemulihan sesi, refresh token setelah kedaluwarsa, sinkronisasi keluar lintas tab, dan keluar setelah muat ulang. Simulasi belum membuktikan bahwa URL/kunci, provider Email, dan akun proyek Anda berfungsi.

RLS dan isolasi dua akun belum diuji karena tabel serta kebijakan database berada pada tahap 2. Fitur entri harian, rekap, CSV, dan deployment juga belum diimplementasikan.

## Pembaruan tampilan berdasarkan idle.space

- Referensi diperiksa langsung melalui Chromium pada 17 November 2026.
- `npm run build` berhasil setelah pembaruan.
- Preview produksi diperiksa pada lebar 320, 390, 768, 820, 900, 1280, dan 1440 piksel: tidak ada overflow horizontal; font lokal berhasil dimuat; tautan Akses akun memindahkan fokus ke kartu akun.
- Tangkapan layar desktop dan ponsel diperiksa untuk layar konfigurasi dan login.
- Pengujian browser dengan respons Auth simulasi diulang: form kosong, kredensial salah, email belum dikonfirmasi, kegagalan jaringan, login, pemulihan sesi, dan logout lulus tanpa exception JavaScript.
- Logika Supabase Auth tidak diubah. Pengujian proyek Supabase nyata masih tertunda sampai konfigurasi tersedia.

## Tahap 2 — database dan RLS

Pengguna melaporkan login Supabase nyata berhasil sebelum pekerjaan tahap 2. Laporan tersebut membuktikan login pada konfigurasi lokal pengguna; bukan hasil pengujian database dari lingkungan Codex.

- Ditambahkan migrasi `supabase/migrations/202611170001_create_entries.sql`, tabel `entries`, indeks per pemilik/tanggal, empat kebijakan RLS, dan pembatasan hak akses role aplikasi.
- `npm run test:db` lulus dengan PostgreSQL 17 dalam container sementara. Migrasi asli dijalankan; schema `auth` minimal hanya disiapkan di database uji untuk meniru `auth.uid()` dan referensi pengguna.
- Query dijalankan sebagai role non-superuser: A/B dapat membaca, membuat, mengubah, dan menghapus milik sendiri; akses baca/update/delete lintas akun tidak menghasilkan baris; insert atas nama orang lain, upsert lintas akun, dan pergantian pemilik ditolak.
- Pengguna anonim ditolak untuk SELECT/INSERT/UPDATE/DELETE; role terautentikasi tanpa identitas tidak memperoleh akses.
- Constraint bidang wajib, protokol URL, bukti opsional, default pemilik, dan beberapa entri pada tanggal sama lulus.
- `npm run build` lulus; kode dan desain frontend tahap 1 tidak diubah.
- `.env.local` dan `.env.rls.local` diabaikan Git. Contoh konfigurasi hanya berisi placeholder; skrip pengujian tidak masuk ke bundle frontend.
- Skrip `npm run test:rls:api` disiapkan untuk pengujian lewat API dengan dua akun Supabase nyata, termasuk upsert, serta pembersihan data sintetis. Pemeriksaan sintaks JavaScript lulus; eksekusi terhadap proyek Supabase nyata **belum dilakukan**.

Migrasi **belum diterapkan ke proyek Supabase pengguna** karena lingkungan ini tidak memiliki akses administrator database. Kunci publik frontend tidak dapat menjalankan DDL/migrasi. Jalankan SQL migrasi melalui SQL Editor, kemudian uji API dua akun mengikuti `supabase/README.md`. Keberhasilan tes PostgreSQL lokal belum membuktikan konfigurasi Auth/PostgREST proyek Supabase nyata. Jangan anggap tahap verifikasi database live selesai sebelum uji API lulus.
