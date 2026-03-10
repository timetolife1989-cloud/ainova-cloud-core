-- Migration 014: core_notifications tábla

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_notifications'
)
  CREATE TABLE core_notifications (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT,                              -- NULL = broadcast minden user-nek
    module_id   NVARCHAR(50),
    title       NVARCHAR(200) NOT NULL,
    message     NVARCHAR(MAX),
    severity    NVARCHAR(20) DEFAULT 'info',      -- 'info', 'warning', 'error', 'success'
    is_read     BIT NOT NULL DEFAULT 0,
    created_at  DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_user' AND object_id = OBJECT_ID('dbo.core_notifications'))
  CREATE INDEX idx_notifications_user ON core_notifications(user_id, is_read, created_at DESC);
GO
