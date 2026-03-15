-- CRM-Invoicing integráció: ügyfél FK az invoicing_customers felé

-- Add crm_customer_id column to invoicing_invoices if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('invoicing_invoices') AND name = 'crm_customer_id')
  ALTER TABLE invoicing_invoices ADD crm_customer_id INT NULL;
GO

-- Add FK constraint
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inv_crm_customer')
  ALTER TABLE invoicing_invoices
    ADD CONSTRAINT fk_inv_crm_customer FOREIGN KEY (crm_customer_id) REFERENCES crm_customers(id);
GO

-- Add crm_customer_id to invoicing_customers for cross-reference
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('invoicing_customers') AND name = 'crm_customer_id')
  ALTER TABLE invoicing_customers ADD crm_customer_id INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inv_cust_crm')
  ALTER TABLE invoicing_customers
    ADD CONSTRAINT fk_inv_cust_crm FOREIGN KEY (crm_customer_id) REFERENCES crm_customers(id);
GO

-- Index for faster lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_crm_cust' AND object_id = OBJECT_ID('invoicing_invoices'))
  CREATE INDEX idx_inv_crm_cust ON invoicing_invoices(crm_customer_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_cust_crm' AND object_id = OBJECT_ID('invoicing_customers'))
  CREATE INDEX idx_inv_cust_crm ON invoicing_customers(crm_customer_id);
GO
