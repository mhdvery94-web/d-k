# Fix: Bug "Di Luar Zona Ongkir" Padahal Dekat

## 🐛 Bug Report

**Koordinat Toko**: `-6.377609, 106.749513`  
**Koordinat Pelanggan**: `-6.377440, 106.749768`  
**Jarak Sebenarnya**: ~38 meter (0.038 km)  
**Hasil**: ❌ "Di luar zona ongkir otomatis"

## 🔍 Diagnosa

Bug ini terjadi karena salah satu atau lebih dari:

### 1. ❌ Koordinat Toko Belum Diupdate di Production

**Cek koordinat di server:**
```bash
ssh user@palembangtaste.shop
cd /path/to/dapur-kemas/be
grep STORE_LAT .env
grep STORE_LNG .env
```

**Expected (BENAR):**
```env
STORE_LAT=-6.377551989888991
STORE_LNG=106.74952946162641
```

**Jika masih default (SALAH):**
```env
# Tidak ada STORE_LAT & STORE_LNG
# atau
STORE_LAT=-6.3933
STORE_LNG=106.7817
```

**FIX**: Update `.env` di server dengan koordinat yang benar (lihat section Fix di bawah)

### 2. ❌ Zona Belum Dibuat di Database Production

**Cek zona di production:**
```bash
ssh user@palembangtaste.shop
cd /path/to/dapur-kemas/be

# Menggunakan MySQL CLI
mysql -u root -p
USE dapur_kemas_db;
SELECT * FROM shipping_zones ORDER BY jarak_min;
```

**Expected (BENAR):**
```
+----+-----------+-----------+-----------+--------+-----------+
| id | kode_zona | jarak_min | jarak_max | tarif  | is_active |
+----+-----------+-----------+-----------+--------+-----------+
|  1 | Z1        |      0.00 |      3.00 |  10000 |         1 |
|  2 | Z2        |      3.01 |      6.00 |  15000 |         1 |
|  3 | Z3        |      6.01 |     10.00 |  20000 |         1 |
|  4 | Z4        |     10.01 |      NULL |  25000 |         1 |
+----+-----------+-----------+-----------+--------+-----------+
```

**Jika kosong (SALAH):**
```
Empty set (0.00 sec)
```

**FIX**: Run seeder di production (lihat section Fix di bawah)

### 3. ⚠️ Tarif Zona Masih 0

Jika zona ada tapi tarif = 0, tidak bug tapi perlu diset harga ongkir yang sesuai.

**FIX**: Update tarif via admin panel atau SQL

## 🔧 Cara Fix

### Fix 1: Update Koordinat Toko di Server

```bash
# 1. SSH ke server
ssh user@palembangtaste.shop

# 2. Edit .env
cd /path/to/dapur-kemas/be
nano .env

# 3. Tambahkan atau update baris ini:
STORE_LAT=-6.377551989888991
STORE_LNG=106.74952946162641
STORE_ADDRESS="Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok"

# 4. Save (Ctrl+O, Enter, Ctrl+X)

# 5. Restart backend
pm2 restart dapur-kemas

# 6. Verifikasi
curl http://localhost:5000/api/settings/public | grep storeLat
# Harus tampil: "storeLat":-6.377551989888991
```

### Fix 2: Seed Zona di Production

```bash
# 1. SSH ke server
ssh user@palembangtaste.shop

# 2. Navigate ke backend
cd /path/to/dapur-kemas/be

# 3. Run seeder
npm run seed
# atau
npx prisma db seed

# 4. Verifikasi
npx prisma studio
# Buka di browser, check tabel shipping_zones
```

### Fix 3: Update Tarif Zona (Jika Perlu)

**Via SQL:**
```sql
USE dapur_kemas_db;

UPDATE shipping_zones SET tarif = 10000 WHERE kode_zona = 'Z1';
UPDATE shipping_zones SET tarif = 15000 WHERE kode_zona = 'Z2';
UPDATE shipping_zones SET tarif = 20000 WHERE kode_zona = 'Z3';
UPDATE shipping_zones SET tarif = 25000 WHERE kode_zona = 'Z4';
```

**Via Admin Panel:**
1. Login ke https://palembangtaste.shop/admin
2. Tab "Pengaturan" → "Zona Ongkir"
3. Edit setiap zona dan set tarif
4. Save

## ✅ Verifikasi Setelah Fix

### Test 1: API Koordinat
```bash
curl https://palembangtaste.shop/api/settings/public
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "storeLat": -6.377551989888991,
    "storeLng": 106.74952946162641,
    "storeAddress": "Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok",
    "packingFee": 0,
    "waAdmin": "0812-XXXX-XXXX"
  }
}
```

### Test 2: Perhitungan Ongkir
```bash
curl -X POST https://palembangtaste.shop/api/payments/checkout/shipping \
  -H "Content-Type: application/json" \
  -d '{
    "customerLatitude": -6.377440,
    "customerLongitude": 106.749768
  }'
```

**Expected Response (BENAR):**
```json
{
  "success": true,
  "data": {
    "distanceKm": 0.04,
    "zoneCode": "Z1",
    "tariff": 10000,
    "outOfRange": false
  }
}
```

**❌ Response Salah (masih bug):**
```json
{
  "success": true,
  "data": {
    "distanceKm": 0.04,
    "zoneCode": null,
    "tariff": 0,
    "outOfRange": true
  }
}
```

### Test 3: Frontend
1. Buka https://palembangtaste.shop
2. Pilih menu → Checkout
3. Isi data pengiriman dengan koordinat dekat toko
4. **Ongkir HARUS muncul** dengan zona (misal: "Z1, 0.04 km")
5. Tidak ada pesan "di luar zona ongkir"

## 🗺️ Zona Ongkir Default

| Zona | Jarak | Tarif Saran | Keterangan |
|------|-------|-------------|------------|
| Z1 | 0 - 3 km | Rp 10.000 | Sekitar toko |
| Z2 | 3.01 - 6 km | Rp 15.000 | Lokal |
| Z3 | 6.01 - 10 km | Rp 20.000 | Jauh |
| Z4 | > 10 km | Rp 25.000 | Sangat jauh |

**Note**: Tarif bisa disesuaikan via admin panel

## 🔍 Debug Script

Jika masih bug, gunakan script test:

```bash
cd e:\react-dapur-kemas\be
node test-shipping-zone.js
```

Output akan menunjukkan:
- ✅ Koordinat toko dari .env
- ✅ Jarak yang dihitung
- ✅ Zona yang aktif
- ✅ Hasil resolve zona
- ❌ Diagnosa jika ada masalah

## 🚨 Common Issues

### Issue 1: "Can't reach database"
**Solusi**: Pastikan MySQL running
```bash
# Check MySQL
systemctl status mysql
# atau
service mysql status

# Start jika mati
systemctl start mysql
```

### Issue 2: Jarak Jauh Padahal Dekat
**Penyebab**: Koordinat toko salah di .env
**Solusi**: Update .env dengan koordinat yang benar

### Issue 3: Zona NULL Padahal Ada di DB
**Penyebab**: 
- Zone tidak aktif (is_active = 0)
- jarakMin/jarakMax tidak cover jarak pelanggan
**Solusi**: 
```sql
-- Check zona aktif
SELECT * FROM shipping_zones WHERE is_active = 1;

-- Aktifkan zona jika perlu
UPDATE shipping_zones SET is_active = 1;
```

### Issue 4: "GOOGLE_MAPS_API_KEY not set"
Ini **WARNING**, bukan error. Sistem pakai Haversine fallback (akurat untuk jarak pendek).

**Untuk akurasi lebih tinggi** (optional):
1. Dapatkan Google Maps API Key
2. Enable Distance Matrix API
3. Set di .env: `GOOGLE_MAPS_API_KEY=YOUR_KEY`
4. Restart PM2

## 📊 Koordinat Toko Yang Benar

**Alamat**: Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok

**Koordinat GPS**:
- Latitude: `-6.377551989888991`
- Longitude: `106.74952946162641`

**Google Maps**:
https://maps.google.com/maps?q=-6.377551989888991,106.74952946162641

**Untuk Copy-Paste ke .env**:
```env
STORE_LAT=-6.377551989888991
STORE_LNG=106.74952946162641
STORE_ADDRESS="Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok"
```

## ✅ Checklist Fix

- [ ] Update koordinat toko di `.env` production
- [ ] Restart PM2 backend
- [ ] Run seeder untuk create zona
- [ ] Set tarif zona (via admin atau SQL)
- [ ] Test API `/api/settings/public`
- [ ] Test API `/api/payments/checkout/shipping`
- [ ] Test checkout di browser
- [ ] Verifikasi ongkir muncul dan tidak "out of range"

---

**Root Cause**: Koordinat toko belum diupdate DAN/ATAU zona belum di-seed di production  
**Fix Time**: ~5 menit  
**Impact**: High - Memblokir checkout jika ongkir tidak ter-calculate
