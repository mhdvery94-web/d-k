# Rencana Implementasi: Struk 35-char + Diskon Order-Level + Ongkir Zona Berbasis Jarak

> **Status**: Perbaikan BESAR (bukan kecil). Menyinggung flow payment/order yang sudah live di production.
> **Pendekatan**: Kerjakan penuh → tes lokal → push ke production (sesuai keputusan user).
> **Desktop flow sensitif**: checkout total calculation, schema migration, generator struk.

## Ringkasan Keputusan (dari user)

1. **Biaya layanan 10% DIHAPUS**, diganti **Biaya Packing** (admin config). Formula total baru:
   `total = subtotal - discountAmount + deliveryFee + packingFee`.
2. **Titik asal toko**: Jl. Jambu No 70D, Kedaung, Sawangan, Depok (store via env `STORE_LAT`/`STORE_LNG`).
3. **Ongkir**: Google Maps Distance Matrix API (jarak rute driving), tier zona, **rate-limit + cache**.
4. **6 struk** semua diselesaikan sekaligus.
5. **Push ke production** setelah lulus tes lokal.

---

## FASE 1 — Database & Schema (Prisma Migration)

### 1.1 Tabel baru: `shipping_zones`
```sql
CREATE TABLE `shipping_zones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_zona` VARCHAR(10) NOT NULL,
  `jarak_min` FLOAT NOT NULL,
  `jarak_max` FLOAT NULL,        -- null = zona terakhir (tak terhingga)
  `tarif` INT NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME DEFAULT NOW(),
  `updatedAt` DATETIME DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY `uniq_kode_zona` (`kode_zona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
Prisma model `ShippingZone` (sesuai spec prompt). Seeder default Z1-Z4.

### 1.2 Tabel baru: `app_settings` (untuk packing fee + koordinat toko + WA admin)
```sql
CREATE TABLE `app_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(50) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  `updatedAt` DATETIME DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
Keys: `packing_fee`, `store_lat`, `store_lng`, `store_address`, `wa_admin`, `discount_percent_default`.
Model Prisma `AppSetting`. Alternatif: pakai env var untuk koordinat (sudah di spec prompt `STORE_LAT`/`STORE_LNG`) + DB untuk packing_fee & wa_admin. **Pilih: env untuk koordinat** (sesuai prompt), **DB untuk packing_fee/wa_admin** (admin bisa edit tanpa redeploy).

### 1.3 Field baru di `pending_payments` & `orders`
```sql
ALTER TABLE `pending_payments`
  ADD COLUMN `discount_percent` INT NOT NULL DEFAULT 0,
  ADD COLUMN `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `packing_fee` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `shipping_zone_code` VARCHAR(10) NULL,
  ADD COLUMN `shipping_distance_km` FLOAT NULL,
  -- service_fee tetap (default 0) untuk backward-compat; tidak dipakai lagi di flow baru
  MODIFY COLUMN `delivery_fee` DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE `orders`
  ADD COLUMN `discount_percent` INT NOT NULL DEFAULT 0,
  ADD COLUMN `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `packing_fee` DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN `shipping_zone_code` VARCHAR(10) NULL,
  ADD COLUMN `shipping_distance_km` FLOAT NULL,
  MODIFY COLUMN `delivery_fee` DECIMAL(12,2) NOT NULL DEFAULT 0;
```
Catatan: `serviceFee` kolom **tidak dihapus** (hindari break data lama); nilainya diset 0 untuk order baru. Struk baru tidak menampilkan baris service fee.

### 1.4 Update `schema.prisma`
- Tambah model `ShippingZone`, `AppSetting`.
- Tambah field di `PendingPayment` & `Order`: `discountPercent`, `discountAmount`, `packingFee`, `shippingZoneCode`, `shippingDistanceKm` (dengan `@map`).
- Run `npx prisma migrate dev --name add_shipping_zones_discount_packing` (local dulu).

### 1.5 Seeder
- Zona default: Z1 (0-3km), Z2 (3.01-6km), Z3 (6.01-10km), Z4 (>10km).
- AppSetting default: `packing_fee=0`, `wa_admin=0812-XXXX-XXXX`, `discount_percent_default=0`.

### 1.6 Update docs: `database.md` + `desain.md`
- Entry `database.md` SEBELUM migration ke production (sesuai aturan project).
- Update tabel ringkasan di `database.md`.

---

## FASE 2 — Backend Services & Endpoints

### 2.1 `be/services/shippingZoneService.js` (BARU)
Fungsi:
- `getActiveZones()` — list zona `isActive:true` urut `jarakMin` asc.
- `resolveShippingZone(distanceKm)` — return zona pertama yang match `jarakMin <= d < jarakMax`, atau zona `jarakMax=null` jika `d >= jarakMax(zona sebelumnya)`. Throw `OUT_OF_RANGE` kalau gap.
- `getDistanceKm(origin, dest)` — panggil Google Distance Matrix API (mode driving). Pakai axios (sudah di dependency). Return jarak km. Handle error/fallback.
- `calculateShipping(customerLat, customerLng)` — orkestrasi: ambil store coord dari env → getDistanceKm → resolveShippingZone → return `{ distanceKm, zoneCode, tariff, outOfRange }`.
- **Cache**: in-memory `Map` key=`lat,lng` rounded 4 desimal, TTL 30 menit. Cegah repeated calls Google API.
- **Fallback**: kalau `GOOGLE_MAPS_API_KEY` kosong → gunakan Haversine (garis lurus) × 1.3 untuk dev lokal tanpa API key. Log warning.

### 2.2 `be/services/appSettingsService.js` (BARU)
- `get(key)`, `set(key, value)`, `getPackingFee()`, `getWaAdmin()`, `getStoreCoords()`.
- Cache in-memory (env untuk koordinat, DB untuk packing_fee/wa_admin).

### 2.3 `be/services/discountService.js` (BARU, opsional)
- `calculateOrderDiscount(subtotal, discountPercent)` → `Math.round(subtotal * pct/100)`.
- Default discountPercent dari AppSetting (-atau hardcoded 0) atau dari input admin/checkout. **Kebijakan**: diskon order-level hanya bisa di-set oleh admin (di detail order / saat create pending?). **Clarify**: untuk checkout public, discountPercent=0 default (belum ada UI diskon order untuk pembeli). Diskon per-menu tetap dari `Menu.discountPercent`. Nanti kalau butuh promo/kupon baru tambah UI.

### 2.4 Endpoint `POST /api/checkout/shipping` (BARU) — `be/routes/paymentRoutes.js` atau file baru
- Input: `{ customerLatitude, customerLongitude }` (atau full address → geocode fallback).
- Rate-limit: `express-rate-limit` (window 1 menit, max 20 req/IP) — dependency sudah ada.
- Return: `{ distanceKm, zoneCode, tariff, outOfRange, subtotal?, total? }`.
- Publik (no auth). Dipakai FE di halaman Data Pengiriman untuk preview ongkir real-time sebelum tombol bayar.

### 2.4b Integrasi ke `POST /api/payments/create` (MODIFIKASI)
- Baca `discountPercent`, `packingFee`, `deliveryFee` (zone tariff), `shippingZoneCode`, `shippingDistanceKm` dari request body (sudah dihitung FE sebelumnya via `/checkout/shipping`).
- Hitung ulang di backend untuk keamanan (jangan trust FE):
  - `subtotal` dari items × finalPrice (sudah ada).
  - `discountAmount = Math.round(subtotal * discountPercent / 100)`.
  - `deliveryFee` = re-validate via `calculateShipping` pakai lat/lng (sebenarnya bisa skip kalau FE sudah kirim & backend trust setelah validate zone exists). **Pilih**: re-calc backend supaya aman, fallback ke FE value kalau Google API gagal.
  - `packingFee` dari appSettings (bukan dari FE — admin config, tidak boleh diubah pembeli).
  - `total = subtotal - discountAmount + deliveryFee + packingFee`.
  - `serviceFee = 0`.
- Simpan semua field baru ke PendingPayment.
- Update `createOrderFromPending` di `paymentRoutes.js:24-64` untuk copy field baru ke Order.

### 2.5 CRUD Admin `ShippingZone` (BARU) — `be/routes/shippingZoneRoutes.js`
- `GET /api/shipping-zones` — list semua.
- `POST /api/shipping-zones` — create (validate: no overlap/gap antar zona).
- `PUT /api/shipping-zones/:id` — update.
- `PATCH /api/shipping-zones/:id/toggle` — active/inactive.
- `DELETE /api/shipping-zones/:id` — hard delete (cek tidak ada order referencing? atau soft delete via isActive).
- Auth: admin only.
- Mount di `app.js`: `app.use('/api/shipping-zones', shippingZoneRoutes)`.

### 2.6 Endpoint Admin AppSettings (BARU) — `be/routes/settingRoutes.js`
- `GET /api/settings` — get packing_fee, wa_admin, store_address.
- `PUT /api/settings` — update packing_fee & wa_admin (store coords tetap env).
- Auth: admin only.
- Mount di `app.js`.

### 2.7 Update `reportRoutes.js`
- Tambah rekap: total diskon, total ongkir, total packing, distribusi per zona, stok keluar per menu (sesuai format struk #6).
- Endpoint baru `GET /api/reports/daily-rekap` untuk Laporan Rekap Harian.

---

## FASE 3 — Frontend Pembeli (`fe/src/main.jsx`)

### 3.1 CartReview: integrasi ongkir
- Step `info` (Data Pengiriman): setelah lat/lng/alamat terisi → panggil `/api/checkout/shipping` untuk preview ongkir + zona. Tampilkan baris ongkir + zona di preview bill (atau di step confirm).
- Step `confirm`: tampilkan rincian: Subtotal, Diskon (jika ada), Ongkir (Zona X, Y km), Biaya Packing, TOTAL baris baru.
- Kirim `discountPercent` (0 default), `deliveryFee`, `packingFee` (dari settings), `shippingZoneCode`, `shippingDistanceKm` di payload checkout.
- Ganti label "Biaya Layanan (10%)" → "Biaya Packing".
- **Bloking**: kalau `outOfRange=true` → disable tombol bayar + pesan "Alamat di luar jangkauan. Hubungi admin.".

### 3.2 ReceiptPage: struk pembeli format 35-char (#1)
- Rombak layout struk sesuai format prompt struk #1:
  - Header: nama toko + alamat + WA admin (dari settings/API).
  - Info Nota: No. Nota, Tanggal & Jam, Admin, Bayar, Status LUNAS.
  - Data Penerima: Nama, No HP, Alamat.
  - Rincian Pesanan: `[QTY]x Menu      @HARGA` + baris total.
  - Ringkasan: Subtotal Pempek, Diskon (X%) -Rp, Ongkir (Zona X, Y km), Biaya Packing.
  - TOTAL BAYAR.
  - Footer: "-- PEMBAYARAN VALID --" + terima kasih.
- Update `shareText` generator (`main.jsx:428`) agar match struk teks 35-char.
- CSS: `.dk-receipt-document` monospace, lebar 35 char (atau visual approximation untuk JPEG).

### 3.3 Slip Alamat Kurir (#4) — komponen baru di admin (print saat order delivering)
- Sebenarnya lebih ke admin-side (operasional). Lihat FASE 4.

---

## FASE 4 — Frontend Admin (`fe/src/admin.jsx`)

### 4.1 Tab/PANEL Baru: "Pengaturan" (Settings + Zona Ongkir)
- Sub-panel Zona Ongkir: tabel CRUD zona (kode, jarakMin, jarakMax, tarif, status). Tombol Tambah/Edit/Hapus. Validasi tumpang-tindih client-side.
- Sub-panel Pengaturan Toko: packing_fee, wa_admin, store_address read-only (coords dari env).
- Tampilan referensi: section 7 format struk.

### 4.2 Format struk admin (6 jenis) — generator PDF/teks
Buat helper module `fe/src/strukTemplates.js` (BARU) berisi fungsi generator untuk masing-masing struk format 35-char (output HTML untuk JPEG/print + teks untuk WA):
- `buildStrukPembayaran(order)` → struk #1.
- `buildFormCeklistOps(order, checklistState)` → struk #2 (replace/refine `buildSellerChecklistPdf`).
- `buildTiketProduksi(order)` → struk #3.
- `buildSlipAlamat(order)` → struk #4.
- `buildNotaRetur(order, returData)` → struk #5.
- `buildLaporanRekap(rekapData)` → struk #6 (replace/refine `buildReportPdf`).

Print pakai jsPDF (sudah ada) untuk PDF; render HTML untuk preview/print. Lebar 35 char pakai font monospace (`Courier` di jsPDF).

### 4.3 Integrasi struk ke UI admin
- Tab Pesanan: tombol cetak per order → menu pilih jenis struk (#1 pembeli, #2 ceklist, #3 tiket, #4 slip alamat). Replace tombol "Cetak PDF" single-purpose jadi dropdown menu 4 opsi.
- Tab Laporan: ganti laporan existing dengan Laporan Rekap Harian (#6) + tetap ada laporan penjualan lama (backward-compat) — atau full replace. **Pilih**: tambah opsi "Rekap Harian (Struk)" di samping laporan yang ada.
- Nota Retur (#5): saat admin cancel order (`orderRoutes.js` PUT status cancelled) → generate nota retur PDF + prompt alasan.

### 4.4 Refine `buildSellerChecklistPdf`
- Sesuaikan ke format #2 (ceklist item per butir, cuko & kelengkapan, QC, paraf). Sekarang ceklist hanya cek item + 2 validasi. Perlu lebih detail.

---

## FASE 5 — ENV & Config

### 5.1 `.env` tambahan (placeholder, user isi sendiri)
```
GOOGLE_MAPS_API_KEY=        # kosong = fallback Haversine
STORE_LAT=-6.3933           # Jl. Jambu No 70D, Kedaung, Sawangan, Depok (approx)
STORE_LNG=106.7817
STORE_ADDRESS=Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok
```
- Bantu user: cari koordinat via webfetch Google Maps? **Tidak** (aturan: jangan generate URL). User isi sendiri atau saya cari via address geocode di backend (pakai Maps Geocoding jika API key ada).
- Update `.env.example` (kalau ada) — di project ini hanya `.env`, jadi tambah komentar di `.env` saja (TIDAK commit kredensial).

### 5.2 `SAFEGUARDS.md` / `TODO.md` update
- Tambah TODO item terkait GOOGLE_MAPS_API_KEY perlu di-set di production VPS.

---

## FASE 6 — Testing Lokal (sebelum push)

### 6.1 Backend
- `rtk npx prisma migrate dev` (local MySQL).
- `rtk npm run dev` (backend jalan).
- Tes endpoint: `/api/checkout/shipping`, `/api/shipping-zones` (CRUD), `/api/settings`, `/api/payments/create` (flow full dengan ongkir+diskon+packing).
- Tes edge: alamat out-of-range, Google API key kosong (fallback Haversine), zona overlap validation.

### 6.2 Frontend
- `rtk npm run build` (cek no lint error).
- Tes manual flow: checkout → shipping calc → konfirmasi → struk pembeli (#1) tampil benar.
- Login admin → kelola zona → kelola settings → cetak 6 struk.

### 6.3 Verifikasi
- Struk lebar/padding 35 char konsisten.
- Perhitungan total benar: subtotal - diskon + ongkir + packing.
- Order lama (sebelum migration) tetap tampil (field baru default 0, tidak crash).

---

## FASE 7 — Dokumentasi & Deploy

### 7.1 Sebelum push
- Update `database.md` (entry migration SEBELUM ke production).
- Update `TODO.md` (pindah item ke Done + tambah item baru GOOGLE_MAPS_API_KEY production).
- Update `CHANGELOG.md` (kategori `feat`, `db`, area terdampak: pembeli/admin).
- Update `desain.md` bagian "Desain Database" + flow checkout.

### 7.2 Push
- Commit per fase atau satu commit besar dengan pesan jelas: `feat: ongkir zona + diskon order + 6 struk 35-char`.
- Push → auto-deploy.
- **Setelah push**: set `GOOGLE_MAPS_API_KEY` + `STORE_LAT`/`STORE_LNG` di VPS `.env` + restart PM2.
- Backup DB dulu sebelum migration production (`npm run backup`).

---

## Urutan Eksekusi (dependency-aware)

1. FASE 1 (schema) → 2.1-2.3 (services) → 2.5-2.6 (admin endpoints) → 2.4 (shipping endpoint) → 2.4b (modify payment create) → 2.7 (report rekap)
2. FASE 5 (env) — paralel dengan FASE 1
3. FASE 3 (FE pembeli) — paralel setelah FASE 2.4 siap
4. FASE 4 (FE admin) — paralel setelah FASE 2.5/2.6 siap
5. FASE 6 (testing) → FASE 7 (docs + push)

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Google Maps API key belum ada | Fallback Haversine×1.3; dev bisa jalan tanpa key |
| Migration production break order lama | Field baru DEFAULT 0; serviceFee tidak dihapus kolom |
| Flow total checkout beda → order pending lama invalid | Pending lama tetap pakai serviceFee; hanya order baru pakai formula baru |
| Auto-deploy ke VPS saat push | Tes lokal sepuasnya; backup DB; siapkan rollback (revert commit) |
| Biaya Packing = 0 default (admin belum set) | Seed default 0; struk tetap render baris Rp 0 |
| Frontend struk 35-char di JPEG blur | Pakai `Courier` font monospace html2canvas scale 2 (sudah ada) |

## Catatan implementasi teknis

- Konvensi nama tabel `snake_case`, Prisma `camelCase` + `@map`.
- Order hanya dibuat setelah payment settlement (aturan project) — ongkir/diskon dihitung saat create pending, disimpan, ikut ke order.
- Frontend selalu pakai relative path `/api`.
- Jangan commit kredensial (`.env` sudah di `.gitignore`? verifikasi).

## Files yang akan berubah/dibuat

**Baru:**
- `be/services/shippingZoneService.js`
- `be/services/appSettingsService.js`
- `be/services/discountService.js`
- `be/routes/shippingZoneRoutes.js`
- `be/routes/settingRoutes.js`
- `be/prisma/migrations/<tanggal>_add_shipping_zones_discount_packing/migration.sql`
- `fe/src/strukTemplates.js`

**Modifikasi:**
- `be/prisma/schema.prisma`
- `be/prisma/seed.js`
- `be/app.js` (mount routes baru)
- `be/routes/paymentRoutes.js` (modify create, add shipping endpoint)
- `be/routes/reportRoutes.js` (rekap harian)
- `be/models/pendingPaymentModel.js` (field baru)
- `be/models/orderModel.js` (field baru)
- `be/.env` (env baru — lokal, jangan commit)
- `fe/src/main.jsx` (struk #1, checkout integrasi)
- `fe/src/admin.jsx` (tab settings, 6 struk integrasi, refine checklist)
- `fe/src/styles.css` (struk 35-char styling)
- `database.md`, `desain.md`, `TODO.md`, `CHANGELOG.md`
