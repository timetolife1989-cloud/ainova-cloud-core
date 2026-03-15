-- Worksheets modul: Munkalap sablonok (ws-02)

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'worksheets_templates')
  CREATE TABLE worksheets_templates (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    template_name   NVARCHAR(200) NOT NULL,
    category        NVARCHAR(100),
    subject         NVARCHAR(300),
    fault_desc      NVARCHAR(MAX),
    diagnosis       NVARCHAR(MAX),
    estimated_hours DECIMAL(5,1),
    labor_items     NVARCHAR(MAX),       -- JSON array of labor line items
    material_items  NVARCHAR(MAX),       -- JSON array of material line items
    is_active       BIT DEFAULT 1,
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_ws_tpl_name' AND object_id = OBJECT_ID('worksheets_templates'))
  CREATE INDEX idx_ws_tpl_name ON worksheets_templates(template_name);
GO
