-- Migration 012: core_module_settings tábla
-- Modul-specifikus beállítások tárolása (a manifest adminSettings-ből)

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_module_settings'
)
  CREATE TABLE core_module_settings (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    module_id     NVARCHAR(50)  NOT NULL,
    setting_key   NVARCHAR(100) NOT NULL,
    setting_value NVARCHAR(MAX),
    setting_type  NVARCHAR(20)  DEFAULT 'string',
    updated_by    NVARCHAR(100),
    updated_at    DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_module_settings' AND object_id = OBJECT_ID('dbo.core_module_settings'))
  ALTER TABLE core_module_settings ADD CONSTRAINT UQ_module_settings UNIQUE (module_id, setting_key);
GO
