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

-- Pengaturan toko (hanya 1 baris)
CREATE TABLE IF NOT EXISTS store_settings (
  id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name     VARCHAR(100) NOT NULL DEFAULT 'Kasir Online',
  store_tagline  VARCHAR(200)          DEFAULT 'Point of Sale',
  store_address  TEXT                  DEFAULT '',
  store_phone    VARCHAR(50)           DEFAULT '',
  store_email    VARCHAR(100)          DEFAULT '',
  store_website  VARCHAR(200)          DEFAULT '',
  footer_msg           TEXT                  DEFAULT 'Terima kasih telah berbelanja!',
  show_footer_note     BOOLEAN NOT NULL      DEFAULT TRUE,
  qris_image           TEXT                  DEFAULT '',
  bank_name            VARCHAR(100)          DEFAULT '',
  bank_account_number  VARCHAR(50)           DEFAULT '',
  bank_account_name    VARCHAR(100)          DEFAULT '',
  bank_branch          VARCHAR(100)          DEFAULT '',
  updated_at           TIMESTAMPTZ           DEFAULT NOW()
);

-- Tabel pengguna
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   TEXT         NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'kasir' CHECK(role IN ('superadmin', 'admin', 'supervisor', 'kasir')),
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_items_transaction   ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
