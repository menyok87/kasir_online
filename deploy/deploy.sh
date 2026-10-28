#!/usr/bin/env bash
# =============================================================
#  deploy.sh — Script deploy otomatis Kasir Online ke server
#
#  Jalankan di SERVER (bukan lokal):
#    chmod +x deploy/deploy.sh
#    sudo ./deploy/deploy.sh
#
#  Atau remote dari lokal:
#    ssh user@YOUR_SERVER_IP "cd /var/www/kasir_online && sudo ./deploy/deploy.sh"
# =============================================================

set -euo pipefail

APP_DIR="/var/www/kasir_online"
REPO_URL="https://github.com/menyok87/kasir_online.git"
BRANCH="claude/build-online-cashier-p4jw2"
NGINX_CONF="/etc/nginx/sites-available/kasir_online"
SERVICE_NAME="kasir-online"
LOG_DIR="/var/log/kasir-online"
DATA_DIR="${APP_DIR}/data"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Cek dependensi ──────────────────────────────────────────────────────
info "Memeriksa dependensi sistem..."
command -v node  >/dev/null 2>&1 || error "Node.js tidak ditemukan. Install: https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm tidak ditemukan."
command -v nginx >/dev/null 2>&1 || error "Nginx tidak ditemukan. Install: sudo apt install nginx"
command -v git   >/dev/null 2>&1 || error "Git tidak ditemukan. Install: sudo apt install git"

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VER" -lt 18 ] && error "Node.js minimal versi 18 (saat ini: $(node -v))"

info "Node.js $(node -v) — OK"

# ── 2. Clone atau update repo ──────────────────────────────────────────────
info "Menyiapkan direktori aplikasi..."
mkdir -p "${APP_DIR}" "${LOG_DIR}" "${DATA_DIR}"

if [ -d "${APP_DIR}/.git" ]; then
    info "Repo sudah ada, melakukan git pull..."
    cd "${APP_DIR}"
    git fetch origin
    git checkout "${BRANCH}"
    git pull origin "${BRANCH}"
else
    info "Clone repo..."
    git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
    cd "${APP_DIR}"
fi

# ── 3. Buat .env jika belum ada ────────────────────────────────────────────
if [ ! -f "${APP_DIR}/.env" ]; then
    warn ".env belum ada, membuat dari .env.example..."
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    info "Edit ${APP_DIR}/.env sesuai kebutuhan jika perlu"
fi

# ── 4. Install & build backend ─────────────────────────────────────────────
info "Install dependencies backend..."
cd "${APP_DIR}/backend"
npm install --omit=dev --no-audit --no-fund

# Inisialisasi database & seed awal (hanya jika DB belum ada)
if [ ! -f "${DATA_DIR}/kasir.db" ]; then
    info "Database belum ada, menjalankan seed data awal..."
    node database/seed.js
fi

# ── 5. Build frontend ──────────────────────────────────────────────────────
info "Install dependencies & build frontend..."
cd "${APP_DIR}/frontend"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

info "Build frontend selesai di: ${APP_DIR}/frontend/dist"

# ── 6. Set permission ──────────────────────────────────────────────────────
info "Mengatur permission file..."
chown -R www-data:www-data "${APP_DIR}"
chmod -R 755 "${APP_DIR}/frontend/dist"
chmod 770 "${DATA_DIR}"

# ── 7. Setup Nginx ─────────────────────────────────────────────────────────
info "Mengkonfigurasi Nginx..."
if [ ! -f "${NGINX_CONF}" ]; then
    cp "${APP_DIR}/deploy/nginx.conf" "${NGINX_CONF}"
    warn "Nginx config disalin ke ${NGINX_CONF}"
    warn "Domain sudah dikonfigurasi: kasir.keuangan99.com"
    warn "Pastikan DNS A record kasir.keuangan99.com sudah mengarah ke IP server ini"
else
    info "Nginx config sudah ada, tidak ditimpa."
fi

# Aktifkan site
if [ ! -L "/etc/nginx/sites-enabled/kasir_online" ]; then
    ln -s "${NGINX_CONF}" /etc/nginx/sites-enabled/kasir_online
    info "Nginx site diaktifkan"
fi

# Test konfigurasi nginx
nginx -t || error "Konfigurasi Nginx tidak valid!"

# ── 8. Setup & start systemd service ──────────────────────────────────────
info "Mengkonfigurasi systemd service..."
cp "${APP_DIR}/deploy/kasir-online.service" /etc/systemd/system/kasir-online.service
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"

# Restart backend
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    info "Merestart backend service..."
    systemctl restart "${SERVICE_NAME}"
else
    info "Menjalankan backend service untuk pertama kali..."
    systemctl start "${SERVICE_NAME}"
fi

# Reload nginx
systemctl reload nginx

# ── 9. Cek status ──────────────────────────────────────────────────────────
sleep 2
info "Memeriksa status service..."

if systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo -e "${GREEN}✔ Backend berjalan${NC} (port 3002)"
else
    error "Backend gagal berjalan! Cek log: journalctl -u ${SERVICE_NAME} -n 50"
fi

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✔ Nginx berjalan${NC}"
else
    error "Nginx tidak berjalan! Cek: sudo nginx -t"
fi

# ── Selesai ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deploy Kasir Online BERHASIL!            ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Backend  : http://127.0.0.1:3002"
echo -e "  Frontend : http://kasir.keuangan99.com"
echo -e ""
echo -e "  Aktifkan HTTPS:"
echo -e "    sudo certbot --nginx -d kasir.keuangan99.com"
echo ""
echo -e "  Log backend : journalctl -u ${SERVICE_NAME} -f"
echo -e "  Log nginx   : tail -f /var/log/nginx/kasir_online_access.log"
echo ""
