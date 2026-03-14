-- E-Commerce module tables
-- Connections to external platforms, product mapping, order sync

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ecommerce_connections')
CREATE TABLE ecommerce_connections (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  platform        NVARCHAR(30) NOT NULL,
  store_name      NVARCHAR(200) NOT NULL DEFAULT '',
  store_url       NVARCHAR(500) NOT NULL,
  api_key_enc     NVARCHAR(1000) NULL,
  api_secret_enc  NVARCHAR(1000) NULL,
  is_active       BIT NOT NULL DEFAULT 1,
  last_sync       DATETIME2 NULL,
  sync_interval   INT NOT NULL DEFAULT 15,
  sync_stock      BIT NOT NULL DEFAULT 1,
  sync_price      BIT NOT NULL DEFAULT 1,
  sync_orders     BIT NOT NULL DEFAULT 1,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ecommerce_product_map')
CREATE TABLE ecommerce_product_map (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  connection_id   INT NOT NULL,
  local_product_id INT NOT NULL,
  remote_product_id NVARCHAR(100) NOT NULL,
  remote_sku      NVARCHAR(100) NULL,
  sync_stock      BIT NOT NULL DEFAULT 1,
  sync_price      BIT NOT NULL DEFAULT 1,
  last_synced     DATETIME2 NULL,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ecommerce_orders')
CREATE TABLE ecommerce_orders (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  connection_id   INT NOT NULL,
  remote_order_id NVARCHAR(100) NOT NULL,
  order_data      NVARCHAR(MAX) NOT NULL,
  customer_name   NVARCHAR(200) NULL,
  total_amount    DECIMAL(10,2) NULL,
  currency        NVARCHAR(3) NOT NULL DEFAULT 'HUF',
  status          NVARCHAR(20) NOT NULL DEFAULT 'new',
  invoice_id      INT NULL,
  processed_at    DATETIME2 NULL,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ecom_conn_platform')
  CREATE INDEX idx_ecom_conn_platform ON ecommerce_connections(platform);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ecom_map_conn')
  CREATE INDEX idx_ecom_map_conn ON ecommerce_product_map(connection_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ecom_map_local')
  CREATE INDEX idx_ecom_map_local ON ecommerce_product_map(local_product_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ecom_order_conn')
  CREATE INDEX idx_ecom_order_conn ON ecommerce_orders(connection_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ecom_order_status')
  CREATE INDEX idx_ecom_order_status ON ecommerce_orders(status);
