-- Migration 004: core_audit_log table
-- Tracks login events, admin actions, and system events

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_audit_log'
)
  CREATE TABLE core_audit_log (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    event_type  NVARCHAR(50)  NOT NULL,
    user_id     INT,
    username    NVARCHAR(100),
    ip_address  NVARCHAR(50),
    details     NVARCHAR(MAX),
    success     BIT           DEFAULT 1,
    created_at  DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'idx_core_audit_log_created_at'
    AND object_id = OBJECT_ID('dbo.core_audit_log')
)
  CREATE INDEX idx_core_audit_log_created_at ON core_audit_log(created_at DESC);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'idx_core_audit_log_event_type'
    AND object_id = OBJECT_ID('dbo.core_audit_log')
)
  CREATE INDEX idx_core_audit_log_event_type ON core_audit_log(event_type);
GO

SELECT COUNT(*) AS core_audit_log_count FROM core_audit_log;
GO
