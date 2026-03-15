-- File Import modul: Import napló tábla

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mod_file_import_history')
  CREATE TABLE mod_file_import_history (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    config_id       INT,
    file_name       NVARCHAR(500) NOT NULL,
    file_size       BIGINT,
    row_count       INT DEFAULT 0,
    success_count   INT DEFAULT 0,
    error_count     INT DEFAULT 0,
    status          NVARCHAR(30) DEFAULT 'pending',  -- pending, processing, completed, failed
    error_details   NVARCHAR(MAX),
    imported_by     NVARCHAR(100),
    started_at      DATETIME2 DEFAULT SYSDATETIME(),
    completed_at    DATETIME2
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_import_history_date' AND object_id = OBJECT_ID('mod_file_import_history'))
  CREATE INDEX idx_import_history_date ON mod_file_import_history(started_at DESC);
GO
