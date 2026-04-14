/**
 * Seed data awal untuk testing
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
    // Insert categories
    for (const name of categories) {
      await client.query(
        'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }
    console.log(`✓ ${categories.length} kategori ditambahkan`);

    // Insert products
    let count = 0;
    for (const p of products) {
      const { rows } = await client.query('SELECT id FROM categories WHERE name = $1', [p.category]);
      const categoryId = rows[0]?.id || null;

      await client.query(
        `INSERT INTO products (name, sku, price, stock, category_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (sku) DO NOTHING`,
        [p.name, p.sku, p.price, p.stock, categoryId]
      );
      count++;
    }
    console.log(`✓ ${count} produk ditambahkan`);

    // Insert default users
    const adminHash = await bcrypt.hash('admin123', 10);
    const kasirHash = await bcrypt.hash('kasir123', 10);
    await client.query(
      `INSERT INTO users (username, password, role, name) VALUES
         ('admin', $1, 'admin', 'Administrator'),
         ('kasir', $2, 'kasir',  'Kasir')
       ON CONFLICT (username) DO NOTHING`,
      [adminHash, kasirHash]
    );
    console.log('✓ Default users: admin/admin123, kasir/kasir123');

    // Migrasi: tambah kolom baru ke store_settings jika belum ada (aman dijalankan berulang)
    const newCols = [
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS qris_image TEXT DEFAULT ''",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT ''",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) DEFAULT ''",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) DEFAULT ''",
      "ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100) DEFAULT ''",
    ];
    for (const sql of newCols) await client.query(sql);

    // Insert default store settings
    await client.query(`
      INSERT INTO store_settings (id, store_name, store_tagline, store_address, store_phone, footer_msg)
      VALUES (1, 'Kasir Online', 'Point of Sale', 'Jl. Toko No. 1, Kota Anda', '0812-3456-7890',
              'Terima kasih telah berbelanja!\nBarang yang sudah dibeli tidak dapat dikembalikan.')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✓ Default store settings ditambahkan');
    console.log('Seed data selesai!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed gagal:', err.message);
  process.exit(1);
});
