-- modules/worksheets/migrations/001_worksheets.sql
-- Worksheets (Munkalapok) modul

-- Munkalapok fő tábla
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'worksheets_orders')
CREATE TABLE worksheets_orders (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  order_number    NVARCHAR(30)  NOT NULL UNIQUE,       -- WO-2026-0001
  customer_id     INT           NULL,                   -- FK crm_customers ha CRM aktív
  customer_name   NVARCHAR(200) NULL,
  customer_phone  NVARCHAR(50)  NULL,
  subject         NVARCHAR(300) NOT NULL,               -- Tárgy (gépjármű, gép, eszköz)
  subject_id      NVARCHAR(100) NULL,                   -- Rendszám, sorozatszám
  fault_desc      NVARCHAR(MAX) NULL,                   -- Hiba leírás
  diagnosis       NVARCHAR(MAX) NULL,                   -- Diagnosztika eredménye
  status          NVARCHAR(20)  NOT NULL DEFAULT 'received',  -- received, diagnosing, in_progress, testing, completed, invoiced
  priority        NVARCHAR(10)  NOT NULL DEFAULT 'normal',    -- low, normal, high, urgent
  assigned_to     INT           NULL,
  estimated_hours DECIMAL(5,1)  NULL,
  estimated_cost  DECIMAL(10,2) NULL,
  actual_hours    DECIMAL(5,1)  NOT NULL DEFAULT 0,
  labor_rate      DECIMAL(10,2) NOT NULL DEFAULT 5000,  -- Ft/óra
  total_labor     DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_materials DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost      DECIMAL(12,2) NOT NULL DEFAULT 0,
  customer_signature NVARCHAR(MAX) NULL,                -- base64 canvas aláírás
  invoice_id      INT           NULL,
  notes           NVARCHAR(MAX) NULL,
  received_at     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  completed_at    DATETIME2     NULL,
  created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Munkaóra bejegyzések
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'worksheets_labor')
CREATE TABLE worksheets_labor (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  order_id        INT           NOT NULL,
  worker_id       INT           NULL,
  description     NVARCHAR(300) NULL,
  hours           DECIMAL(5,1)  NOT NULL,
  rate            DECIMAL(10,2) NOT NULL,
  total           AS (hours * rate) PERSISTED,          -- Computed column
  work_date       DATE          NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_ws_labor_order FOREIGN KEY (order_id) REFERENCES worksheets_orders(id) ON DELETE CASCADE
);

-- Felhasznált anyagok
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'worksheets_materials')
CREATE TABLE worksheets_materials (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  order_id        INT           NOT NULL,
  product_id      INT           NULL,
  product_name    NVARCHAR(300) NOT NULL,
  quantity        DECIMAL(10,3) NOT NULL,
  unit            NVARCHAR(20)  NOT NULL DEFAULT N'db',
  unit_price      DECIMAL(10,2) NOT NULL,
  total           AS (quantity * unit_price) PERSISTED,  -- Computed column
  created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_ws_mat_order FOREIGN KEY (order_id) REFERENCES worksheets_orders(id) ON DELETE CASCADE
);

-- Indexek
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ws_status')
  CREATE INDEX idx_ws_status ON worksheets_orders(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ws_assigned')
  CREATE INDEX idx_ws_assigned ON worksheets_orders(assigned_to);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ws_customer')
  CREATE INDEX idx_ws_customer ON worksheets_orders(customer_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ws_labor_order')
  CREATE INDEX idx_ws_labor_order ON worksheets_labor(order_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ws_mat_order')
  CREATE INDEX idx_ws_mat_order ON worksheets_materials(order_id);
