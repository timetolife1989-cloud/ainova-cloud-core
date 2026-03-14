-- modules/purchasing/migrations/001_purchasing.sql
-- Purchasing module: suppliers, orders, order items

-- Beszállítók
CREATE TABLE IF NOT EXISTS purchasing_suppliers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(200),
  email           VARCHAR(200),
  phone           VARCHAR(50),
  address         TEXT,
  tax_number      VARCHAR(30),
  payment_terms   VARCHAR(50) DEFAULT '30 nap',
  currency        VARCHAR(3) DEFAULT 'HUF',
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Beszerzési rendelések
CREATE TABLE IF NOT EXISTS purchasing_orders (
  id              SERIAL PRIMARY KEY,
  order_number    VARCHAR(30) NOT NULL UNIQUE,
  supplier_id     INTEGER NOT NULL REFERENCES purchasing_suppliers(id),
  status          VARCHAR(20) DEFAULT 'draft',
  order_date      DATE DEFAULT CURRENT_DATE,
  expected_date   DATE,
  received_date   DATE,
  total_net       DECIMAL(12,2) DEFAULT 0,
  total_gross     DECIMAL(12,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'HUF',
  notes           TEXT,
  created_by      INTEGER REFERENCES core_users(id),
  approved_by     INTEGER REFERENCES core_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Rendelés tételek
CREATE TABLE IF NOT EXISTS purchasing_order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES purchasing_orders(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES inventory_items(id),
  description     VARCHAR(300),
  quantity        DECIMAL(10,3) NOT NULL,
  unit            VARCHAR(20) DEFAULT 'db',
  unit_price      DECIMAL(10,2) NOT NULL,
  vat_rate        DECIMAL(5,2) DEFAULT 27.00,
  line_total_net  DECIMAL(12,2) DEFAULT 0,
  received_qty    DECIMAL(10,3) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchasing_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchasing_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchasing_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_poi_order ON purchasing_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchasing_order_items(product_id);
