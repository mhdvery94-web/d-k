Sebelum mulai, baca dulu `TODO.md`, `CHANGELOG.md`, `STYLE.md`, dan `SAFEGUARDS.md` di root project
supaya kamu paham konvensi dan batasan kerja di project ini. Setelah itu, tolong perbaiki bug-bug
berikut. Untuk tiap bug: cari dulu root cause-nya di code, jelaskan singkat penyebabnya ke saya
sebelum fix (kecuali kalau penyebabnya jelas sepele), baru perbaiki. Tes dulu di local sampai
benar-benar berfungsi sebelum bilang selesai.

Catatan: schema database production sudah saya cek manual (lihat detail di Bug 2 dan Bug 4 di bawah),
jadi jangan asumsikan kolom/tabel tertentu belum ada tanpa cek dulu ke `be/prisma/schema.prisma`.

## Bug 1 — Gambar menu inkonsisten & flow setelah pembayaran bermasalah (sisi pembeli)

Ini gabungan beberapa gejala yang kemungkinan berhubungan satu sama lain di flow yang sama
(checkout → payment → post-payment), jadi investigasi sekaligus, jangan fix satu-satu terpisah
tanpa lihat gambaran penuh:

**1a. Gambar menu jadi avatar huruf di modal "Pesanan Kamu" (checkout)**
Saat pembeli buka ringkasan pesanan sebelum checkout, tiap item menu ditampilkan sebagai
avatar inisial huruf (misal "A" untuk Ayam Geprek, "T" untuk test1), BUKAN foto menu aslinya —
padahal di halaman katalog utama foto menu tampil normal. Ini kemungkinan komponen ringkasan
order (`CartReview` atau sejenisnya) punya fallback ke avatar huruf yang ke-trigger terus,
padahal `image_url` menu itu valid. Cek kenapa fallback ini dipakai padahal harusnya render
`<img>` biasa.

**1b. Gambar "muncul lagi" setelah konfirmasi & bayar**
Setelah pembeli konfirmasi dan bayar, gambar menu balik normal muncul (kemungkinan di halaman
struk/receipt). Ini nunjukin `image_url` sebenarnya valid dan bisa dirender — masalahnya
spesifik di komponen ringkasan checkout (1a) yang salah render, bukan masalah data.

**1c. Status pembayaran tidak otomatis update — harus klik "Cek Status" manual**
Setelah pembeli selesai bayar (settlement di Midtrans), status order/payment TIDAK otomatis
berubah di UI — pembeli harus klik tombol "Cek Status" manual dulu baru statusnya update.
Seharusnya ini otomatis (biasanya lewat polling berkala atau SSE/webhook yang push update ke
frontend). Cek:
- Apakah webhook `POST /api/payments/webhook` benar-benar diterima dan diproses dengan benar
  (cek log backend saat payment settlement terjadi)
- Apakah frontend ada mekanisme polling/SSE yang seharusnya auto-refresh status, dan kenapa itu
  tidak jalan (mengingat project ini sebelumnya pernah ada isu SSE failure — cek apakah ini
  regresi dari isu yang sama)
- Tombol "Cek Status" manual boleh tetap ada sebagai fallback, tapi auto-update harus jadi
  perilaku utama

**1d. Daftar menu jadi kosong total setelah pembayaran selesai**
Ini yang paling serius: setelah proses bayar selesai, pembeli kembali ke halaman utama tapi
daftar menu (katalog) jadi KOSONG TOTAL — cuma header aplikasi yang tampil, tidak ada menu sama
sekali (bukan loading state, benar-benar kosong). Ini kemungkinan bug di state management
frontend (React state/Zustand store) yang ke-reset atau ke-corrupt setelah flow payment selesai,
atau ada error saat fetch ulang menu yang gagal silent tanpa fallback/error message. Cek:
- Console browser untuk error JS setelah payment selesai
- State management menu (kemungkinan di `App` atau store terpisah) — apakah ada logic yang
  secara tidak sengaja clear/reset state menu bareng dengan clear cart setelah payment sukses
- Apakah perlu re-fetch `GET /api/menus` setelah kembali ke halaman utama, dan kenapa itu
  tidak terjadi atau gagal

## Bug 2 — Upload gambar menu (admin) gagal dengan error JSON parse

Saat admin upload gambar menu baru, muncul error eksplisit di UI:
```
Unexpected token '<', "<html> <h"... is not valid JSON
```
Ini error diagnostik yang jelas: frontend expect response JSON dari endpoint upload, tapi yang
diterima balik adalah **HTML** (bukan JSON) — ciri khas ini biasanya dari:
- Response 404 (endpoint upload salah path / tidak match antara frontend dan backend route)
- Response 500 dengan default HTML error page dari Express (bukan JSON error handler)
- Nginx mengembalikan halaman error HTML-nya sendiri (misal request kena limit body size, atau
  proxy path salah, atau endpoint upload tidak ter-cover oleh proxy `/api/` di Nginx)

Catatan: kolom `menus.image_url` (varchar 500) sudah ada di database, jadi ini BUKAN masalah
schema — murni masalah di endpoint/routing/handling upload.

Langkah investigasi:
1. Cek exact request URL yang dipanggil frontend saat upload (network tab / cek kode frontend)
   dan bandingkan persis dengan route yang terdaftar di `be/routes/menuRoutes.js`
2. Cek response asli dari request itu (bukan cuma pesan error di UI) — apakah statusnya 404,
   500, atau lainnya, dan apa isi HTML yang dibalikin (itu petunjuk sumber errornya)
3. Cek konfigurasi `multer` — destination folder, field name yang match dengan form frontend,
   ukuran file max, dan static serving untuk folder `be/uploads/`
4. Cek konfigurasi Nginx production — pastikan endpoint upload ter-cover proxy `/api/` dengan
   benar dan tidak ada body size limit yang kekecilan buat file gambar
5. Cek apakah masalah ini SAMA di local (dev) atau CUMA terjadi di production — ini penting
   buat isolasi apakah penyebabnya kode atau konfigurasi server (Nginx/env production)

## Bug 3 — CRUD kategori menu tidak berfungsi

Tambah kategori makanan baru tidak berhasil — sepertinya CRUD kategori belum benar-benar terhubung.
- Cek `CategoryForm` di frontend admin, apakah request-nya benar-benar dikirim ke
  `POST /api/categories`
- Cek `categoryController.js` dan `categoryRoutes.js` di backend — pastikan create/update/delete
  benar-benar berfungsi dan ada validasi + response yang sesuai
- Test manual: create, edit, delete kategori, pastikan semuanya reflect ke database dan ke UI

## Bug 4 — Checklist pesanan penjual: centang tidak tersimpan, hasil cetak kosong

Konfirmasi dari hasil cetak PDF checklist yang saya lihat langsung: kolom "Cek" untuk tiap item,
"Cek 1 - Picking lengkap", "Cek 2 - Packing lengkap" semuanya tampil KOSONG/tidak tercentang di
hasil cetak, dan field "Petugas 1" / "Petugas 2" juga kosong — padahal admin sudah mencentang di
UI sebelumnya. Ini konfirmasi: centang yang dilakukan admin di UI TIDAK tersimpan ke backend sama
sekali, jadi PDF selalu generate dari data kosong/default.

PENTING — investigasi dulu sebelum bikin perubahan schema, karena tabel `checklist_items` SUDAH ADA
di database dengan struktur berikut (satu baris per item pesanan):
```
id, order_id, menu_id, menu_name, quantity, checked, checked_at, checked_by, notes, created_at, updated_at
```

Masalahnya: struktur ini cuma mendukung **1x check per item** (`checked` boolean tunggal), sedangkan
desain checklist (dan hasil cetak PDF yang sudah ada formatnya) minta:
- **2 tahap cek per item**: "Cek 1 Picking" dan "Cek 2 Packing" (dua checkbox terpisah, bukan satu)
- **2 nama petugas di level pesanan** (bukan per item): "Petugas 1" dan "Petugas 2"

Langkah yang perlu dilakukan:
1. Cek dulu kode backend (`be/controllers`, `be/models`) dan frontend (`OrderManager` atau komponen
   checklist) — apakah endpoint untuk update checklist sudah ada tapi belum dipanggil dari UI
   (kemungkinan besar ini kasusnya, karena template PDF-nya sudah lengkap dengan field yang benar,
   cuma datanya kosong), atau memang endpoint-nya belum ada sama sekali
2. Kalau struktur `checklist_items` saat ini memang tidak cukup untuk 2 tahap cek + 2 nama petugas,
   usulkan dulu ke saya perubahan schema yang diperlukan sebelum membuat migration baru — jangan
   langsung generate migration tanpa dikonfirmasi, karena ini tabel yang sudah ada datanya
3. Setelah schema (kalau perlu diubah) disepakati: tambahkan tombol simpan eksplisit di UI checklist
   yang trigger request simpan status checklist ke backend, dan pastikan requestnya benar-benar
   terkirim (cek network tab, bukan cuma UI keliatan tercentang doang)
4. Pastikan field nama Petugas 1 dan Petugas 2 bisa diisi admin, tersimpan, dan muncul di hasil cetak
5. Setelah fix, test end-to-end: centang di UI → simpan → generate PDF → pastikan PDF menampilkan
   centang dan nama petugas yang benar, bukan cuma cek di database doang

## Bug 5 — Combobox di halaman laporan tidak bisa diklik

Di halaman laporan admin, dropdown/combobox (kemungkinan untuk filter harian/mingguan/bulanan/rentang
tanggal) tidak merespons klik sama sekali.
- Cek komponen dropdown yang dipakai di `AdminDashboard` bagian laporan
- Kemungkinan penyebab: z-index ketutup elemen lain, event handler tidak terpasang, atau ada error
  JS yang bikin komponen itu nggak ke-mount dengan benar — cek console browser untuk error

---

## Prioritas pengerjaan

Kerjakan Bug 1 dulu (sisi pembeli) — terutama poin 1d (menu kosong setelah bayar) karena ini paling
mengganggu pengalaman pembeli riil. Baru lanjut Bug 2 (upload gambar), Bug 4 (checklist), lalu
Bug 3 dan Bug 5 kalau masih ada waktu/belum ke-fix dari sesi sebelumnya.

## Setelah semua bug di atas selesai diperbaiki dan ditest di local

1. Update `TODO.md` — pindahkan item terkait ke bagian Done dengan tanggal hari ini
2. Tambahkan entry di `CHANGELOG.md` dengan kategori `fix`, jelaskan tiap bug yang diperbaiki secara
   ringkas, tandai area yang terdampak (fe/be) sesuai instruksi di `.kilocode/rules/project-context.md`
3. Kalau ada perubahan schema database (misal untuk simpan checklist), catat dulu di `database.md`
   sesuai template yang ada di situ, dan ingatkan saya bahwa migration perlu dijalankan manual di VPS
4. Baru setelah itu commit dengan pesan jelas dan push — tapi tanya saya dulu sebelum push kalau ada
   perubahan yang menyentuh schema database atau flow order/payment
