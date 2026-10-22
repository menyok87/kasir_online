#!/bin/bash
# =============================================================
#  Setup PostgreSQL untuk Kasir Online
#  Jalankan sekali di server: sudo bash deploy/setup-postgres.sh
# =============================================================
set -e

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="keuangan_personal"
DB_USER="postgres"
DB_PASSWORD="MNXfamilyTeam@123"

echo "=== Instalasi PostgreSQL ==="
apt-get update -qq
apt-get install -y postgresql postgresql-contrib

echo "=== Memastikan PostgreSQL berjalan ==="
systemctl enable --now postgresql

echo "=== Membuat database jika belum ada ==="
sudo -u postgres psql <<SQL
-- Buat database jika belum ada
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "=== Membuat schema tabel ==="
SCHEMA_FILE="$(dirname "$0")/../backend/database/schema.sql"
PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${SCHEMA_FILE}"

echo "=== Menulis .env ==="
ENV_FILE="$(dirname "$0")/../.env"
if [ ! -f "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" <<ENV
PORT=3002
NODE_ENV=production

# PostgreSQL Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
ENV
  echo "File .env dibuat: ${ENV_FILE}"
else
  echo "File .env sudah ada — tidak ditimpa."
  echo "Pastikan variabel berikut ada di .env:"
  echo "  DB_HOST=${DB_HOST}"
  echo "  DB_PORT=${DB_PORT}"
  echo "  DB_NAME=${DB_NAME}"
  echo "  DB_USER=${DB_USER}"
  echo "  DB_PASSWORD=${DB_PASSWORD}"
fi

echo ""
echo "=== Setup PostgreSQL selesai! ==="
echo ""
echo "Langkah selanjutnya:"
echo "  cd /var/www/kasir_online/backend"
echo "  npm install --omit=dev"
echo "  node database/seed.js   # (opsional) tambah data contoh"
echo "  sudo systemctl restart kasir-online"
