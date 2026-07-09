# Changelog — Dapur Kemas

> Catat perubahan nyata di sini, per tanggal, paling baru di atas.
> Tujuannya: supaya AI agent (dan kamu) bisa lihat histori kerja tanpa scroll ulang chat lama.
> Format tiap task: `- [kategori] deskripsi singkat`
> Kategori: `feat` (fitur baru), `fix` (bugfix), `refactor`, `docs`, `chore` (setup/tooling), `db` (perubahan database — detail lengkap di `database.md`), `wip` (belum selesai, dicatat karena sesi terputus/context penuh — lanjutkan di sesi berikutnya)

---

## 2026-07-09

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