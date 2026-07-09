# PRIORITY 0 — RTK TERMINAL COMMAND ENFORCEMENT

This repository uses RTK as the mandatory terminal command proxy.

Before running any terminal/shell command, the agent must rewrite the command so it starts with `rtk`.

Correct:
- `rtk git status`
- `rtk git diff`
- `rtk npm run build`
- `rtk npm test`
- `rtk dir`
- `rtk type TODO.md`

Incorrect:
- `git status`
- `git diff`
- `npm run build`
- `npm test`
- `dir`
- `type TODO.md`

Never run raw terminal commands directly in this repository.

If a command fails through `rtk`, retry with:

`rtk proxy <command>`

Only use a raw command if both `rtk <command>` and `rtk proxy <command>` fail.

Before every command execution, verify that the command begins with `rtk`.

# Project Context Rules — Dapur Kemas

Ikuti aturan ini di setiap sesi kerja pada project ini.

## Wajib baca di awal sesi

1. `SAFEGUARDS.md` — batasan keras, WAJIB dipatuhi tanpa terkecuali
2. `TODO.md` — task yang sedang/perlu dikerjakan, jangan ulangi yang sudah "Done"
3. `CHANGELOG.md` — histori perubahan terakhir
4. `STYLE.md` — preferensi gaya kerja & konvensi teknis
5. `database.md` — kalau task menyentuh schema database
6. `README.md` dan `desain.md` — konteks arsitektur & flow sistem (dokumen stabil, jarang berubah)

## Wajib update setelah kerja

- Setelah menyelesaikan task: pindahkan item terkait di `TODO.md` ke bagian **Done** dengan tanggal
- Tambahkan entry baru di `CHANGELOG.md` dengan kategori yang sesuai (`feat`/`fix`/`refactor`/`docs`/`chore`/`db`)
- Kalau ada perubahan schema database (migration baru): tambahkan entry di `database.md` SEBELUM migration dijalankan, ikuti template yang sudah ada di file tersebut
- Kalau `README.md` atau `desain.md` jadi tidak akurat karena perubahan besar (struktur folder, arsitektur, endpoint API baru): update juga file tersebut, jangan biarkan basi

## Konvensi teknis wajib

- Database: `snake_case`, Prisma code: `camelCase` (lihat `desain.md` dan `database.md`)
- Order hanya dibuat setelah payment settlement — jangan generate order di step lain
- Jangan commit kredensial apapun ke repository
- Frontend selalu pakai relative path `/api`

## Kalau ragu

Tanya dulu ke user sebelum mengambil keputusan implementasi yang punya trade-off signifikan,
alih-alih berasumsi sepihak.

## Git & Deploy Workflow — PENTING

Project ini sudah live di production:
- Sisi pembeli: http://43.159.60.101
- Sisi admin: http://43.159.60.101/admin

**Push ke GitHub = otomatis ter-deploy ke VPS.** Ini bukan repo biasa yang aman dipush kapan saja —
setiap `git push` ke branch yang di-track auto-deploy berarti LANGSUNG mengubah aplikasi yang
sedang berjalan di production dan bisa dipakai orang lain kapan saja.

Karena itu, ikuti alur ini setiap kali fix bug/perubahan:

1. **Kerjakan & tes dulu di local** sampai perubahan benar-benar berfungsi seperti yang diharapkan
   (bukan cuma "kelihatannya jalan") — jangan langsung commit begitu selesai nulis kode
2. **Sebelum commit**, konfirmasi ke user kalau perubahan itu menyentuh:
   - flow payment (create/webhook/status)
   - flow order (create/update status/cancel)
   - auth admin (login, OTP, JWT)
   - schema database (lihat juga aturan di `database.md`)
   karena area ini berdampak langsung ke transaksi nyata yang sedang berjalan
3. **Commit dengan pesan jelas** yang menjelaskan bug apa yang diperbaiki, bukan pesan generic
   seperti `fix bug` atau `update`
4. **Setelah push**, WAJIB catat di `CHANGELOG.md` — kategori `fix` untuk bugfix, sertakan area yang
   terdampak (pembeli/admin) supaya gampang dilacak kalau perlu rollback
5. **Jangan push perubahan yang belum ditest** hanya karena ingin cepat menutup task — production
   yang sedang dipakai lebih penting daripada kecepatan menyelesaikan chat

Untuk operasi git yang berisiko (force push, reset, rewrite history), tetap ikuti batasan yang
sudah ada di `SAFEGUARDS.md` — itu berlaku ganda pentingnya di sini karena terhubung ke auto-deploy.

## Kalau context window mendekati/kena limit

Tujuan: pindah sesi baru TETAP bisa melanjutkan pekerjaan tanpa kehilangan konteks penting,
karena state project disimpan di file, bukan di memory percakapan.

1. **Sebelum context penuh** (begitu terasa mepet atau user minta `/condense`):
   - Update `TODO.md` — pastikan status task yang sedang dikerjakan akurat (In Progress / item baru
     yang ditemukan saat kerja), jangan tunggu sampai "selesai total" baru dicatat
   - Tambahkan entry di `CHANGELOG.md` untuk progres yang sudah dilakukan sejauh ini di sesi ini,
     meskipun task belum 100% selesai — tandai jelas kalau masih partial (contoh: `[wip] ...`)
   - Kalau ada keputusan teknis penting yang diambil di sesi ini (pendekatan, alasan memilih A
     dibanding B) dan belum tercatat di `desain.md`/`database.md`/`STYLE.md`, catat dulu sebelum
     context hilang — jangan biarkan keputusan itu cuma ada di chat yang bakal ke-summarize/hilang
   - Baru setelah itu jalankan condense atau biarkan otomatis

2. **Di sesi baru** (baik ganti sesi manual maupun lanjut karena sesi lama penuh):
   - Baca ulang `TODO.md` dan `CHANGELOG.md` dulu untuk tahu progres terakhir sebelum lanjut kerja
   - Kalau ada entry `[wip]` di `CHANGELOG.md`, tanyakan ke user apakah mau lanjutkan dari situ atau
     ada perubahan arah
   - Jangan mengulang task yang sudah tercatat selesai di `TODO.md`

3. **Prinsip umum**: state pekerjaan yang penting harus selalu bisa direkonstruksi dari
   `TODO.md` + `CHANGELOG.md` + `database.md`, bukan cuma ada di riwayat chat. Kalau ragu apakah
   sesuatu perlu dicatat, lebih baik dicatat.