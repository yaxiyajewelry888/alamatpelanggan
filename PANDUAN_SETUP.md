# Panduan Operasional & Deployment
## Yaxiya Jewelry — Shipping Address Manager

Aplikasi web full-stack untuk manajemen alamat pengiriman, multi-alamat dropship, ekspedisi Indonesia, cetak label presisi thermal 100×150 mm & HVS A4, serta sinkronisasi otomatis Google Sheets.

---

### 1. Struktur & Fitur Utama

- **Dashboard Terintegrasi**: Statistik real-time total pelanggan, total alamat, label tercetak, dan antrean sinkronisasi. Langsung terbuka tanpa login.
- **Satu ID Pelanggan, Banyak Alamat**: Satu ID (misal `YX-000125`) dapat menaungi alamat rumah, kantor, dropship 1, dropship 2 dengan nama penerima dan ekspedisi berbeda.
- **Pencarian Multifaset**: Pencarian sebagian teks (partial match) berdasarkan ID, nama pelanggan, penerima, nomor telepon (awalan 0 terjaga), label, dan kota.
- **Jasa Kirim Indonesia Lengkap**: JNE, J&T, SiCepat, SPX, AnterAja, GoSend, GrabExpress, Kargo, internasional, kurir toko sendiri, dan custom.
- **Cetak Presisi Sesuai Ukuran Fisik**:
  - **Thermal 100 × 150 mm**: 1 label per halaman (portrait roll).
  - **HVS A4 3-Bagian**: 3 label per lembar kertas A4 dengan garis potong tipis (dashed cut line).
  - Preview interaktif, toggle ID pelanggan, toggle pengirim, skala ukuran font, dan pencatatan riwayat cetak otomatis.
- **Impor & Ekspor Data**: Format Excel (.xlsx) dan CSV (.csv) dengan unduhan template, preview baris, validasi kolom, dan pilihan penanganan ID duplikat.
- **Database Persisten**: Penyimpanan utama persisten dengan proteksi integritas ACID dan antrean sinkronisasi latar belakang.

---

### 2. Konfigurasi Google Sheets API (Backend Service Account)

Spreadsheet ID tetap yang digunakan:
`1pHGZXElS17YfNjUNiX-I70uGKZGQNq1Ry1ETPTeqHjo`

Sesuai ketentuan, **tidak ada pengaturan Google Sheets di antarmuka pengguna**. Konfigurasi dilakukan satu kali di environment backend:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Aktifkan **Google Sheets API** pada project Anda.
3. Buat **Service Account** di menu *IAM & Admin* > *Service Accounts*.
4. Buat kunci baru (JSON Key) dan unduh file kredensialnya.
5. Salin email Service Account (contoh: `yaxiya-sync@project-id.iam.gserviceaccount.com`).
6. Buka Google Spreadsheet `1pHGZXElS17YfNjUNiX-I70uGKZGQNq1Ry1ETPTeqHjo`, klik tombol **Bagikan (Share)**, dan masukkan email Service Account dengan izin **Editor**.
7. Pada environment server / file `.env`, isi variabel berikut:

```env
GOOGLE_SPREADSHEET_ID="1pHGZXElS17YfNjUNiX-I70uGKZGQNq1Ry1ETPTeqHjo"
GOOGLE_SERVICE_ACCOUNT_EMAIL="yaxiya-sync@project-id.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

*Catatan Keamanan*: Jika kredensial belum diisi, aplikasi **tetap berfungsi 100% normal** dengan menyimpan semua data di database utama dan mencatat tugas ke antrean sinkronisasi persisten. Saat kredensial diaktifkan, antrean akan disinkronkan secara otomatis tanpa ada data yang hilang.

---

### 3. Pembuatan Sheet Otomatis

Backend secara otomatis memeriksa dan membuat sheet jika belum ada di spreadsheet:
1. `PELANGGAN`: customer_id, customer_name, primary_phone, notes, created_at, updated_at, status
2. `ALAMAT_PENGIRIMAN`: address_id, customer_id, address_label, recipient_name, recipient_phone, full_address, village, district, city, province, postal_code, shipping_courier, shipping_service, shipping_notes, created_at, updated_at, status
3. `JASA_KIRIM`: courier_id, courier_name, courier_category, services, is_favorite, is_active, created_at, updated_at
4. `RIWAYAT_CETAK`: print_id, customer_id, address_id, recipient_name, shipping_courier, label_format, copies, printed_at
5. `LOG_SINKRONISASI`: sync_id, entity_type, entity_id, operation, sync_status, error_message, created_at, synced_at

---

### 4. Petunjuk Pengaturan Printer untuk Ukuran Fisik Presisi

Agar hasil cetak sesuai dengan ukuran fisik kertas:

#### A. Printer Thermal (Kertas Label 100 × 150 mm / 4 × 6 inch):
1. Masuk ke dialog cetak browser (Ctrl + P atau tombol **Cetak Label Sekarang** di aplikasi).
2. Pilih printer label thermal Anda.
3. Pada **Ukuran Kertas (Paper Size)**: Pilih `100 x 150 mm` atau `4 x 6 inch`.
4. Pada **Tata Letak (Layout)**: Pilih `Potret (Portrait)`.
5. Pada **Skala (Scale)**: Pilih **Ukuran Sebenarnya (Actual Size / 100%)** — jangan pilih "Fit to printable area".
6. Pada **Margin**: Pilih **Tidak ada (None)** atau **Minimum**.
7. Pastikan centang opsi *Grafik Latar Belakang (Background Graphics)* jika ingin menampilkan badge ekspedisi dengan kontras penuh.

#### B. Printer Kantor / Biasa (Kertas HVS A4):
1. Pilih printer standar A4.
2. Pada **Ukuran Kertas**: Pilih `A4 (210 × 297 mm)`.
3. Pada **Tata Letak**: Pilih `Potret (Portrait)`.
4. Pada **Skala**: Pilih **100% (Actual Size)**.
5. Potong label mengikuti **garis putus-putus (dashed line)** ✂ yang telah disediakan pada masing-masing 1/3 halaman.
