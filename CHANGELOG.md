# Catatan Rilis — Kasir Online

## Versi 1.2.7 (versionCode 19)

### ✨ Baru
- **Ikon aplikasi baru** — logo brand Kasir Online (toko, biru) sebagai ikon di layar HP, dengan dukungan adaptive icon (Android 8+) & ikon bulat.

---


## Versi 1.2.6 (versionCode 18)

### ✨ Baru
- **Notifikasi update otomatis** — saat aplikasi dibuka dan ada versi lebih baru di Google Play, muncul layar pembaruan langsung dari Play Store sehingga pengguna selalu memakai versi terbaru.

---


## Versi 1.2.5 (versionCode 17)

### 🐛 Perbaikan
- **Akun kasir kini bisa melihat & menjual produk** — sebelumnya daftar produk, kategori, dan pengaturan tertolak ("akses ditolak") untuk role kasir di layar POS. Kini kasir dapat membuka POS dan bertransaksi normal (operasi kelola produk tetap khusus admin).
- Foto profil kini bisa diganti oleh semua role.
- Penyesuaian internal agar aplikasi lebih tahan saat proses rilis/build.

---


## Versi 1.2.4 (versionCode 14)

### ✨ Baru
- **Scan barcode produk** — arahkan kamera ke barcode produk untuk langsung menambahkannya ke keranjang; tidak perlu ketik/cari manual. (SKU produk = angka barcode.)

### ⚡ Peningkatan
- **Optimasi R8** lanjutan — *optimized resource shrinking* & *class repackaging* aktif → ukuran & penggunaan memori lebih efisien, skor optimasi Play naik.

### 🐛 Perbaikan
- Berbagai perbaikan kestabilan.

---


## Versi 1.2.2 (versionCode 12)

### ✨ Baru
- **Cetak struk ke printer Bluetooth (thermal ESC/POS)** — scan & pilih printer di Pengaturan → Printer, tes cetak, dan **cetak otomatis setelah pembayaran berhasil**.
- **Unduh struk sebagai PDF** ke folder Dokumen perangkat (Android) / unduh langsung (web).
- **Bagikan struk** (share sheet: WhatsApp, simpan ke Files, dll).

### 🐛 Perbaikan
- Tombol struk dipisah jelas: **Cetak · Unduh · Bagikan**.
- Berbagai perbaikan kestabilan.

---


## Versi 1.2.1 (versionCode 11)

### ✨ Baru
- **Login Sidik Jari (biometrik)** untuk Android — kunci aplikasi saat dibuka.
- **Unduh & bagikan struk sebagai PDF** — di Android muncul share sheet (Simpan ke Files/Drive/kirim), di web unduh langsung.
- **QRIS Otomatis** (DANA, OVO, GoPay, ShopeePay, m-banking) — nominal & verifikasi otomatis, plus tab Pengaturan QRIS/DANA.
- **Daftar Akun akuntansi lengkap** (17 tipe: Aset Lancar/Tetap, Akumulasi Penyusutan, Persediaan, Hutang Bank/Pajak, Prive, Laba Ditahan, HPP, dll) + Buku Besar & Laporan Penjualan otomatis.

### ⚡ Peningkatan
- **R8 aktif** (shrink + obfuscate) — ukuran aplikasi jauh lebih kecil (~45%), skor optimasi Play naik.
- **Kompatibilitas Android 15** edge-to-edge — konten tidak tertutup status/navigation bar.
- Sesi login diperpanjang jadi **7 hari**.
- Kompresi gambar otomatis; QRIS disimpan lossless.

### 🐛 Perbaikan
- Pembayaran GoPay/QRIS: stok kembali otomatis bila gagal/kedaluwarsa; pesan error lebih jelas.
- Auto-simpan pengaturan saat pindah tab.
- Berbagai perbaikan kestabilan.

---


## Versi 1.1.7 (versionCode 7)

### ✨ Baru
- **QRIS Otomatis** — satu QR dinamis menerima **DANA, OVO, GoPay, ShopeePay, LinkAja & m-banking**. Nominal terisi otomatis sesuai belanja dan pembayaran **terverifikasi otomatis** (tanpa cek manual).
- **Pengaturan QRIS/DANA** — aktif/nonaktifkan QRIS Otomatis, lihat status koneksi & URL webhook.
- **Pembayaran GoPay** — tagihan GoPay langsung dari kasir dengan QR & status otomatis.
- **Laporan Penjualan** — ringkasan pendapatan, laba/rugi, produk terlaris, margin, rekap mingguan & bulanan, proyeksi.
- **Buku Besar otomatis** — setiap transaksi tercatat sebagai jurnal double-entry; rekap per bulan + jurnal manual.

### ⚡ Peningkatan
- Gambar produk/logo/QRIS **dikompres otomatis** → aplikasi lebih ringan & cepat.
- QRIS toko disimpan lossless agar tetap tajam saat dipindai.
- Reset password via **email** dengan kode verifikasi + batas percobaan.
- Logo toko di struk & faktur, serta foto profil pengguna.

### 🐛 Perbaikan
- Pembayaran GoPay/QRIS: stok otomatis kembali bila pembayaran gagal/kedaluwarsa.
- Pesan error pembayaran lebih jelas.
- Berbagai perbaikan kestabilan.

---

### Teks singkat untuk Google Play Console (What's new)

```
Versi 1.1.7:
• QRIS Otomatis — 1 QR untuk DANA, OVO, GoPay, ShopeePay & m-banking. Nominal & verifikasi otomatis.
• Pengaturan QRIS/DANA baru.
• Laporan Penjualan & Buku Besar otomatis.
• Gambar lebih ringan → aplikasi lebih cepat.
• Perbaikan pembayaran & kestabilan.
Terima kasih telah memakai Kasir Online!
```
