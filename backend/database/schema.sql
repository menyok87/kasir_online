-- Tabel pengguna (didefinisikan duluan karena tabel lain mereferensikannya)
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  username             VARCHAR(50)  NOT NULL UNIQUE,
  password             TEXT         NOT NULL,
  role                 VARCHAR(20)  NOT NULL DEFAULT 'kasir' CHECK(role IN ('superadmin', 'admin', 'supervisor', 'kasir')),
  name                 VARCHAR(100) NOT NULL,
  email                VARCHAR(150) UNIQUE,
  email_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
  verification_token   VARCHAR(64),
  verification_expires TIMESTAMPTZ,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by           INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  reset_token          VARCHAR(6),
  reset_expires        TIMESTAMPTZ,
  avatar               TEXT
);

-- Tabel kategori produk (per admin)
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  admin_id   INTEGER      REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(name, admin_id)
);

-- Tabel produk (per admin)
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER        REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER        REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(200)   NOT NULL,
  sku         VARCHAR(50),
  price       NUMERIC(15,2)  NOT NULL CHECK(price >= 0),
  cost_price  NUMERIC(15,2)  NOT NULL DEFAULT 0 CHECK(cost_price >= 0),
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK(stock >= 0),
  image_url   TEXT,
  is_active   BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(sku, admin_id)
);

-- Tabel transaksi (per admin)
CREATE TABLE IF NOT EXISTS transactions (
  id             SERIAL PRIMARY KEY,
  admin_id       INTEGER       REFERENCES users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(30)   NOT NULL,
  subtotal       NUMERIC(15,2) NOT NULL,
  discount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax            NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total    NUMERIC(15,2) NOT NULL,
  amount_paid    NUMERIC(15,2) NOT NULL,
  change_amount  NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(20)   NOT NULL DEFAULT 'cash',
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(invoice_number, admin_id)
);

-- Tabel item transaksi
CREATE TABLE IF NOT EXISTS transaction_items (
  id             SERIAL PRIMARY KEY,
  transaction_id INTEGER       NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     INTEGER       REFERENCES products(id) ON DELETE SET NULL,
  product_name   VARCHAR(200)  NOT NULL,
  product_sku    VARCHAR(50),
  price          NUMERIC(15,2) NOT NULL,
  cost_price     NUMERIC(15,2) NOT NULL DEFAULT 0,
  quantity       INTEGER       NOT NULL CHECK(quantity > 0),
  subtotal       NUMERIC(15,2) NOT NULL
);

-- Pengaturan toko per admin
CREATE TABLE IF NOT EXISTS store_settings (
  id                   SERIAL PRIMARY KEY,
  admin_id             INTEGER      UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  store_name           VARCHAR(100) NOT NULL DEFAULT 'Kasir Online',
  store_tagline        VARCHAR(200)          DEFAULT 'Point of Sale',
  store_address        TEXT                  DEFAULT '',
  store_phone          VARCHAR(50)           DEFAULT '',
  store_email          VARCHAR(100)          DEFAULT '',
  store_website        VARCHAR(200)          DEFAULT '',
  footer_msg           TEXT                  DEFAULT 'Terima kasih telah berbelanja!',
  show_footer_note     BOOLEAN NOT NULL      DEFAULT TRUE,
  store_logo           TEXT                  DEFAULT '',
  qris_image           TEXT                  DEFAULT '',
  bank_name            VARCHAR(100)          DEFAULT '',
  bank_account_number  VARCHAR(50)           DEFAULT '',
  bank_account_name    VARCHAR(100)          DEFAULT '',
  bank_branch          VARCHAR(100)          DEFAULT '',
  updated_at           TIMESTAMPTZ           DEFAULT NOW()
);

-- Daftar Akun (Chart of Accounts)
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
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_admin      ON products(admin_id);
CREATE INDEX IF NOT EXISTS idx_items_transaction   ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_admin  ON transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
