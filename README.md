# Dapur Kemas

Dapur Kemas adalah aplikasi pemesanan makanan berbasis web. Project ini terdiri dari backend Express + Prisma + MySQL dan frontend React + Vite. Aplikasi mendukung katalog menu, checkout pembeli, pembayaran Midtrans QRIS sandbox, pelacakan order via nomor HP, panel admin, laporan penjualan, OTP admin via email, dan checklist pesanan untuk penjual.

## Status Terakhir

- Frontend pembeli mengambil menu dari database lewat API.
- Frontend admin mengelola menu dan kategori lewat database, bukan `localStorage`.
- Order dibuat hanya setelah pembayaran sukses/settlement.
- Pending payment tersimpan di database dan otomatis expired setelah 15 menit.
- Nomor HP dinormalisasi menjadi format mudah dibaca, contoh `812-3456-7890`.
- Alamat memakai data kode pos dari tabel `postal_code_data` dan `province_data`.
- OTP memakai Mailtrap sandbox untuk testing.
- Payment masih memakai Midtrans sandbox.

## Struktur Project

```text
react-dapur-kemas/
  be/
    app.js
    package.json
    prisma/
      schema.prisma
      seed.js
      migrations/
    routes/
      authRoutes.js
      categoryRoutes.js
      menuRoutes.js
      orderRoutes.js
      paymentRoutes.js
      postalCodeRoutes.js
      reportRoutes.js
    controllers/
      authController.js
      categoryController.js
      menuController.js
      postalCodeController.js
    models/
      categoryModel.js
      menuModel.js
      orderItemModel.js
      orderModel.js
      orderSequenceModel.js
      pendingPaymentModel.js
    services/
      emailService.js
    utils/
      orderNumber.js
      prisma.js
      response.js
      validators.js
    uploads/
  fe/
    index.html
    admin.html
    package.json
    vite.config.js
    src/
      main.jsx
      admin.jsx
      data.js
      styles.css
    public/
      icon.png
```

## Teknologi

- Backend: Node.js, Express 5, Prisma ORM, MySQL, JWT, bcrypt, nodemailer, Midtrans SDK, node-cron, multer.
- Frontend: React 18, Vite, CSS custom. Browser API memakai relative path `/api`.
- Database: MySQL.
- Payment: Midtrans Snap sandbox, QRIS only.
- Email testing: Mailtrap SMTP sandbox.

## Setup Backend

Masuk folder backend:

```bash
cd be
npm install
```

Siapkan konfigurasi runtime di server atau mesin lokal sesuai environment masing-masing. Jangan simpan kredensial database, email, payment, atau JWT di repository public.

Jalankan migration dan generate client:

```bash
npx prisma generate
npx prisma migrate deploy
```

Seed admin dan sample menu:

```bash
npx prisma db seed
```

Jalankan backend:

```bash
npm run dev
```

Health check:

```text
GET http://127.0.0.1:5000/health
```

## Setup Frontend

Masuk folder frontend:

```bash
cd fe
npm install
npm run dev
```

Halaman pembeli:

```text
http://localhost:5173/
```

Halaman admin:

```text
http://localhost:5173/admin.html
```

Build frontend:

```bash
npm run build
```

## Akun Admin Default

Akun admin dibuat melalui seed atau data import database. Ganti kredensial awal sebelum production.

## Database

Database memakai nama tabel snake_case agar mudah dibaca langsung di MySQL. Prisma memakai camelCase di code dengan mapping `@map()` dan `@@map()`.

Tabel utama:

- `users`: akun admin.
- `categories`: kategori menu.
- `menus`: data menu dan stok.
- `pending_payments`: pembayaran yang belum settlement.
- `orders`: order paid yang masuk setelah pembayaran sukses.
- `order_items`: item dalam order.
- `order_sequences`: generator nomor order harian.
- `postal_code_data`: data kode pos.
- `province_data`: data provinsi.

Field alamat penting:

- `customer_postal_code`
- `customer_kelurahan`
- `customer_kecamatan`
- `customer_kota`
- `customer_provinsi`

## API Backend

Base URL lokal:

```text
http://127.0.0.1:5000/api
```

### Auth

- `POST /auth/login`: login admin.
- `POST /auth/logout`: logout stateless.
- `GET /auth/me`: profil admin, butuh token.
- `POST /auth/forgot-password`: kirim OTP reset password.
- `POST /auth/reset-password`: verifikasi OTP dan reset password.
- `POST /auth/forgot-username`: kirim OTP lupa username.
- `POST /auth/get-username`: verifikasi OTP dan return username.

### Menu

- `GET /menus`: list menu aktif.
- `GET /menus/:id`: detail menu.
- `POST /menus`: tambah menu, admin only.
- `PUT /menus/:id`: update menu, admin only.
- `DELETE /menus/:id`: hapus menu, admin only.
- `POST /menus/upload`: upload gambar menu, admin only.

### Category

- `GET /categories`: list kategori aktif.
- `GET /categories/:id`: detail kategori.
- `POST /categories`: tambah kategori, admin only.
- `PUT /categories/:id`: update kategori, admin only.
- `DELETE /categories/:id`: hapus kategori, admin only.

### Payment

- `POST /payments/create`: buat pending payment dan Snap token.
- `POST /payments/webhook`: webhook Midtrans.
- `GET /payments/status/:token`: cek status payment.

### Order

- `GET /orders/track-by-phone/:phone`: tracking order pembeli via nomor HP.
- `GET /orders/track/:orderNumber`: tracking order via nomor order.
- `GET /orders`: list order admin.
- `GET /orders/:id`: detail order admin.
- `PUT /orders/:id/status`: update status order admin.

Status order:

- `confirmed`
- `preparing`
- `packaging`
- `delivering`
- `completed`
- `cancelled`

### Postal Code

- `GET /postal-code/:code`: lookup kode pos 5 digit.

### Report

- `GET /reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: laporan sales admin.
- `GET /reports/daily`: alias report.
- `GET /reports/weekly`: alias report.
- `GET /reports/monthly`: alias report.

## Flow Pembeli

1. Pembeli buka halaman utama.
2. Menu dimuat dari `GET /api/menus`.
3. Pembeli tambah item ke keranjang.
4. Pembeli isi nama, nomor HP, kode pos, kelurahan, dan alamat detail.
5. Kode pos otomatis mengambil kecamatan, kota/kabupaten, dan provinsi.
6. Pembeli klik konfirmasi pembayaran.
7. Frontend call `POST /api/payments/create`.
8. Backend membuat row `pending_payments` dengan expiry 15 menit.
9. Backend meminta Snap token ke Midtrans sandbox.
10. Frontend membuka Snap popup.
11. Jika payment settlement, webhook membuat `orders` dan `order_items`.
12. Pembeli bisa cek status via nomor HP.
13. Pembeli mendapat struk dan bisa share/simpan file `.txt`.

## Flow Admin

1. Admin login via `POST /api/auth/login`.
2. Admin mengelola kategori dan menu langsung ke database.
3. Admin melihat pesanan masuk.
4. Admin membuka detail order.
5. Admin memakai checklist penjual untuk cek item dua kali.
6. Admin bisa cetak atau simpan checklist penjual.
7. Admin update status order.
8. Admin melihat laporan berdasarkan harian, mingguan, bulanan, atau rentang tanggal.

## Payment Midtrans Sandbox

Saat ini payment memakai Midtrans Snap sandbox. Untuk test QRIS sandbox penuh, backend perlu URL publik agar webhook Midtrans bisa masuk. Pakai VPS public endpoint atau tunnel:

```bash
ngrok http 5000
```

Set webhook URL di dashboard Midtrans sandbox:

```text
https://<domain-ngrok>/api/payments/webhook
```

Catatan: QRIS sandbox tidak dibayar memakai mobile banking asli. Gunakan simulator sandbox Midtrans sesuai channel yang dipilih.

## OTP Email

Untuk development, project memakai Mailtrap SMTP sandbox. Email OTP masuk ke inbox Mailtrap, bukan email real. OTP disimpan di tabel `otp_tokens` dalam bentuk hash bcrypt, memiliki expiry 15 menit, status `used`, dan attempt counter.

Endpoint OTP:

- `POST /api/auth/forgot-password`
- `POST /api/auth/forgot-username`

Untuk production, ganti Mailtrap dengan Brevo, Resend, SendGrid, Mailgun, atau SMTP domain sendiri.

## Deploy VPS Checklist

1. Install Node.js LTS.
2. Install MySQL.
3. Buat database `dapur_kemas_db`.
4. Upload project tanpa `node_modules` dan tanpa `dist` jika build di server.
5. Isi konfigurasi runtime production di server atau secret manager.
6. Jalankan `npm install` di `be` dan `fe`.
7. Jalankan `npx prisma generate` dan `npx prisma migrate deploy` di `be`.
8. Jalankan seed hanya jika database baru.
9. Build frontend dengan `npm run build` di `fe`.
10. Serve frontend `dist` via Nginx.
11. Jalankan backend via PM2.
12. Set reverse proxy Nginx untuk `/api` ke backend lokal `127.0.0.1:5000`.
13. Set webhook Midtrans ke domain production.
14. Ganti Midtrans ke production jika sudah siap live.

## Perintah QA Cepat

Backend:

```bash
cd be
npx prisma validate
npm run start
```

VPS PM2:

```bash
cd /var/www/html/d-k/be
pm2 start npm --name d-k-api -- start --update-env
pm2 restart d-k-api --update-env
pm2 save
```

Nginx proxy inti:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Frontend:

```bash
cd fe
npm run build
```

Smoke test:

```text
GET /health
GET /api/menus
GET /api/categories
GET /api/postal-code/15560
POST /api/auth/login
GET /api/reports/sales?startDate=2026-01-01&endDate=2026-12-31
```

## Catatan Keamanan

- Jangan commit konfigurasi runtime, kredensial database, kredensial email, atau payment key ke repository public.
- Jangan pakai Mailtrap sandbox untuk production.
- Jangan simpan password SMTP di database.
- Gunakan HTTPS di VPS.
- Restrict CORS ke domain frontend production.
- Rotasi payment key jika pernah tersebar.

## Saran Lanjutan

- Tambah rate limit login dan OTP.
- Tambah audit log admin untuk perubahan status order.
- Tambah penyimpanan checklist penjual ke database.
- Tambah page pending payment untuk pembeli.
- Tambah retry/check payment status otomatis.
- Tambah integrasi upload gambar menu ke backend, bukan base64.
- Tambah test otomatis untuk validator phone, webhook signature, dan status transition.
- Bersihkan data QA/pending payment sebelum production.
