-- Migration 003: core_settings table
-- Key-value store for app configuration and branding

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_settings'
)
  CREATE TABLE core_settings (
    setting_key   NVARCHAR(100) PRIMARY KEY,
    setting_value NVARCHAR(MAX),
    setting_type  NVARCHAR(20) NOT NULL DEFAULT 'string',
    description   NVARCHAR(500),
    updated_by    NVARCHAR(100),
    updated_at    DATETIME2 DEFAULT SYSDATETIME()
  );
GO

-- Default settings (only insert if not already present)
IF NOT EXISTS (SELECT 1 FROM core_settings WHERE setting_key = 'app_name')
BEGIN
  INSERT INTO core_settings (setting_key, setting_value, setting_type, description)
  VALUES
    ('app_name',            'Ainova Cloud Intelligence', 'string',  'Application name (shown in header)'),
    ('app_primary_color',   '#6366f1',           'string',  'Primary color hex'),
    ('app_secondary_color', '#8b5cf6',           'string',  'Secondary color hex'),
    ('app_logo_path',       '',                  'string',  'Logo file path relative to UPLOAD_DIR'),
    ('active_modules',      '[]',                'json',    'Active module IDs (JSON array)'),
    ('setup_completed',     'false',             'boolean', 'Setup wizard completed?');
END
GO

SELECT COUNT(*) AS core_settings_count FROM core_settings;
GO
