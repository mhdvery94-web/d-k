# Dapur Kemas - Aplikasi Pemesanan Makanan

Sistem pemesanan makanan berbasis web dengan dua halaman terpisah: **Customer** dan **Admin**. Dibangun menggunakan React + Vite dengan desain mobile-first dan tema profesional putih-biru.

## 🚀 Fitur Utama

### Halaman Customer (`index.html`)
- **Daftar Menu** - Menampilkan semua menu dengan foto, harga, dan deskripsi
- **Kategori** - Menu dikelompokkan (Makanan, Minuman, Snack) dengan accordion
- **Sistem Diskon** - Badge "Promo X%" untuk menu yang sedang diskon
- **Stock Management** - Tombol "Tambah" disabled saat stock habis
- **Keranjang Belanja** - Tambah/kurang item dengan stepper
- **Catatan Pesanan** - Input catatan per item (misal: "tidak pedas")
- **Checkout** - Review pesanan dengan subtotal, biaya layanan, dan total
- **Pembayaran QRIS** - Placeholder untuk integrasi payment gateway
- **Real-time Sync** - Menu otomatis update saat admin mengubah data
- **Responsive** - Tampilan optimal di mobile dan desktop

### Halaman Admin (`admin.html`)
- **Login System** - Autentikasi dengan username/password (default: admin/admin123)
- **Dashboard** - Statistik total pesanan, pendapatan, item terjual
- **CRUD Menu** - Tambah, edit, hapus menu dengan:
  - Upload foto atau pilih dari galeri
  - Toggle diskon dengan persentase
  - Input stock
  - Pilih kategori
- **Manajemen Kategori** - Tambah/edit kategori dengan icon
- **Laporan** - Filter harian/mingguan/bulanan
- **Pencarian Order** - Cari berdasarkan nomor pesanan
- **Export PDF** - Download laporan dalam format PDF
- **Cetak Laporan** - Print dengan font mesin tik profesional
- **Ubah Password** - Ganti password admin
- **Logout** - Keluar dari sesi admin

## 📁 Struktur Proyek

```
react-dapur-kemas/
├── index.html              # Entry point customer
├── admin.html              # Entry point admin
├── vite.config.js          # Multi-page configuration
├── package.json
└── src/
    ├── main.jsx            # Halaman customer
    ├── admin.jsx           # Halaman admin
    ├── data.js             # Data menu, helpers, utilities
    ├── styles.css          # Global styles
    └── assets/
        └── icon.png        # Logo aplikasi
```

## 🛠️ Teknologi

- **React 18** - UI library
- **Vite 5** - Build tool dengan multi-page support
- **LocalStorage** - Penyimpanan data (menu, pesanan, credentials)
- **BroadcastChannel API** - Real-time sync antar halaman
- **Canvas API** - Resize gambar upload
- **CSS Custom Properties** - Design system

## 📦 Instalasi & Menjalankan

### Development

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Akses:
- Customer: `http://localhost:5173/`
- Admin: `http://localhost:5173/admin.html`

### Production

```bash
# Build untuk production
npm run build

# Preview hasil build
npm run preview
```

## 🔐 Default Credentials

- **Username:** admin
- **Password:** admin123

⚠️ **Penting:** Ganti password default setelah login pertama kali!

## 📊 Data Storage

Data disimpan di **LocalStorage** browser:
- `dk_menus` - Data menu dan kategori
- `dk_orders` - Riwayat pesanan
- `dk_admin_creds` - Credentials admin
- `dk_admin_session` - Session status

⚠️ **Catatan:** LocalStorage terbatas pada browser yang sama. Untuk production, gunakan backend + database.

## 🎨 Design System

- **Primary Color:** Blue (#1D4ED8)
- **Background:** White (#FFFFFF)
- **Text:** Dark Gray (#1E293B)
- **Font Family:** Inter, system-ui
- **Report Font:** Courier New (typewriter style)

## 📱 Responsive Breakpoints

- Mobile: < 480px
- Desktop: ≥ 480px

## 🔄 Data Flow

```
Admin (admin.html)
    ↓ CRUD menu
LocalStorage (dk_menus)
    ↓ BroadcastChannel
Customer (index.html)
    ↓ Auto-reload menu
```

## 🚧 Status Pengembangan

✅ **Selesai:**
- Multi-page architecture
- Admin authentication
- CRUD menu & kategori
- Stock management
- Discount system
- Order system
- Laporan harian/mingguan/bulanan
- PDF export
- Real-time sync
- Image upload
- Responsive design

🔜 **Rencana:**
- Backend API (Node.js/Express)
- Database (MySQL/PostgreSQL)
- Payment gateway integration
- User authentication (customer)
- Order tracking
- Rating & review system

## 📄 Lisensi

MIT License - Bebas digunakan untuk keperluan apapun.

## 👨‍💻 Developer

Dikembangkan untuk Dapur Kemas - Aplikasi Pemesanan Makanan

---

**Versi:** 1.1.0  
**Last Updated:** 2026-07-04
