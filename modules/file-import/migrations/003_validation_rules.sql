-- File Import modul: Validációs szabály definíciók (fi-03)

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mod_file_import_validation_rules')
  CREATE TABLE mod_file_import_validation_rules (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    config_id       INT NOT NULL,
    column_name     NVARCHAR(100) NOT NULL,
    column_type     NVARCHAR(30) NOT NULL DEFAULT 'string',  -- string, number, date, boolean
    is_required     BIT DEFAULT 0,
    regex_pattern   NVARCHAR(500),
    min_value       FLOAT,
    max_value       FLOAT,
    allowed_values  NVARCHAR(MAX),       -- JSON array of allowed values
    error_message   NVARCHAR(300),
    sort_order      INT DEFAULT 0,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_import_valrules_config' AND object_id = OBJECT_ID('mod_file_import_validation_rules'))
  CREATE INDEX idx_import_valrules_config ON mod_file_import_validation_rules(config_id);
GO
