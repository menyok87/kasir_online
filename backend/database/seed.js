/**
 * Seed data awal untuk testing
 * Jalankan: node database/seed.js
 */
const db = require('./db');

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

// Insert categories
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
for (const name of categories) {
  insertCat.run(name);
}
console.log(`✓ ${categories.length} kategori ditambahkan`);

// Insert products
const getCatId = db.prepare('SELECT id FROM categories WHERE name = ?');
const insertProd = db.prepare(`
  INSERT OR IGNORE INTO products (name, sku, price, stock, category_id)
  VALUES (?, ?, ?, ?, ?)
`);

let count = 0;
for (const p of products) {
  const cat = getCatId.get(p.category);
  insertProd.run(p.name, p.sku, p.price, p.stock, cat?.id || null);
  count++;
}
console.log(`✓ ${count} produk ditambahkan`);
console.log('Seed data selesai!');
