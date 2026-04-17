/**
 * Seed & migration script
 * Jalankan: node database/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool   = require('./db');
const bcrypt = require('bcryptjs');

const categories = ['Makanan', 'Minuman', 'Snack', 'Produk Rumah Tangga'];

const products = [
  { name: 'Nasi Goreng Spesial',   sku: 'MKN-001', price: 25000, stock: 50,  category: 'Makanan' },
  { name: 'Mie Ayam',              sku: 'MKN-002', price: 18000, stock: 40,  category: 'Makanan' },
  { name: 'Soto Ayam',             sku: 'MKN-003', price: 20000, stock: 30,  category: 'Makanan' },
  { name: 'Ayam Bakar',            sku: 'MKN-004', price: 35000, stock: 25,  category: 'Makanan' },
  { name: 'Es Teh Manis',          sku: 'MNM-001', price: 5000,  stock: 100, category: 'Minuman' },
  { name: 'Es Jeruk',              sku: 'MNM-002', price: 7000,  stock: 80,  category: 'Minuman' },
  { name: 'Jus Alpukat',           sku: 'MNM-003', price: 15000, stock: 40,  category: 'Minuman' },
  { name: 'Kopi Susu',             sku: 'MNM-004', price: 12000, stock: 60,  category: 'Minuman' },
  { name: 'Air Mineral 600ml',     sku: 'MNM-005', price: 4000,  stock: 5,   category: 'Minuman' },
  { name: 'Keripik Singkong',      sku: 'SNK-001', price: 8000,  stock: 70,  category: 'Snack' },
  { name: 'Kacang Goreng',         sku: 'SNK-002', price: 10000, stock: 50,  category: 'Snack' },
  { name: 'Biskuit Marie',         sku: 'SNK-003', price: 6000,  stock: 3,   category: 'Snack' },
  { name: 'Sabun Mandi',           sku: 'RT-001',  price: 5000,  stock: 30,  category: 'Produk Rumah Tangga' },
  { name: 'Shampo Sachet',         sku: 'RT-002',  price: 3000,  stock: 50,  category: 'Produk Rumah Tangga' },
];

async function seed() {
  const client = await pool.connect();
  try {
    // ── Migrasi users ─────────────────────────────────────────────────────────
    await client.query(`ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20)`).catch(() => {});
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`).catch(() => {});
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('superadmin','admin','supervisor','kasir'))`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`).catch(() => {});

    // ── Default users ──────────────────────────────────────────────────────────
    const superHash      = await bcrypt.hash('super123', 10);
    const adminHash      = await bcrypt.hash('admin123', 10);
    const supervisorHash = await bcrypt.hash('supervisor123', 10);
    const kasirHash      = await bcrypt.hash('kasir123', 10);
    await client.query(
      `INSERT INTO users (username, password, role, name) VALUES
         ('superadmin', $1, 'superadmin', 'Super Administrator'),
         ('admin',      $2, 'admin',      'Administrator'),
         ('supervisor', $3, 'supervisor', 'Supervisor'),
         ('kasir',      $4, 'kasir',      'Kasir')
       ON CONFLICT (username) DO NOTHING`,
      [superHash, adminHash, supervisorHash, kasirHash]
    );
    console.log('✓ Default users: superadmin/super123, admin/admin123, supervisor/supervisor123, kasir/kasir123');

    // Ambil ID superadmin dan admin untuk dipakai sebagai tenant seed data
    const { rows: saRows } = await client.query(`SELECT id FROM users WHERE role='superadmin' ORDER BY id LIMIT 1`);
    const { rows: adRows } = await client.query(`SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1`);
    const superAdminId = saRows[0]?.id;
    const adminId      = adRows[0]?.id;

    // ── Migrasi categories ─────────────────────────────────────────────────────
    await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    // Drop old global unique on name, replace with (name, admin_id)
    await client.query(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key`).catch(() => {});
    await client.query(`DROP INDEX IF EXISTS categories_name_admin_idx`).catch(() => {});
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS categories_name_admin_idx ON categories(name, admin_id)`).catch(() => {});
    // Assign orphaned rows to superadmin
    if (superAdminId) {
      await client.query(`UPDATE categories SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }

    // ── Migrasi products ───────────────────────────────────────────────────────
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    // Drop old global unique on sku, replace with (sku, admin_id)
    await client.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key`).catch(() => {});
    await client.query(`DROP INDEX IF EXISTS products_sku_admin_idx`).catch(() => {});
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_sku_admin_idx ON products(sku, admin_id) WHERE sku IS NOT NULL`).catch(() => {});
    if (superAdminId) {
      await client.query(`UPDATE products SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }

    // ── Migrasi transactions ───────────────────────────────────────────────────
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    // invoice_number was globally unique; now per-admin unique
    await client.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_invoice_number_key`).catch(() => {});
    await client.query(`DROP INDEX IF EXISTS transactions_invoice_admin_idx`).catch(() => {});
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS transactions_invoice_admin_idx ON transactions(invoice_number, admin_id)`).catch(() => {});
    if (superAdminId) {
      await client.query(`UPDATE transactions SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }

    // ── Migrasi store_settings ────────────────────────────────────────────────
    await client.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await client.query(`ALTER TABLE store_settings DROP CONSTRAINT IF EXISTS store_settings_id_check`).catch(() => {});
    // Assign old global row to superadmin
    if (superAdminId) {
      await client.query(`UPDATE store_settings SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }
    // Add unique on admin_id (will fail silently if already exists or data conflict)
    await client.query(`ALTER TABLE store_settings ADD CONSTRAINT store_settings_admin_id_key UNIQUE (admin_id)`).catch(() => {});
    // Add new columns if missing
    const settingsCols = [
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS qris_image TEXT DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100) DEFAULT ''`,
    ];
    for (const sql of settingsCols) await client.query(sql).catch(() => {});
    // Default settings per admin
    for (const uid of [superAdminId, adminId].filter(Boolean)) {
      await client.query(`
        INSERT INTO store_settings (admin_id, store_name, store_tagline, store_address, store_phone, footer_msg)
        VALUES ($1, 'Kasir Online', 'Point of Sale', 'Jl. Toko No. 1, Kota Anda', '0812-3456-7890',
                'Terima kasih telah berbelanja!')
        ON CONFLICT (admin_id) DO NOTHING
      `, [uid]).catch(() => {});
    }
    console.log('✓ store_settings per admin selesai');

    // ── Seed categories & products untuk superadmin ───────────────────────────
    if (superAdminId) {
      for (const name of categories) {
        await client.query(
          `INSERT INTO categories (name, admin_id) VALUES ($1, $2) ON CONFLICT (name, admin_id) DO NOTHING`,
          [name, superAdminId]
        );
      }
      console.log(`✓ ${categories.length} kategori ditambahkan (superadmin)`);

      let count = 0;
      for (const p of products) {
        const { rows } = await client.query(
          'SELECT id FROM categories WHERE name = $1 AND admin_id = $2',
          [p.category, superAdminId]
        );
        const categoryId = rows[0]?.id || null;
        await client.query(
          `INSERT INTO products (name, sku, price, stock, category_id, admin_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (sku, admin_id) DO NOTHING`,
          [p.name, p.sku, p.price, p.stock, categoryId, superAdminId]
        );
        count++;
      }
      console.log(`✓ ${count} produk ditambahkan (superadmin)`);
    }

    console.log('Seed & migrasi selesai!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed gagal:', err.message);
  process.exit(1);
});
