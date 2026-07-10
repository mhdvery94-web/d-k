# Changelog — Dapur Kemas

> Catat perubahan nyata di sini, per tanggal, paling baru di atas.
> Tujuannya: supaya AI agent (dan kamu) bisa lihat histori kerja tanpa scroll ulang chat lama.
> Format tiap task: `- [kategori] deskripsi singkat`
> Kategori: `feat` (fitur baru), `fix` (bugfix), `refactor`, `docs`, `chore` (setup/tooling), `db` (perubahan database — detail lengkap di `database.md`), `wip` (belum selesai, dicatat karena sesi terputus/context penuh — lanjutkan di sesi berikutnya)

---

## 2026-07-10

- [fix] Pembeli - auto-redirect ke receipt setelah payment sukses dengan useCallback untuk stabilisasi state
- [fix] Pembeli - ubah simpan resi dari .txt ke PDF menggunakan jsPDF sesuai desain awal
- [fix] Pembeli - tampilkan foto produk pada ringkasan pesanan dan cegah Snap mengalihkan halaman resi ke finish redirect eksternal setelah pembayaran
- [fix] Pembeli - cegah callback Midtrans mengembalikan halaman receipt ke state pending tanpa sesi dan pertahankan katalog menu saat kembali setelah pembayaran

## 2026-07-09

- [fix] Admin - Tab Pesanan: cetak dan simpan checklist memakai PDF dengan format dokumen seperti laporan
- [fix] Admin - Tab Kelola Menu: upload foto produk lewat `/api/menus/upload` dan tampilkan gambar `/uploads`
- [fix] Admin - Tab Laporan: ganti periode ke combo box harian/mingguan/bulanan/tahunan dan cetak/simpan PDF
- [fix] Admin - Tab Pesanan: ubah simpan checklist dari .txt ke PDF menggunakan jsPDF
- [fix] Admin - Tab Kelola Menu: tambah fitur hapus kategori menu
- [fix] Admin - Tambah tombol hapus di form edit kategori
- [chore] Setup RTK (`rtk init --agent kilocode`) untuk integrasi token-saving di Kilo Code
- [docs] Tambah TODO.md, CHANGELOG.md, database.md, STYLE.md

## 2026-07-07

- [fix] Debug SSE failure di frontend checkout
- [fix] Debug CSP violation

## 2026-07-06

- [docs] README.md dan desain.md difinalisasi

---

<!--
Template entry baru:

## YYYY-MM-DD

- [feat] ...
- [fix] ...
- [db] ... (lihat detail di database.md)
-->
