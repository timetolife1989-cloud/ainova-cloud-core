-- Migration 010: core_translations tábla

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_translations'
)
  CREATE TABLE core_translations (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    translation_key   NVARCHAR(200) NOT NULL,
    locale            NVARCHAR(10)  NOT NULL,    -- 'hu', 'en', 'de'
    translation_value NVARCHAR(MAX) NOT NULL,
    updated_at        DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_translations_key_locale' AND object_id = OBJECT_ID('dbo.core_translations'))
  ALTER TABLE core_translations ADD CONSTRAINT UQ_translations_key_locale UNIQUE (translation_key, locale);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_translations_locale' AND object_id = OBJECT_ID('dbo.core_translations'))
  CREATE INDEX idx_translations_locale ON core_translations(locale);
GO
