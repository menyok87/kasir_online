# Kasir Online

Aplikasi kasir (Point-of-Sale) berbasis web menggunakan **Vite + React** (frontend) dan **Node.js + Express** (backend) dengan database **SQLite**.

## Fitur

- **Dashboard** - Ringkasan pendapatan, jumlah transaksi, dan grafik 7 hari terakhir
- **Kasir (POS)** - Pilih produk, tambah ke keranjang, checkout, cetak struk
- **Manajemen Produk** - Tambah, edit, hapus produk dengan stok dan kategori
- **Manajemen Kategori** - Kelola kategori produk
- **Riwayat Transaksi** - Lihat semua transaksi, detail, dan batalkan transaksi

## Cara Menjalankan

### 1. Backend

```bash
cd backend
npm install

# (Opsional) Tambahkan data contoh
node database/seed.js

# Jalankan server (port 3001)
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install

# Jalankan dev server (port 5173)
npm run dev
```

Buka browser: **http://localhost:5173**

## Struktur Proyek

```
kasir_online/
├── backend/
│   ├── server.js
│   ├── database/
│   │   ├── db.js
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── routes/
│   │   ├── categories.js
│   │   ├── products.js
│   │   ├── transactions.js
│   │   └── dashboard.js
│   └── middleware/
│       └── errorHandler.js
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── POS.jsx
│       │   ├── Products.jsx
│       │   ├── Categories.jsx
│       │   └── Transactions.jsx
│       ├── components/
│       └── api/
└── data/
    └── kasir.db  (dibuat otomatis)
```

## Tech Stack

| Layer     | Teknologi                          |
|-----------|------------------------------------|
| Frontend  | Vite, React 19, Tailwind CSS, Recharts |
| Backend   | Node.js, Express 4                 |
| Database  | SQLite (better-sqlite3)            |
| UI Icons  | lucide-react                       |
| Toast     | react-hot-toast                    |
