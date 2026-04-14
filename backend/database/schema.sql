-- Tabel kategori produk
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Tabel produk
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(200)   NOT NULL,
  sku         VARCHAR(50)    UNIQUE,
  price       NUMERIC(15,2)  NOT NULL CHECK(price >= 0),
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK(stock >= 0),
  image_url   TEXT,
  is_active   BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    DEFAULT NOW()
);

-- Tabel transaksi
CREATE TABLE IF NOT EXISTS transactions (
  id             SERIAL PRIMARY KEY,
  invoice_number VARCHAR(30)   NOT NULL UNIQUE,
  subtotal       NUMERIC(15,2) NOT NULL,
  discount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax            NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total    NUMERIC(15,2) NOT NULL,
  amount_paid    NUMERIC(15,2) NOT NULL,
  change_amount  NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(20)   NOT NULL DEFAULT 'cash',
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- Tabel item transaksi
CREATE TABLE IF NOT EXISTS transaction_items (
  id             SERIAL PRIMARY KEY,
  transaction_id INTEGER       NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     INTEGER       REFERENCES products(id) ON DELETE SET NULL,
  product_name   VARCHAR(200)  NOT NULL,
  product_sku    VARCHAR(50),
  price          NUMERIC(15,2) NOT NULL,
  quantity       INTEGER       NOT NULL CHECK(quantity > 0),
  subtotal       NUMERIC(15,2) NOT NULL
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_items_transaction   ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
