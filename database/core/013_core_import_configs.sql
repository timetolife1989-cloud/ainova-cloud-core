-- Migration 013: core_import_configs + core_import_log táblák

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_import_configs'
)
  CREATE TABLE core_import_configs (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    config_name     NVARCHAR(100) NOT NULL,       -- pl. 'SAP Visszajelentés', 'Napi létszám'
    module_id       NVARCHAR(50),                 -- Melyik modulhoz tartozik (NULL = globális)
    file_type       NVARCHAR(20) NOT NULL DEFAULT 'excel',  -- 'excel', 'csv', 'json'
    target_table    NVARCHAR(100),                -- Cél tábla neve (pl. 'workforce_daily')
    column_mapping  NVARCHAR(MAX),                -- JSON: [{"source":"Excel oszlop","target":"DB oszlop","type":"string"}]
    filters         NVARCHAR(MAX),                -- JSON: [{"column":"gyar","operator":"=","value":"1310"}]
    unit_id         INT,                          -- Alapértelmezett mértékegység (core_units FK)
    detect_rules    NVARCHAR(MAX),                -- JSON: fejléc mintázat ami alapján felismeri a típust
    is_active       BIT NOT NULL DEFAULT 1,
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_import_log'
)
  CREATE TABLE core_import_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    config_id       INT REFERENCES core_import_configs(id),
    config_name     NVARCHAR(100),
    filename        NVARCHAR(255),
    rows_total      INT DEFAULT 0,
    rows_inserted   INT DEFAULT 0,
    rows_updated    INT DEFAULT 0,
    rows_skipped    INT DEFAULT 0,
    duration_ms     INT,
    imported_by     NVARCHAR(100),
    imported_at     DATETIME2 DEFAULT SYSDATETIME(),
    status          NVARCHAR(20) DEFAULT 'success',  -- 'success', 'partial', 'error'
    error_message   NVARCHAR(MAX)
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_import_log_date' AND object_id = OBJECT_ID('dbo.core_import_log'))
  CREATE INDEX idx_import_log_date ON core_import_log(imported_at DESC);
GO
