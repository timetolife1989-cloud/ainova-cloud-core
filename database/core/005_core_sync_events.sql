-- Migration 005: core_sync_events table
-- Tracks data import/sync operations for the Sync Status widget.
-- Any module that imports or syncs data should write events here.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_sync_events'
)
  CREATE TABLE core_sync_events (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    module_id     NVARCHAR(50)  NOT NULL,  -- e.g. 'sap-import', 'workforce'
    event_type    NVARCHAR(50)  NOT NULL,  -- 'import_start', 'import_success', 'import_error', 'sync_error'
    status        NVARCHAR(20)  NOT NULL,  -- 'success', 'error', 'warning', 'info'
    message       NVARCHAR(500),           -- Short human-readable message
    details       NVARCHAR(MAX),           -- Full error details / stack trace
    rows_affected INT,                     -- How many rows imported/synced
    triggered_by  NVARCHAR(100),           -- Username who triggered (null = automatic)
    created_at    DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'idx_sync_events_module_created'
    AND object_id = OBJECT_ID('dbo.core_sync_events')
)
  CREATE INDEX idx_sync_events_module_created
    ON core_sync_events(module_id, created_at DESC);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'idx_sync_events_status_created'
    AND object_id = OBJECT_ID('dbo.core_sync_events')
)
  CREATE INDEX idx_sync_events_status_created
    ON core_sync_events(status, created_at DESC);
GO

SELECT COUNT(*) AS core_sync_events_count FROM core_sync_events;
GO
