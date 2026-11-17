# Logbook Magang — tahap 1–2

Fondasi React + Vite dan Supabase Auth dengan email/kata sandi, sesuai `HANDOFF_LOGBOOK.md`. Implementasi mencakup layar masuk, pemulihan sesi saat muat ulang, halaman awal yang hanya tampil setelah masuk, serta keluar dari perangkat ini. Tahap 2 menambahkan migrasi tabel entri, kebijakan RLS, pengujian database lokal, dan skrip uji API dua akun. CRUD entri pada antarmuka, rekap, CSV, dan deployment belum dikerjakan.

## Database dan privasi — tahap 2

Ikuti [petunjuk database](supabase/README.md) untuk menjalankan migrasi di Supabase SQL Editor dan menguji akses A/B. File migrasi dan tes tersedia di folder `supabase/`. Build frontend tidak menerapkan migrasi ke Supabase secara otomatis.

## Arah visual

Tampilan mengikuti arah visual [idle.space](https://idle.space/): latar abu-abu terang, judul besar di tengah, navigasi mengambang, kartu membulat, tombol hitam, dan aksen kuning. Ilustrasi catatan serta ikon dibuat untuk Logbook Magang. Tampilan menyesuaikan desktop dan ponsel; tautan akses akun mengarahkan fokus ke kartu akun.

Font Funnel Sans disimpan di `public/fonts/` sehingga tidak memerlukan koneksi ke layanan font eksternal saat aplikasi dibuka. Font berlisensi SIL Open Font License; lisensi lengkap tersedia di `public/fonts/OFL.txt`.

## Menjalankan secara lokal

Gunakan Node.js 22.12+ (Node 24 juga didukung) dan npm.

```bash
git clone https://github.com/muhammadghanim/logbook-magang.git
cd logbook-magang
npm ci
cp .env.example .env.local
# Isi .env.local sesuai petunjuk berikut.
npm run dev
```

Buka `http://localhost:5173`. Jika port terpakai, gunakan alamat yang dicetak Vite. Tanpa konfigurasi, aplikasi menampilkan petunjuk konfigurasi dan tidak mengirim permintaan Auth.

Perintah dijalankan di terminal, termasuk terminal bawaan VS Code. Jika `cp` tidak tersedia di Windows, salin `.env.example` melalui Explorer VS Code lalu beri nama `.env.local`.

## Mengisi Supabase

1. Buka proyek Supabase milik Anda. Ambil **Project URL** dan **publishable key** dari Project Settings > API / API Keys (atau dialog Connect).
2. Isi `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://ID_PROYEK_ANDA.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_KUNCI_PUBLIK_ANDA
   ```

   Legacy `anon` key juga diterima pada variabel kunci yang sama. Jangan memakai `service_role` atau `sb_secret_`. Variabel `VITE_*` masuk ke bundle browser dan harus berupa nilai publik. `.env.local` diabaikan Git; `.env.example` hanya memuat placeholder.
3. Di Authentication > Sign In / Providers, pastikan Email aktif. Tahap ini hanya menyediakan login; pendaftaran dan reset kata sandi belum termasuk.
4. Buat akun uji dengan email/kata sandi melalui Authentication > Users > Add user. Pastikan akun sudah dikonfirmasi. Gunakan data sintetis dan kata sandi yang tidak digunakan di layanan lain.
5. Mulai ulang `npm run dev` setiap kali mengubah `.env.local`. Untuk produksi, jalankan ulang build setelah mengubah variabel.

Sesi dikelola Supabase JS di browser, termasuk refresh token otomatis. Halaman awal disembunyikan sampai pemeriksaan sesi selesai. Proteksi UI ini bukan pengganti kebijakan database: terapkan migrasi RLS tahap 2 dan jalankan pengujian dua akun sebelum memakai data kegiatan nyata.

## Build produksi

```bash
npm run build
npm run preview
```

Hasil build berada di `dist/`. Preview biasanya di `http://localhost:4173`. Ini belum dipublikasikan ke Vercel.

## Pengujian login setelah konfigurasi tersedia

- Akun benar: masuk dan tampilkan email akun pada halaman awal.
- Muat ulang halaman: sesi tetap tersimpan, tidak menampilkan halaman awal sebelum sesi diperiksa.
- Kata sandi salah: tampilkan pesan kesalahan; halaman awal tidak terbuka.
- Akun belum dikonfirmasi: tampilkan arahan konfirmasi email.
- Koneksi terputus: tampilkan kegagalan yang dapat dicoba lagi; tombol kembali aktif.
- Keluar: kembali ke formulir masuk. Muat ulang dan pastikan tetap keluar.
- Keluar di tab lain dan sesi kedaluwarsa: pastikan UI mengikuti perubahan sesi dan refresh token berjalan.

Hasil pemeriksaan lokal dicatat di `VERIFICATION.md`. Keberhasilan build tidak membuktikan koneksi atau login ke proyek Supabase nyata.
