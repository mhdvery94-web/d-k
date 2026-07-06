# Desain Sistem Dapur Kemas

Dokumen ini menjelaskan desain arsitektur, alur data, flow pembayaran, flow admin, struktur database, dan saran pengembangan lanjutan untuk aplikasi Dapur Kemas.

## Tujuan Sistem

Dapur Kemas dibuat untuk memproses pemesanan makanan dari pembeli sampai admin/penjual melakukan pengecekan barang dan update status pengiriman. Sistem harus bisa:

- Menampilkan menu dari database.
- Memvalidasi nomor HP dan alamat pembeli.
- Mengambil alamat otomatis dari kode pos.
- Membuat payment QRIS via Midtrans sandbox.
- Membuat order hanya setelah payment sukses.
- Menyediakan tracking order via nomor HP.
- Menyediakan panel admin untuk menu, kategori, order, checklist, dan laporan.
- Mengirim OTP admin via email sandbox/testing.

## Arsitektur High Level

```text
Pembeli/Admin Browser
        |
        | React + Vite
        v
Frontend fe/
        |
        | HTTP relative /api
        v
Backend be/ Express
        |
        | Prisma ORM
        v
MySQL Database
        |
        +-- Midtrans Sandbox
        +-- Mailtrap SMTP
```

Komponen utama:

- Frontend pembeli: `fe/src/main.jsx`.
- Frontend admin: `fe/src/admin.jsx`.
- Styling global: `fe/src/styles.css`.
- Icon aplikasi: `fe/public/icon.png`.
- Backend entrypoint: `be/app.js`.
- Prisma schema: `be/prisma/schema.prisma`.
- Payment routes: `be/routes/paymentRoutes.js`.
- Order routes: `be/routes/orderRoutes.js`.
- Email service: `be/services/emailService.js`.

## Desain Frontend Pembeli

Komponen utama:

- `Header`: brand dan tombol cek pesanan.
- `CategorySection`: daftar kategori menu.
- `MenuItem`: item menu, harga, stok, tombol tambah.
- `CartReview`: keranjang, form data pengiriman, konfirmasi pembayaran.
- `ReceiptPage`: struk pembeli setelah pembayaran sukses.
- `OrderTrackingPage`: tracking via nomor HP.
- `App`: state menu, cart, page routing ringan.

Flow form pembeli:

1. Input nama.
2. Input nomor HP dengan prefix `+62`.
3. Input kode pos.
4. Pilih kelurahan dari API kode pos.
5. Field kecamatan, kota/kabupaten, provinsi terisi otomatis.
6. Input alamat detail.
7. Konfirmasi pembayaran.

Nomor HP:

- Input user: `+62` + `812-3456-7890`.
- Format DB: `812-3456-7890`.
- Backend menerima variasi `+62`, `62`, `0`, atau nomor terformat.

Struk pembeli:

- Ditampilkan setelah payment sukses.
- Bisa dibagikan via Web Share API.
- Bisa disimpan sebagai `.txt`.

## Desain Frontend Admin

Komponen utama:

- `LoginPage`: login admin.
- `ForgotPasswordModal`: OTP reset password.
- `ForgotUsernameModal`: OTP lupa username.
- `Header`: navigasi admin.
- `SettingsModal`: placeholder pengaturan akun.
- `OrderManager`: list order dan update status.
- `MenuForm`: tambah/edit menu.
- `CategoryForm`: tambah/edit kategori.
- `AdminDashboard`: dashboard, menu management, laporan.

Fitur admin:

- Login JWT.
- Kelola kategori langsung ke database.
- Kelola menu langsung ke database.
- Lihat pesanan.
- Update status pesanan.
- Batalkan pesanan.
- Checklist penjual untuk pengecekan item dua kali.
- Cetak checklist.
- Simpan checklist `.txt`.
- Laporan harian, mingguan, bulanan, dan rentang tanggal.

Checklist penjual:

```text
CHECKLIST PESANAN PENJUAL
No. Pesanan
Pelanggan
Telepon
Alamat
Item dengan checkbox
Cek 1 Picking
Cek 2 Packing
Petugas 1
Petugas 2
Catatan
```

## Desain Backend

Backend memakai Express. `app.js` mendaftarkan route:

- `/api/auth`
- `/api/menus`
- `/api/categories`
- `/api/orders`
- `/api/payments`
- `/api/reports`
- `/api/postal-code`

Middleware:

- CORS sesuai `FRONTEND_URL`.
- JSON body limit `10mb`.
- Static `/uploads`.
- Error handler global.

Runtime:

- Backend membaca `PORT` dari `.env`.
- VPS memakai `PORT=5000` dan `HOST=127.0.0.1`.
- Nginx expose public app di port `8080`, lalu proxy `/api` ke backend lokal.

Cron:

- `startPendingPaymentCron()` berjalan tiap menit.
- Mengubah `pending_payments.status` dari `pending` ke `expired` jika melewati `expires_at`.

## Desain Database

Database MySQL menggunakan tabel snake_case agar mudah dibaca. Prisma mapping menjaga code tetap camelCase.

### User

Tabel: `users`

Tujuan: akun admin.

Field penting:

- `username`
- `email`
- `password_hash`
- `role`

### Category

Tabel: `categories`

Tujuan: kategori menu.

Relasi: satu category punya banyak menu.

### Menu

Tabel: `menus`

Tujuan: katalog makanan/minuman.

Field penting:

- `category_id`
- `name`
- `price`
- `discount_percent`
- `stock`
- `image_url`
- `is_active`

### PendingPayment

Tabel: `pending_payments`

Tujuan: menyimpan pembayaran yang belum selesai.

Field penting:

- `session_token`
- `customer_name`
- `customer_phone`
- `customer_address`
- `items` JSON
- `subtotal`
- `service_fee`
- `total`
- `midtrans_transaction_id`
- `payment_url`
- `status`
- `expires_at`

Status:

- `pending`
- `paid`
- `expired`
- `failed`

### Order

Tabel: `orders`

Tujuan: order final setelah payment sukses.

Field penting:

- `order_number`
- `pending_payment_id`
- `customer_name`
- `customer_phone`
- `payment_status`
- `order_status`
- `paid_at`

Status order:

- `confirmed`
- `preparing`
- `packaging`
- `delivering`
- `completed`
- `cancelled`

### OrderItem

Tabel: `order_items`

Tujuan: detail item dalam order.

Field penting:

- `order_id`
- `menu_id`
- `menu_name`
- `quantity`
- `price`
- `subtotal`

### OrderSequence

Tabel: `order_sequences`

Tujuan: membuat nomor order harian.

Format order saat ini:

```text
YYYYMMDD-001-X
```

## Flow Payment

```text
Pembeli submit checkout
  -> POST /api/payments/create
  -> validasi order dan nomor HP
  -> cek stok menu
  -> hitung subtotal + service fee
  -> create pending_payments
  -> request Midtrans Snap token
  -> frontend buka Snap popup
  -> Midtrans webhook settlement
  -> create orders + order_items
  -> decrement stock
  -> mark pending_payment paid
```

Prinsip penting:

- Order belum dibuat saat payment baru dibuat.
- Order dibuat hanya saat settlement/capture.
- Pending payment expired setelah 15 menit.
- Webhook Midtrans harus valid signature.

## Flow Tracking Order

```text
Pembeli input nomor HP
  -> frontend validasi dan format nomor
  -> GET /api/orders/track-by-phone/:phone
  -> backend normalize phone
  -> query orders by customer_phone
  -> tampil status stepper
```

## Flow Admin Order

```text
Admin login
  -> GET /api/orders
  -> lihat order masuk
  -> buka detail order
  -> cetak/simpan checklist
  -> update status
```

Transisi status valid:

```text
confirmed -> preparing -> packaging -> delivering -> completed
confirmed/preparing/packaging/delivering -> cancelled
```

Jika cancelled, stok dikembalikan.

## Flow OTP

```text
Admin klik lupa password/username
  -> POST /api/auth/forgot-password atau forgot-username
  -> backend generate OTP
  -> OTP di-hash bcrypt
  -> OTP disimpan di tabel otp_tokens
  -> email dikirim via Mailtrap SMTP
  -> admin input OTP
  -> backend validasi hash OTP, expiry, used, dan attempts
```

Catatan production:

- Tambah rate limit per email/IP.
- Ganti Mailtrap sandbox ke provider email production seperti Brevo, Resend, SendGrid, Mailgun, atau SMTP domain sendiri.

## Deployment VPS Design

Rekomendasi production:

```text
Nginx
  -> /          serve fe/dist
  -> /api      proxy http://127.0.0.1:5000

PM2
  -> be/app.js

MySQL
  -> dapur_kemas_db
```

Environment VPS:

- `.env` backend disimpan di server, bukan public directory.
- Frontend build tidak menyimpan secret backend.
- Midtrans production key hanya di backend.
- Mail provider production pakai Brevo/Resend/SMTP domain.
- Database backup `.sql` tidak di-push ke GitHub public.
- Backend dijalankan via PM2 dengan `pm2 start npm --name d-k-api -- start --update-env`.

## Review Masalah Tersisa

1. Checklist penjual belum tersimpan permanen di database dari UI.
2. Upload gambar admin masih perlu QA endpoint upload.
3. Payment QRIS sandbox perlu webhook publik VPS/ngrok untuk settlement asli.
4. Report admin sudah query API, tetapi belum ada export file PDF asli.
5. Tidak ada automated test.
6. `.env.example` belum tersedia.
7. Data QA/pending payment perlu dibersihkan sebelum production.
8. Logging masih memakai `console.log`/`console.error`; production sebaiknya pakai logger.
9. Backend belum punya rate limit auth/payment.

## Roadmap Lanjutan

Prioritas tinggi:

1. Buat `.env.example`.
2. Tambah rate limit OTP dan login.
3. Setup upload gambar menu ke backend.
4. Setup webhook Midtrans sandbox ke VPS.
5. Test full payment settlement.
6. Simpan checklist penjual ke database.

Prioritas sedang:

1. Tambah dashboard statistik dari endpoint backend khusus.
2. Tambah pagination order dan menu.
3. Tambah filter order by date/status/search di backend lebih lengkap.
4. Tambah export laporan CSV/PDF.
5. Tambah halaman pending payment pembeli.

Prioritas production:

1. VPS deploy dengan Nginx + PM2.
2. HTTPS via Let's Encrypt.
3. Backup database harian.
4. Monitoring error dan uptime.
5. Midtrans production switch.
6. Email provider production.
