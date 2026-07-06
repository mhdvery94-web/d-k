# Dapur Kemas Frontend

Frontend Dapur Kemas memakai React + Vite dengan dua entry page: pembeli dan admin. Semua data operasional diambil dari backend API dan database, bukan `localStorage`.

## Halaman

- `index.html`: halaman pembeli.
- `admin.html`: panel admin.

## Fitur Pembeli

- Menampilkan menu aktif dari API.
- Keranjang belanja dan review order.
- Form nomor HP dengan prefix negara dan format nomor readable.
- Lookup alamat via kode pos, kelurahan, kecamatan, kota/kabupaten, provinsi.
- Pembayaran Midtrans Snap sandbox melalui backend.
- Tracking order via nomor HP.
- Struk pembeli bisa dibagikan atau disimpan.

## Fitur Admin

- Login admin via backend API.
- Kelola menu dan kategori dari database.
- Lihat dan update status pesanan.
- Checklist penjual untuk picking dan packing.
- Laporan penjualan dari endpoint backend.
- OTP reset password/lupa username via backend.

## Struktur

```text
fe/
  index.html
  admin.html
  vite.config.js
  public/
    icon.png
    manifest.json
    sw.js
  src/
    main.jsx
    admin.jsx
    data.js
    styles.css
```

## Development

```bash
npm install
npm run dev
```

Vite dev server mem-proxy `/api` ke backend lokal. Frontend production tetap memakai relative path `/api`, sehingga deploy di balik Nginx tidak hardcode host backend.

## Production Build

```bash
npm run build
```

Hasil build ada di `fe/dist` dan diserve oleh Nginx.

## Catatan Keamanan

- Jangan simpan kredensial di frontend.
- Jangan hardcode host backend production di source frontend.
- Payment key, credential email, credential database, dan token secret hanya boleh ada di backend/server.
