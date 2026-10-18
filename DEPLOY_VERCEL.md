# Panduan Deploy Yaxiya Jewelry ke Vercel & Google Spreadsheet (code.gs)

Aplikasi **Yaxiya Jewelry — Shipping Address Manager** dirancang secara khusus agar dapat di-deploy ke **Vercel** secara gratis, dengan seluruh data tersimpan secara permanen dan aman di **Google Spreadsheet** menggunakan **Google Apps Script (`code.gs`)**.

---

## 💎 Bagian 1: Pasang `code.gs` di Google Spreadsheet (2 Menit)

1. Buka [Google Sheets](https://docs.google.com/spreadsheets/) dan buat Spreadsheet baru (atau gunakan Spreadsheet yang sudah ada).
2. Beri nama Spreadsheet, misalnya: `Database Pengiriman Yaxiya Jewelry`.
3. Klik menu **Ekstensi** (*Extensions*) > **Apps Script**.
4. Hapus seluruh kode default yang ada di jendela editor Apps Script.
5. Buka file `code.gs` dari sistem ini (atau salin langsung dari menu **6. Impor & Ekspor Data** > tab **Google Spreadsheet & code.gs** di aplikasi), lalu tempelkan (*paste*) ke editor Apps Script.
6. Tekan tombol **Simpan** (ikon disket atau `Ctrl + S` / `Cmd + S`).
7. Klik tombol biru **Terapkan** (*Deploy*) di sudut kanan atas > pilih **Penerapan Baru** (*New deployment*).
8. Klik ikon roda gigi ⚙️ di sebelah *Select type* > pilih **Aplikasi Web** (*Web app*).
9. Isi konfigurasi berikut:
   - **Deskripsi:** `Yaxiya Jewelry Database API`
   - **Jalankan sebagai (*Execute as*):** `Saya (akun Google Anda)`
   - **Yang memiliki akses (*Who has access*):** `Siapa saja (Anyone)` ⚠️ **PENTING: Wajib pilih Anyone agar Vercel dapat membaca dan menulis data**.
10. Klik **Terapkan** (*Deploy*).
11. Klik **Berikan Akses** (*Authorize access*) > pilih akun Google Anda. Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced** > klik **Go to Yaxiya Jewelry (unsafe)** > klik **Allow**.
12. Salin **URL Aplikasi Web** (*Web App URL*) yang berakhiran `/exec`.

---

## ⚡ Bagian 2: Hubungkan ke Aplikasi & Uji Koneksi

1. Buka aplikasi Yaxiya Jewelry Anda.
2. Buka menu **6. Impor & Ekspor Data** > pilih tab **Google Spreadsheet & code.gs (Cloud Database & Vercel)**.
3. Tempelkan URL Web App yang disalin tadi ke kolom input URL, lalu klik **Simpan URL**.
4. Klik tombol **Uji Koneksi**. Akan muncul notifikasi hijau tanda koneksi berhasil terhubung dengan latensi millisecond.
5. Klik tombol **Kirim Semua Data (Push All Data)** untuk memindahkan semua data pelanggan, alamat, kurir, dan pengaturan ke Google Spreadsheet Anda secara instan.
6. Buka kembali Google Spreadsheet Anda, Anda akan melihat semua sheet terbentuk otomatis:
   - `PELANGGAN` (dengan header maroon/deep pink elegan)
   - `ALAMAT_PENGIRIMAN` (dengan header pink rose)
   - `GRUP_ALAMAT` (HERMES, DIAMOND, CHANEL)
   - `JASA_KIRIM` (daftar ekspedisi Indonesia lengkap)
   - `RIWAYAT_CETAK` (log pencetakan label thermal & HVS)
   - `PENGATURAN` (identitas toko & logo)

---

## 🚀 Bagian 3: Deploy ke Vercel (Gratis & Otomatis)

Sistem ini sudah dilengkapi dengan konfigurasi standar Vercel:
- `vercel.json` (routing static SPA + Serverless API)
- `api/index.ts` (Express serverless handler)

### Langkah Deploy:
1. Unggah kode repositori ini ke akun **GitHub** atau **GitLab** Anda.
2. Masuk ke [dashboard Vercel](https://vercel.com).
3. Klik **Add New Project** > pilih repositori GitHub aplikasi Yaxiya ini.
4. Pada form konfigurasi proyek di Vercel:
   - **Framework Preset:** `Vite` (atau Other)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Buka bagian **Environment Variables** dan tambahkan:
   - **Nama:** `GOOGLE_APPS_SCRIPT_URL`
   - **Nilai:** `https://script.google.com/macros/s/.../exec` (URL Web App Anda dari Bagian 1)
6. Klik tombol **Deploy**.
7. Dalam waktu kurang dari 1 menit, website Anda sudah aktif dan live dengan domain gratis `*.vercel.app`!

---

## 🔄 Keunggulan Arsitektur Ini:
1. **Permanen & Aman**: Serverless di Vercel tidak menyimpan data lokal, namun karena semua operasi membaca/menulis ke Google Spreadsheet via `code.gs`, data Anda **100% permanen dan tidak akan pernah hilang**.
2. **Mudah Diakses di Google Sheets**: Anda dan tim dapat melihat, memeriksa, dan membackup data langsung dari antarmuka Google Sheets di laptop maupun HP.
3. **Menu Kustom di Google Sheets**: Di toolbar Google Sheets terdapat menu khusus `💎 Yaxiya Jewelry` untuk cek total data, format header, dan membuat cadangan instan.
