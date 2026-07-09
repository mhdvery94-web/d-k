# Database Changes — Dapur Kemas

> File ini khusus melacak **perubahan schema database** (migration, kolom baru, tabel baru, index).
> Desain awal skema tetap ada lengkap di `desain.md` (bagian "Desain Database") — jangan diduplikasi di sini.
> Setiap kali ada perubahan schema (lewat `prisma migrate`), WAJIB dicatat di sini SEBELUM migration dijalankan ke production.

Konvensi: nama tabel/kolom di MySQL pakai `snake_case`, Prisma model pakai `camelCase` dengan `@map()` / `@@map()`.

---

## Schema Saat Ini (ringkasan tabel)

| Tabel | Fungsi |
|---|---|
| `users` | akun admin |
| `categories` | kategori menu |
| `menus` | katalog menu & stok |
| `pending_payments` | payment belum settlement, expired 15 menit |
| `orders` | order final setelah payment sukses |
| `order_items` | detail item dalam order |
| `order_sequences` | generator nomor order harian (`YYYYMMDD-001-X`) |
| `postal_code_data` | data kode pos |
| `province_data` | data provinsi |
| `otp_tokens` | OTP admin (hash bcrypt, expiry 15 menit, attempt counter) |

Detail lengkap field per tabel: lihat `desain.md` bagian "Desain Database".

---

## Log Perubahan Schema

> Urutan terbaru di atas. Setiap entry harus jelas: tanggal, tabel yang kena, jenis perubahan, alasan, dan status migration.

### Template entry

```markdown
## YYYY-MM-DD — <ringkasan singkat>

- **Tabel**: nama_tabel
- **Perubahan**: tambah kolom / ubah tipe / tambah index / tabel baru / dst.
- **Alasan**: kenapa perubahan ini perlu
- **Migration file**: `prisma/migrations/xxxx_nama/migration.sql`
- **Status**: ⬜ belum dijalankan / ✅ sudah di local / ✅ sudah di production
- **Breaking change?**: Ya/Tidak — kalau Ya, jelaskan dampaknya ke code yang sudah ada
```

---

## Riwayat

### 2026-07-09 — Setup dokumentasi tracking database

- **Tabel**: -
- **Perubahan**: Tidak ada perubahan schema, hanya inisialisasi file tracking ini
- **Alasan**: Supaya perubahan database ke depannya tercatat rapi, tidak numpuk di chat
- **Migration file**: -
- **Status**: -
- **Breaking change?**: Tidak

<!--
Tambahkan entry baru di ATAS baris ini setiap kali ada migration baru.
-->

---

## Checklist sebelum migration ke production

- [ ] Backup database production dulu (`db-backup/`)
- [ ] Migration sudah dites di local/staging
- [ ] Cek apakah breaking change — kalau ya, siapkan rencana rollback
- [ ] Update `desain.md` bagian "Desain Database" kalau ada tabel/field baru yang permanen
- [ ] Catat di `CHANGELOG.md` dengan kategori `[db]`
