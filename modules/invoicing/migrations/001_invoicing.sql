-- ============================================================
-- Invoicing module tables — Hungarian-standard invoicing
-- ============================================================

-- Customers (vevők)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'invoicing_customers')
  CREATE TABLE invoicing_customers (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    customer_name   NVARCHAR(200) NOT NULL,
    tax_number      NVARCHAR(20),               -- Magyar: 12345678-1-12
    eu_tax_number   NVARCHAR(20),               -- EU közösségi adószám
    address_zip     NVARCHAR(10),
    address_city    NVARCHAR(100),
    address_street  NVARCHAR(200),
    address_country NVARCHAR(2) DEFAULT 'HU',
    email           NVARCHAR(200),
    phone           NVARCHAR(50),
    contact_person  NVARCHAR(200),
    notes           NVARCHAR(500),
    is_active       BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_cust_tax' AND object_id = OBJECT_ID('invoicing_customers'))
  CREATE INDEX idx_inv_cust_tax ON invoicing_customers(tax_number);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_cust_name' AND object_id = OBJECT_ID('invoicing_customers'))
  CREATE INDEX idx_inv_cust_name ON invoicing_customers(customer_name);
GO

-- Invoice number sequence (atomi sorszám generálás)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'invoicing_number_sequence')
  CREATE TABLE invoicing_number_sequence (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    prefix          NVARCHAR(20) NOT NULL,
    seq_year        INT NOT NULL,
    last_number     INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_inv_seq_prefix_year UNIQUE (prefix, seq_year)
  );
GO

-- Invoices (számlák)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'invoicing_invoices')
  CREATE TABLE invoicing_invoices (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    invoice_number      NVARCHAR(30) NOT NULL,
    invoice_type        NVARCHAR(20) NOT NULL DEFAULT 'normal',  -- normal | storno | advance | proforma
    storno_of_id        INT NULL,                                -- FK to original invoice (for storno)
    -- Customer snapshot (denormalized at issue time)
    customer_id         INT NULL,
    customer_name       NVARCHAR(200) NOT NULL,
    customer_tax_number NVARCHAR(20),
    customer_address    NVARCHAR(400),
    -- Dates
    issue_date          DATE NOT NULL,
    fulfillment_date    DATE NOT NULL,
    due_date            DATE NOT NULL,
    -- Payment
    payment_method      NVARCHAR(30) NOT NULL DEFAULT 'cash',    -- cash | card | transfer
    currency            NVARCHAR(3) DEFAULT 'HUF',
    -- Totals
    net_total           DECIMAL(15,2) NOT NULL DEFAULT 0,
    vat_total           DECIMAL(15,2) NOT NULL DEFAULT 0,
    gross_total         DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Status
    status              NVARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft | issued | paid | storno
    nav_status          NVARCHAR(20) DEFAULT 'pending',          -- pending | sent | accepted | rejected | na
    nav_transaction_id  NVARCHAR(50),
    -- Meta
    notes               NVARCHAR(500),
    created_by          NVARCHAR(100),
    created_at          DATETIME2 DEFAULT SYSDATETIME(),
    updated_at          DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_invoices_number' AND object_id = OBJECT_ID('invoicing_invoices'))
  CREATE UNIQUE INDEX idx_inv_invoices_number ON invoicing_invoices(invoice_number);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_invoices_customer' AND object_id = OBJECT_ID('invoicing_invoices'))
  CREATE INDEX idx_inv_invoices_customer ON invoicing_invoices(customer_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_invoices_date' AND object_id = OBJECT_ID('invoicing_invoices'))
  CREATE INDEX idx_inv_invoices_date ON invoicing_invoices(issue_date DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_invoices_status' AND object_id = OBJECT_ID('invoicing_invoices'))
  CREATE INDEX idx_inv_invoices_status ON invoicing_invoices(status);
GO

-- Add FK for storno reference (self-referencing)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inv_storno_of')
  ALTER TABLE invoicing_invoices
    ADD CONSTRAINT fk_inv_storno_of FOREIGN KEY (storno_of_id) REFERENCES invoicing_invoices(id);
GO

-- Add FK for customer
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inv_customer')
  ALTER TABLE invoicing_invoices
    ADD CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES invoicing_customers(id);
GO

-- Line items (tételsorok)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'invoicing_line_items')
  CREATE TABLE invoicing_line_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    invoice_id      INT NOT NULL,
    item_id         INT NULL,                   -- FK to inventory_items (optional)
    item_name       NVARCHAR(200) NOT NULL,     -- Snapshot at issue time
    item_sku        NVARCHAR(50),               -- Snapshot
    quantity        DECIMAL(10,3) NOT NULL,
    unit_name       NVARCHAR(20) NOT NULL DEFAULT 'db',
    unit_price_net  DECIMAL(15,2) NOT NULL,
    vat_rate        DECIMAL(5,2) NOT NULL,       -- 27.00 | 18.00 | 5.00 | 0.00
    vat_rate_code   NVARCHAR(10) NOT NULL,       -- '27%' | '18%' | '5%' | 'TAM' | 'AAM'
    line_net        DECIMAL(15,2) NOT NULL,       -- quantity * unit_price_net
    line_vat        DECIMAL(15,2) NOT NULL,       -- line_net * vat_rate / 100
    line_gross      DECIMAL(15,2) NOT NULL,       -- line_net + line_vat
    sort_order      INT DEFAULT 0
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inv_li_invoice')
  ALTER TABLE invoicing_line_items
    ADD CONSTRAINT fk_inv_li_invoice FOREIGN KEY (invoice_id) REFERENCES invoicing_invoices(id) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_li_invoice' AND object_id = OBJECT_ID('invoicing_line_items'))
  CREATE INDEX idx_inv_li_invoice ON invoicing_line_items(invoice_id);
GO

-- VAT summary per invoice (ÁFA összesítő kulcsonként)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'invoicing_vat_summary')
  CREATE TABLE invoicing_vat_summary (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    invoice_id      INT NOT NULL,
    vat_rate_code   NVARCHAR(10) NOT NULL,
    vat_rate        DECIMAL(5,2) NOT NULL,
    net_amount      DECIMAL(15,2) NOT NULL,
    vat_amount      DECIMAL(15,2) NOT NULL,
    gross_amount    DECIMAL(15,2) NOT NULL
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inv_vat_invoice')
  ALTER TABLE invoicing_vat_summary
    ADD CONSTRAINT fk_inv_vat_invoice FOREIGN KEY (invoice_id) REFERENCES invoicing_invoices(id) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_vat_invoice' AND object_id = OBJECT_ID('invoicing_vat_summary'))
  CREATE INDEX idx_inv_vat_invoice ON invoicing_vat_summary(invoice_id);
GO
