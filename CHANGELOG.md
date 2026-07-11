# Changelog — Dapur Kemas

> Catat perubahan nyata di sini, per tanggal, paling baru di atas.
> Tujuannya: supaya AI agent (dan kamu) bisa lihat histori kerja tanpa scroll ulang chat lama.
> Format tiap task: `- [kategori] deskripsi singkat`
> Kategori: `feat` (fitur baru), `fix` (bugfix), `refactor`, `docs`, `chore` (setup/tooling), `db` (perubahan database — detail lengkap di `database.md`), `wip` (belum selesai, dicatat karena sesi terputus/context penuh — lanjutkan di sesi berikutnya)

---

## 2026-07-12

- [fix] Admin (fe) - perbaiki header admin yang patah akibat redesain: ubah dari struktur lama `<div className="dk-brand">` (flex, sudah dihapus dari CSS) ke grid 3 kolom `<span className="dk-brand-icon">` + `<div className="dk-brand-title">` + `<div className="dk-header-actions">` agar konsisten dengan header pembeli; tambah `flex-wrap: wrap; justify-content: flex-end` pada `.dk-header-actions`
- [feat] Pembeli (fe) - lanjutan redesain "Teal & Ember": header3 kolom (logo-kiri, judul-tengah, aksi-kanan), footer simetris 50/50 di semua step checkout (cart, info pengiriman, konfirmasi bayar) dengan tombol "Kembali" + "Lanjut/Bayar", dan warna PDF laporan admin diubah dari biru ke teal/warm-beige

## 2026-07-11

- [feat] Pembeli & Admin (fe) - redesain base UI/UX ke identitas "Teal & Ember": ganti palet dari biru ke teal `#2D8B8D` (primer), ember/oranye `#E2571E` untuk badge promo/diskon & highlight, background beige `#F5F5DC` dengan surface cream, dan ubah shape language ke persegi (semua radius token & radius hardcoded jadi 0, kecuali elemen lingkaran fungsional seperti spinner/toggle/step-icon). Diterapkan lewat design token bersama di `styles.css` sehingga ikut ke seluruh halaman pembeli & admin sekaligus; grey struk sengaja dibiarkan netral agar tetap seperti kertas cetak.
- [fix] Pembeli (fe) - hilangkan duplikasi alamat pada struk dengan menampilkan `customerAddress` hanya sampai sebelum kelurahan; lokasi otomatis kelurahan/kecamatan/kota/provinsi/kode pos tetap ditampilkan pada baris terpisah
- [fix] Pembeli (fe) - ganti simpan/share struk dari PDF/PNG berukuran sekitar 7 MB menjadi JPEG kualitas 82% dengan capture scale 2 agar file lebih ringan tanpa mengubah layout; hapus jsPDF dari bundle pembeli
- [fix] Pembeli (fe) - rapikan struk menjadi thermal panjang, sejajarkan tombol Bagikan/Simpan/Status/Ulangi sebagai empat action icon, hilangkan background status LUNAS, dan ganti alert unsupported share pada HTTP dengan modal WhatsApp/Telegram/email/salin/unduh PDF
- [fix] Pembeli (fe) - siapkan artefak struk sebelum tombol share ditekan, prioritaskan file PNG agar kompatibel dengan lebih banyak aplikasi lalu fallback ke PDF/teks, dan gunakan satu layout visual untuk halaman serta PDF sesuai `receipt-desain.md`

## 2026-07-10

- [fix] Pembeli (fe) - struk resi: ganti logo dari teks "DK" ke `public/icon.png` (tambah CSS `.dk-receipt-logo-img`), render struk PDF via html2canvas agar hasil unduh/bagikan tampil seperti struk swalayan (font mesin tik) bukan teks biasa, dan perbaiki tombol Bagikan Resi supaya membagikan file PDF ke aplikasi manapun (Web Share API) dengan fallback unduh + salin teks di desktop
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
