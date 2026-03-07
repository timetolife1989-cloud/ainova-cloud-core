-- Migration 002: core_sessions table
-- Stores DB-backed sessions for the SessionAdapter

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_sessions'
)
BEGIN
  CREATE TABLE core_sessions (
    session_id    UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id       INT NOT NULL,
    created_at    DATETIME2 DEFAULT SYSDATETIME(),
    expires_at    DATETIME2 NOT NULL,
    last_activity DATETIME2 DEFAULT SYSDATETIME(),
    CONSTRAINT FK_core_sessions_user
      FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE
  );
END
GO

-- Index on user_id (T-SQL: no IF NOT EXISTS on CREATE INDEX; use sys.indexes check)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'idx_core_sessions_user_id'
    AND object_id = OBJECT_ID('dbo.core_sessions')
)
  CREATE INDEX idx_core_sessions_user_id ON core_sessions(user_id);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'idx_core_sessions_expires_at'
    AND object_id = OBJECT_ID('dbo.core_sessions')
)
  CREATE INDEX idx_core_sessions_expires_at ON core_sessions(expires_at);
GO

SELECT COUNT(*) AS core_sessions_count FROM core_sessions;
GO
