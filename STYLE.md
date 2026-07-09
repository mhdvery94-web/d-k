# Style Guide — Vibe Coding (Fj)

> File ini bukan dokumentasi arsitektur, tapi **preferensi kerja & gaya coding** yang harus diikuti
> AI agent (Kilo Code, dll) setiap kali bantu ngoding di project ini. Taruh sebagai rules
> (`.kilocode/rules/`) supaya otomatis kebaca tiap sesi.
>
> Beberapa bagian sudah saya isi berdasarkan konteks project & histori kerja kamu — tapi ini
> masih **draft awal**, silakan koreksi/tambah bagian yang saya tandai `(isi manual)`.

---

## Stack & Konvensi Teknis

- **Backend**: Node.js, Express 5, Prisma ORM, MySQL
- **Frontend**: React + Vite, Tailwind/CSS custom, Zustand untuk state, React Query untuk data fetching
- **Database**: nama tabel & kolom **snake_case**, code Prisma tetap **camelCase** via `@map()`/`@@map()` — jangan pernah ubah pola ini tanpa diskusi eksplisit
- **API path**: frontend selalu pakai relative path `/api`, jangan hardcode `http://localhost:5000` di kode yang bakal dibawa ke production
- **Kredensial**: JANGAN PERNAH commit kredensial (DB, email, payment key, JWT secret) ke repo — selalu lewat environment/secret manager

## Prinsip Kerja dengan AI Agent

- Sebelum mulai task, **baca `TODO.md` dan `CHANGELOG.md`** dulu — jangan asumsi konteks dari nol
- Setelah selesai task: **update `TODO.md`** (pindah ke Done + tanggal) dan **tambah entry di `CHANGELOG.md`**
- Kalau ada perubahan schema database: **wajib catat di `database.md`** sebelum migration jalan ke production
- Jangan mengulang pekerjaan yang sudah tercatat selesai kecuali diminta eksplisit
- Kalau ragu / ada dua pilihan implementasi yang trade-off-nya signifikan, **tanya dulu**, jangan asumsi sepihak

## Gaya Komunikasi & Eksekusi _(isi manual)_

- Preferensi penjelasan: to the point? atau dengan penjelasan alasan teknis dulu?
- Butuh AI jelasin dulu rencana sebelum eksekusi, atau langsung eksekusi lalu laporan?
- Kalau nemu bug di luar scope task yang diminta: langsung fix, atau laporkan dulu?

## Konvensi Penamaan & Struktur Kode _(isi manual)_

- Penamaan file/komponen: PascalCase untuk komponen React? camelCase untuk util?
- Preferensi struktur folder baru: ikut pola existing di `fe/src/` dan `be/routes|controllers|models`?
- Komentar kode: pakai Bahasa Indonesia atau English?

## Testing & Validasi _(isi manual)_

- Sebelum dianggap "selesai", task harus dites gimana? (manual run, curl endpoint, dll)
- Ada kebiasaan tertentu buat validasi sebelum push/deploy?

## Git & Commit _(isi manual)_

- Format commit message yang dipakai (conventional commits? bebas?)
- Boleh langsung commit otomatis oleh AI, atau selalu review dulu?

---

## Catatan Umum Preferensi Teknis (dari histori project lain)

- Untuk kebutuhan tunneling lokal ke publik: biasa pakai **Cloudflare Tunnel**
- Untuk embedded/hardware (di luar project ini): prefer **Arduino Nano** dibanding ESP32 untuk kebutuhan relay/pump karena reliabilitas

