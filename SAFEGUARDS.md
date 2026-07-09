# Safeguards — Batasan Wajib untuk AI Agent

> File ini beda dari `STYLE.md`. `STYLE.md` isinya **preferensi** (boleh dilanggar kalau ada alasan
> kuat, tapi ditanyakan dulu). File ini isinya **batasan keras** — TIDAK BOLEH dilanggar apapun
> alasannya, kecuali user secara eksplisit dan sadar memerintahkan.

---

## File & Data yang TIDAK BOLEH dibuka/diubah/dibocorkan

- Jangan pernah buka, tampilkan isi, atau tempel isi dari:
  - file `.env` / `.env.*`
  - kredensial database, email, JWT secret, payment key (Midtrans, dll)
  - isi folder `db-backup/` (kemungkinan berisi data pelanggan asli)
- Kalau user minta bantu debug config, minta user tempel nilai yang **sudah disamarkan**, jangan baca file rahasia langsung mewakili user

## Operasi Database — WAJIB hati-hati

- **Jangan pernah** menjalankan `prisma migrate reset`, `DROP TABLE`, `DELETE FROM ... ` tanpa `WHERE`, atau operasi destruktif lain tanpa konfirmasi eksplisit dari user di chat
- Setiap migration schema baru **wajib dicatat dulu di `database.md`** sebelum dijalankan (lihat template di file tersebut)
- Jangan jalankan migration langsung ke production tanpa backup terbaru dikonfirmasi ada

## Operasi Git — WAJIB hati-hati (repo ini terhubung AUTO-DEPLOY ke production)

Aplikasi sudah live di http://43.159.60.101 (pembeli) dan http://43.159.60.101/admin (admin).
**`git push` ke branch yang di-track = otomatis ter-deploy ke VPS.** Anggap setiap push sebagai
tindakan yang langsung berdampak ke pengguna nyata, bukan sekadar simpan progres.

- Jangan `git push` perubahan yang belum ditest jalan di local, meskipun task terasa "sudah selesai"
- Jangan `git push --force` ke branch manapun tanpa konfirmasi eksplisit
- Jangan commit file yang match pola sensitif (`.env`, `*.key`, `*.pem`, dump `.sql` berisi data asli)
- Jangan amend/rewrite history commit yang sudah di-push tanpa diminta
- Untuk perubahan yang menyentuh payment, order, auth admin, atau schema database: konfirmasi ke
  user dulu sebelum push, karena area ini langsung berdampak ke transaksi yang sedang berjalan
- Setiap push WAJIB diikuti entry baru di `CHANGELOG.md` (lihat `project-context.md`)

## Operasi Server/Deploy — WAJIB hati-hati

- Jangan restart/stop proses PM2 di VPS production tanpa konfirmasi
- Jangan ubah konfigurasi Nginx production langsung tanpa preview perubahan dulu ke user
- Jangan ganti Midtrans dari sandbox ke production tanpa instruksi eksplisit

## Scope Kerja

- Jangan mengerjakan task besar (migration schema besar, ubah arsitektur folder, ganti stack) tanpa didiskusikan dulu — cukup usulkan rencana, jangan langsung eksekusi
- Kalau task yang diminta ambigu dan bisa berdampak besar (misal "bersihin data QA" — bersihin yang mana? semua? sebagian?), **tanya dulu**, jangan asumsi

## Kalau Agent Ragu

Default-nya: **berhenti dan tanya**, bukan lanjut jalan dengan asumsi sendiri — terutama untuk apapun yang menyentuh data pelanggan asli, kredensial, atau operasi yang tidak bisa di-undo.