-- Tabel kategori produk
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- Tabel produk
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT    NOT NULL,
  sku         TEXT    UNIQUE,
  price       REAL    NOT NULL CHECK(price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  image_url   TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- Tabel transaksi
CREATE TABLE IF NOT EXISTS transactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT    NOT NULL UNIQUE,
  subtotal       REAL    NOT NULL,
  discount       REAL    NOT NULL DEFAULT 0,
  tax            REAL    NOT NULL DEFAULT 0,
  grand_total    REAL    NOT NULL,
  amount_paid    REAL    NOT NULL,
  change_amount  REAL    NOT NULL,
  payment_method TEXT    NOT NULL DEFAULT 'cash',
  notes          TEXT,
  created_at     TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- Tabel item transaksi
CREATE TABLE IF NOT EXISTS transaction_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT    NOT NULL,
  product_sku    TEXT,
  price          REAL    NOT NULL,
  quantity       INTEGER NOT NULL CHECK(quantity > 0),
  subtotal       REAL    NOT NULL
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_items_transaction    ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products(is_active);
