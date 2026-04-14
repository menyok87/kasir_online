#!/bin/bash
# =============================================================
#  Setup PostgreSQL untuk Kasir Online
#  Jalankan sekali di server: sudo bash deploy/setup-postgres.sh
# =============================================================
set -e

DB_NAME="kasir_online"
DB_USER="kasir_user"
DB_PASS="kasir_pass123"   # Ganti dengan password yang aman!
DB_HOST="localhost"
DB_PORT="5432"

echo "=== Instalasi PostgreSQL ==="
apt-get update -qq
apt-get install -y postgresql postgresql-contrib

echo "=== Memastikan PostgreSQL berjalan ==="
systemctl enable --now postgresql

echo "=== Membuat database dan user ==="
sudo -u postgres psql <<SQL
-- Buat user jika belum ada
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Buat database jika belum ada
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "=== Membuat schema tabel ==="
SCHEMA_FILE="$(dirname "$0")/../backend/database/schema.sql"
PGPASSWORD="${DB_PASS}" psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -f "${SCHEMA_FILE}"

echo "=== Menulis .env ==="
ENV_FILE="$(dirname "$0")/../.env"
if [ ! -f "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" <<ENV
PORT=3002
NODE_ENV=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}
ENV
  echo "File .env dibuat: ${ENV_FILE}"
else
  echo "File .env sudah ada — tidak ditimpa."
  echo "Pastikan DATABASE_URL sudah diset:"
  echo "  DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo ""
echo "=== Setup PostgreSQL selesai! ==="
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo "Langkah selanjutnya:"
echo "  cd /var/www/kasir_online/backend"
echo "  npm install --omit=dev"
echo "  node database/seed.js   # (opsional) tambah data contoh"
echo "  sudo systemctl restart kasir-online"
