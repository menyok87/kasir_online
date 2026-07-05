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
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token          VARCHAR(6)`).catch(() => {});
    await client.query(`ALTER TABLE users ALTER COLUMN reset_token TYPE TEXT`).catch(() => {}); // kode reset kini di-hash (bcrypt = 60 char)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires        TIMESTAMPTZ`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_attempts       INTEGER NOT NULL DEFAULT 0`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email                VARCHAR(150) UNIQUE`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified       BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token   VARCHAR(64)`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ`).catch(() => {});
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar               TEXT`).catch(() => {});
    // Pengguna lama (tanpa email) dianggap sudah terverifikasi agar tidak terkunci
    await client.query(`UPDATE users SET email_verified = TRUE WHERE email IS NULL`).catch(() => {});

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
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) NOT NULL DEFAULT 0`).catch(() => {});
    // Drop old global unique on sku, replace with (sku, admin_id)
    await client.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key`).catch(() => {});
    await client.query(`DROP INDEX IF EXISTS products_sku_admin_idx`).catch(() => {});
    // Non-partial index — PostgreSQL allows multiple NULLs in UNIQUE index (NULL != NULL)
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_sku_admin_idx ON products(sku, admin_id)`).catch(() => {});
    if (superAdminId) {
      await client.query(`UPDATE products SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }

    // ── Migrasi transaction_items ─────────────────────────────────────────────
    await client.query(`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) NOT NULL DEFAULT 0`).catch(() => {});

    // ── Migrasi transactions ───────────────────────────────────────────────────
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    // invoice_number was globally unique; now per-admin unique
    await client.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_invoice_number_key`).catch(() => {});
    await client.query(`DROP INDEX IF EXISTS transactions_invoice_admin_idx`).catch(() => {});
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS transactions_invoice_admin_idx ON transactions(invoice_number, admin_id)`).catch(() => {});
    if (superAdminId) {
      await client.query(`UPDATE transactions SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }
    // GoPay columns
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gopay_order_id VARCHAR(100)`).catch(() => {});
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gopay_status   VARCHAR(20)`).catch(() => {});
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gopay_qr_url   TEXT`).catch(() => {});
    await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gopay_deeplink TEXT`).catch(() => {});

    // ── Migrasi store_settings ────────────────────────────────────────────────
    await client.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await client.query(`ALTER TABLE store_settings DROP CONSTRAINT IF EXISTS store_settings_id_check`).catch(() => {});
    // Fix id column: old schema had DEFAULT 1 (not a sequence) — convert to SERIAL
    await client.query(`
      DO $$
      BEGIN
        IF (SELECT column_default FROM information_schema.columns
            WHERE table_name='store_settings' AND column_name='id') = '1' THEN
          CREATE SEQUENCE IF NOT EXISTS store_settings_id_seq;
          PERFORM setval('store_settings_id_seq', COALESCE((SELECT MAX(id) FROM store_settings), 1));
          ALTER TABLE store_settings ALTER COLUMN id DROP DEFAULT;
          ALTER TABLE store_settings ALTER COLUMN id SET DEFAULT nextval('store_settings_id_seq');
        END IF;
      END $$
    `).catch(() => {});
    // Assign old global row to superadmin
    if (superAdminId) {
      await client.query(`UPDATE store_settings SET admin_id = $1 WHERE admin_id IS NULL`, [superAdminId]).catch(() => {});
    }
    // Add unique on admin_id (will fail silently if already exists or data conflict)
    await client.query(`ALTER TABLE store_settings ADD CONSTRAINT store_settings_admin_id_key UNIQUE (admin_id)`).catch(() => {});
    // Add new columns if missing
    const settingsCols = [
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_logo TEXT DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS qris_image TEXT DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100) DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS midtrans_server_key TEXT DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS midtrans_client_key TEXT DEFAULT ''`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS midtrans_is_production BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS qris_enabled BOOLEAN NOT NULL DEFAULT TRUE`,
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

    // ── Migrasi & seed accounts ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id          SERIAL PRIMARY KEY,
        admin_id    INTEGER        REFERENCES users(id) ON DELETE CASCADE,
        code        VARCHAR(20)    NOT NULL,
        name        VARCHAR(100)   NOT NULL,
        type        VARCHAR(20)    NOT NULL CHECK(type IN ('kas','bank','piutang','hutang','modal','pendapatan','beban')),
        balance     NUMERIC(15,2)  NOT NULL DEFAULT 0,
        description TEXT           DEFAULT '',
        is_active   BOOLEAN        NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ    DEFAULT NOW(),
        UNIQUE(code, admin_id)
      )
    `).catch(() => {});

    const defaultAccounts = [
      { code: '1-1001', name: 'Kas Tunai',             type: 'kas',        description: 'Uang tunai di tangan' },
      { code: '1-1002', name: 'Bank BCA',               type: 'bank',       description: 'Rekening bank BCA' },
      { code: '1-1003', name: 'Bank BRI',               type: 'bank',       description: 'Rekening bank BRI' },
      { code: '1-2001', name: 'Piutang Dagang',         type: 'piutang',    description: 'Tagihan kepada pelanggan' },
      { code: '2-1001', name: 'Hutang Dagang',          type: 'hutang',     description: 'Kewajiban kepada pemasok' },
      { code: '3-1001', name: 'Modal Usaha',            type: 'modal',      description: 'Modal awal pemilik usaha' },
      { code: '4-1001', name: 'Pendapatan Penjualan',   type: 'pendapatan', description: 'Penerimaan dari penjualan produk' },
      { code: '5-1001', name: 'Beban Pembelian Barang', type: 'beban',      description: 'Biaya pembelian barang dagangan' },
      { code: '5-1002', name: 'Beban Gaji Karyawan',   type: 'beban',      description: 'Pembayaran gaji dan upah' },
      { code: '5-1003', name: 'Beban Sewa Tempat',      type: 'beban',      description: 'Biaya sewa toko/gudang' },
      { code: '5-1004', name: 'Beban Operasional',      type: 'beban',      description: 'Biaya listrik, air, internet, dll' },
    ];

    for (const uid of [superAdminId, adminId].filter(Boolean)) {
      for (const acc of defaultAccounts) {
        await client.query(
          `INSERT INTO accounts (admin_id, code, name, type, description)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code, admin_id) DO NOTHING`,
          [uid, acc.code, acc.name, acc.type, acc.description]
        ).catch(() => {});
      }
    }
    console.log('✓ Daftar akun default selesai');

    // ── Migrasi Buku Besar (journal_entries) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id             SERIAL PRIMARY KEY,
        admin_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id     INTEGER       NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        transaction_id INTEGER       REFERENCES transactions(id) ON DELETE CASCADE,
        entry_date     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        ref            VARCHAR(40),
        description    TEXT          DEFAULT '',
        debit          NUMERIC(15,2) NOT NULL DEFAULT 0,
        credit         NUMERIC(15,2) NOT NULL DEFAULT 0,
        source         VARCHAR(20)   NOT NULL DEFAULT 'manual',
        created_at     TIMESTAMPTZ   DEFAULT NOW()
      )
    `).catch(() => {});
    for (const sql of [
      `CREATE INDEX IF NOT EXISTS idx_journal_admin   ON journal_entries(admin_id)`,
      `CREATE INDEX IF NOT EXISTS idx_journal_account ON journal_entries(account_id)`,
      `CREATE INDEX IF NOT EXISTS idx_journal_date    ON journal_entries(entry_date)`,
      `CREATE INDEX IF NOT EXISTS idx_journal_txn     ON journal_entries(transaction_id)`,
    ]) await client.query(sql).catch(() => {});

    // ── Backfill: posting transaksi lama yang belum masuk Buku Besar ──────────
    // Idempoten — transaksi yang sudah punya jurnal dilewati.
    const { postSale } = require('../utils/ledger');
    const { rows: pending } = await client.query(
      `SELECT t.* FROM transactions t
        WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.transaction_id = t.id)
        ORDER BY t.created_at`
    ).catch(() => ({ rows: [] }));
    let posted = 0;
    for (const tx of pending) {
      try { await postSale(client, tx.admin_id, tx); posted++; } catch (_) {}
    }
    if (posted) console.log(`✓ Backfill Buku Besar: ${posted} transaksi diposting`);
    else        console.log('✓ Buku Besar sudah sinkron (tidak ada transaksi tertinggal)');

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
