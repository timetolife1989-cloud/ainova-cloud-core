-- POS Transactions
CREATE TABLE IF NOT EXISTS pos_transactions (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  receipt_number  NVARCHAR(30) NOT NULL UNIQUE,
  transaction_date DATETIME2 DEFAULT GETUTCDATE(),
  cashier_id      INT NOT NULL REFERENCES core_users(id),
  payment_method  NVARCHAR(20) NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_type   NVARCHAR(10),
  total_net       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_vat       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_gross     DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_refund       BIT DEFAULT 0,
  original_id     INT NULL REFERENCES pos_transactions(id),
  invoice_id      INT NULL,
  notes           NVARCHAR(MAX),
  created_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- POS Transaction Items
CREATE TABLE IF NOT EXISTS pos_transaction_items (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  transaction_id  INT NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  product_id      INT NULL REFERENCES inventory_items(id),
  product_name    NVARCHAR(300) NOT NULL,
  barcode         NVARCHAR(50),
  quantity        DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit            NVARCHAR(20) DEFAULT 'db',
  unit_price      DECIMAL(10,2) NOT NULL,
  vat_rate        DECIMAL(5,2) DEFAULT 27.00,
  discount        DECIMAL(10,2) DEFAULT 0,
  line_total      DECIMAL(12,2) NOT NULL,
  created_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- POS Daily Closings
CREATE TABLE IF NOT EXISTS pos_daily_closings (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  closing_date    DATE NOT NULL,
  cashier_id      INT NOT NULL REFERENCES core_users(id),
  total_cash      DECIMAL(12,2) DEFAULT 0,
  total_card      DECIMAL(12,2) DEFAULT 0,
  total_transfer  DECIMAL(12,2) DEFAULT 0,
  total_refunds   DECIMAL(12,2) DEFAULT 0,
  expected_cash   DECIMAL(12,2) DEFAULT 0,
  actual_cash     DECIMAL(12,2) NULL,
  difference      DECIMAL(12,2) NULL,
  transaction_count INT DEFAULT 0,
  notes           NVARCHAR(MAX),
  closed_at       DATETIME2 DEFAULT GETUTCDATE()
);

-- Indexes
CREATE INDEX idx_pos_tx_date ON pos_transactions(transaction_date);
CREATE INDEX idx_pos_tx_cashier ON pos_transactions(cashier_id);
CREATE INDEX idx_pos_items_tx ON pos_transaction_items(transaction_id);
CREATE INDEX idx_pos_items_product ON pos_transaction_items(product_id);
CREATE INDEX idx_pos_close_date ON pos_daily_closings(closing_date);
