# TODO — Dapur Kemas

> File ini adalah tracker kerja aktif. Beda dengan `desain.md` (dokumen arsitektur statis),
> file ini WAJIB diupdate setiap kali ada task yang selesai, mulai dikerjakan, atau baru muncul.
>
> Urutan prioritas: **In Progress → Next Up (High) → Next Up (Medium) → Backlog → Blocked**

---

## In Progress

- [ ] _(kosongkan jika tidak ada yang lagi dikerjakan)_

---

## Next Up — Prioritas Tinggi

- [ ] Tambah rate limit login dan OTP
- [ ] Setup webhook Midtrans sandbox ke VPS (butuh domain publik / ngrok)
- [ ] Test full payment settlement end-to-end
- [ ] Simpan checklist penjual ke database (saat ini belum persisten dari UI)

## Next Up — Prioritas Sedang

- [ ] Dashboard statistik dari endpoint backend khusus
- [ ] Pagination order dan menu
- [ ] Filter order by date/status/search di backend (lebih lengkap)
- [ ] Halaman pending payment untuk pembeli

## Backlog / Prioritas Produksi

- [ ] VPS deploy dengan Nginx + PM2
- [ ] HTTPS via Let's Encrypt
- [ ] Backup database harian
- [ ] Monitoring error dan uptime
- [ ] Midtrans production switch
- [ ] Email provider production (ganti Mailtrap → Brevo/Resend/SendGrid/Mailgun/SMTP sendiri)
- [ ] Tambah audit log admin untuk perubahan status order
- [ ] Tambah test otomatis (validator phone, webhook signature, status transition)
- [ ] Bersihkan data QA/pending payment sebelum production
- [ ] Ganti `console.log`/`console.error` dengan logger proper

## Blocked / Perlu Keputusan

- [ ] _(isi kalau ada task yang nunggu keputusan/input dari kamu)_

---

## Done

- [x] Fix Pembeli - tampilkan hanya alamat detail pada struk tanpa mengulang lokasi hasil kode pos - 2026-07-11
- [x] Fix Pembeli - ganti unduhan dan file share struk dari PDF/PNG besar menjadi JPEG terkompresi - 2026-07-11
- [x] Fix Pembeli - 3 bug minor struk: tombol ikon sejajar, status LUNAS polos, dan modal fallback share untuk HTTP - 2026-07-11
- [x] Fix Pembeli - share struk lintas aplikasi, PDF visual, dan layout sesuai `receipt-desain.md` - 2026-07-11
- [x] Fix Pembeli - struk resi: logo icon.png, PDF struk profesional (html2canvas), bagikan resi ke semua aplikasi - 2026-07-10
- [x] Fix Pembeli - auto-redirect ke receipt setelah payment sukses dengan useCallback - 2026-07-10
- [x] Fix Pembeli - ubah simpan resi dari .txt ke PDF menggunakan jsPDF - 2026-07-10
- [x] Fix Pembeli - tampilkan foto menu di ringkasan pesanan dan pertahankan halaman resi setelah pembayaran - 2026-07-10
- [x] Fix Pembeli - katalog menu tetap tampil setelah pembayaran selesai - 2026-07-10
- [x] Fix Admin - Tab Pesanan: samakan format cetak/simpan checklist ke PDF laporan - 2026-07-09
- [x] Fix Admin - Tab Kelola Menu: upload foto produk sendiri lewat backend - 2026-07-09
- [x] Fix Admin - Tab Laporan: periode combo box harian/mingguan/bulanan/tahunan dan cetak/simpan PDF - 2026-07-09

- [x] Fix Admin - Tab Pesanan: ubah simpan checklist dari .txt ke PDF — 2026-07-09
- [x] Fix Admin - Tab Kelola Menu: tambah fitur hapus kategori menu — 2026-07-09
- [x] Normalisasi nomor HP ke format `812-3456-7890`
- [x] Integrasi kode pos → kelurahan/kecamatan/kota/provinsi otomatis
- [x] OTP admin via Mailtrap sandbox
- [x] Setup RTK untuk Kilo Code di project ini — 2026-07-09

---

## Cara pakai file ini (untuk AI agent)

1. Baca file ini di awal sesi sebelum mulai kerja.
2. Jangan mengerjakan ulang task yang sudah ada di **Done**, kecuali diminta eksplisit.
3. Setelah menyelesaikan task: pindahkan ke **Done** + tambahkan tanggal, dan catat di `CHANGELOG.md`.
4. Kalau menemukan bug/kebutuhan baru saat kerja, tambahkan ke bagian yang sesuai — jangan cuma disebut di chat lalu hilang.
