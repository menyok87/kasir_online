# Kasir Online

Aplikasi kasir (Point-of-Sale) berbasis web menggunakan **Vite + React** (frontend) dan **Node.js + Express** (backend) dengan database **SQLite**.

## Fitur

- **Dashboard** — Ringkasan pendapatan, jumlah transaksi, grafik 7 hari terakhir
- **Kasir (POS)** — Pilih produk, tambah ke keranjang, checkout, cetak struk thermal
- **Manajemen Produk** — Tambah, edit, hapus produk dengan stok dan kategori
- **Manajemen Kategori** — Kelola kategori produk
- **Riwayat Transaksi** — Lihat semua transaksi, detail, cetak ulang, dan batalkan
- **Mobile Responsive** — Sidebar drawer, POS tab layout, tabel adaptif

---

## Menjalankan Lokal (Development)

### Prasyarat
- Node.js ≥ 18
- npm

### Backend
```bash
cd backend
npm install

# (Opsional) Tambahkan data contoh
node database/seed.js

# Jalankan dev server (port 3002)
npm run dev
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps

# Jalankan Vite dev server (port 5173)
npm run dev
```

Buka browser: **http://localhost:5173**

---

## Deploy ke Server Nginx (Production)

### Prasyarat Server
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx git curl

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Deploy Otomatis (Satu Perintah)
```bash
# Clone repo
sudo git clone -b claude/build-online-cashier-p4jw2 \
  https://github.com/menyok87/kasir_online.git /var/www/kasir_online

# Jalankan script deploy
cd /var/www/kasir_online
chmod +x deploy/deploy.sh
sudo ./deploy/deploy.sh
```

### Domain
Domain sudah dikonfigurasi: **kasir.keuangan99.com**

Pastikan DNS A record domain sudah mengarah ke IP server sebelum deploy:
```
kasir.keuangan99.com  →  A  →  [IP Server Anda]
```

### HTTPS dengan Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kasir.keuangan99.com
# Certbot akan otomatis mengisi blok SSL di nginx.conf
```

---

## Deploy Manual (Langkah per Langkah)

### 1. Build frontend
```bash
cd /var/www/kasir_online/frontend
npm install --legacy-peer-deps
npm run build
# Output: frontend/dist/
```

### 2. Setup PostgreSQL
```bash
cd /var/www/kasir_online
chmod +x deploy/setup-postgres.sh
sudo bash deploy/setup-postgres.sh
# Script akan: install PostgreSQL, buat database & user, jalankan schema
```

### 3. Install backend
```bash
cd /var/www/kasir_online/backend
npm install --omit=dev
node database/seed.js   # seed data awal (opsional)
```

### 4. Buat file .env (jika setup-postgres.sh belum membuatnya)
```bash
cp /var/www/kasir_online/.env.example /var/www/kasir_online/.env
# Edit DATABASE_URL sesuai user/password PostgreSQL yang dibuat
nano /var/www/kasir_online/.env
```

### 5. Nginx config
```bash
sudo cp /var/www/kasir_online/deploy/nginx.conf \
        /etc/nginx/sites-available/kasir_online
sudo ln -s /etc/nginx/sites-available/kasir_online \
           /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Jalankan backend (pilih salah satu)

**Opsi A — Systemd (direkomendasikan):**
```bash
sudo cp /var/www/kasir_online/deploy/kasir-online.service \
        /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kasir-online
sudo systemctl status kasir-online
```

**Opsi B — PM2:**
```bash
npm install -g pm2
cd /var/www/kasir_online
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup
```

---

## Manajemen Service

```bash
# Cek status backend
sudo systemctl status kasir-online

# Restart backend (setelah update)
sudo systemctl restart kasir-online

# Lihat log backend
journalctl -u kasir-online -f

# Lihat log nginx
tail -f /var/log/nginx/kasir_online_access.log
tail -f /var/log/nginx/kasir_online_error.log
```

---

## Update Aplikasi

```bash
cd /var/www/kasir_online
sudo git pull origin claude/build-online-cashier-p4jw2

# Rebuild frontend
cd frontend && npm run build

# Restart backend
sudo systemctl restart kasir-online
sudo systemctl reload nginx
```

---

## Struktur Proyek

```
kasir_online/
├── backend/
│   ├── server.js              # Entry point, port 3002
│   ├── database/
│   │   ├── db.js              # PostgreSQL pool (pg)
│   │   ├── schema.sql         # Skema tabel PostgreSQL
│   │   └── seed.js            # Data contoh
│   ├── routes/
│   │   ├── categories.js
│   │   ├── products.js
│   │   ├── transactions.js
│   │   └── dashboard.js
│   └── middleware/
│       └── errorHandler.js
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, POS, Products, Categories, Transactions
│   │   ├── components/        # Layout, UI, POS components
│   │   ├── api/               # Axios API client
│   │   └── utils/             # printReceipt.js
│   └── dist/                  # Build output (dihasilkan npm run build)
├── deploy/
│   ├── nginx.conf             # Konfigurasi Nginx
│   ├── kasir-online.service   # Systemd service
│   └── deploy.sh              # Script deploy otomatis
├── ecosystem.config.cjs       # PM2 config
├── .env.example               # Template environment variables
└── deploy/
    ├── setup-postgres.sh      # Setup PostgreSQL (install, buat DB & schema)
```

## Tech Stack

| Layer     | Teknologi                              |
|-----------|----------------------------------------|
| Frontend  | Vite, React 19, Tailwind CSS, Recharts |
| Backend   | Node.js 20, Express 4, Port **3002**   |
| Database  | PostgreSQL via pg (node-postgres)      |
| Web Server| Nginx (reverse proxy)                  |
| Process   | Systemd / PM2                          |
