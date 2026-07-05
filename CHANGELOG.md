# Catatan Rilis — Kasir Online

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
