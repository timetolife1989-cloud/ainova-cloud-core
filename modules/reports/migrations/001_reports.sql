-- Reports modul tábla: mentett riport definíciók

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'reports_saved')
  CREATE TABLE reports_saved (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    report_name     NVARCHAR(200) NOT NULL,
    description     NVARCHAR(500),
    source_module   NVARCHAR(50),
    source_table    NVARCHAR(100),
    chart_type      NVARCHAR(50),
    config          NVARCHAR(MAX),
    created_by      NVARCHAR(100),
    is_public       BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reports_public' AND object_id = OBJECT_ID('reports_saved'))
  CREATE INDEX idx_reports_public ON reports_saved(is_public, created_at DESC);
GO
