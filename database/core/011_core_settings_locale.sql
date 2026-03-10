-- Migration 011: app_locale setting

IF NOT EXISTS (SELECT 1 FROM core_settings WHERE setting_key = 'app_locale')
  INSERT INTO core_settings (setting_key, setting_value, setting_type, description)
  VALUES ('app_locale', 'hu', 'string', 'Application locale (hu, en, de)');
GO
