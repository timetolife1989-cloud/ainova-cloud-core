-- =============================================
-- 016: Sector Presets
-- ACI sector-based configuration presets
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'core_sector_presets') AND type = 'U')
BEGIN
  CREATE TABLE core_sector_presets (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    sector_id   NVARCHAR(30) NOT NULL,
    name_hu     NVARCHAR(100) NOT NULL,
    name_en     NVARCHAR(100) NOT NULL,
    name_de     NVARCHAR(100) NOT NULL,
    icon        NVARCHAR(50) NOT NULL,
    modules     NVARCHAR(MAX) NOT NULL,   -- JSON array of core module IDs
    optional_modules NVARCHAR(MAX) NULL,  -- JSON array of optional module IDs
    settings    NVARCHAR(MAX) NOT NULL,   -- JSON object with default settings
    recommended_tier NVARCHAR(20) NOT NULL DEFAULT 'basic',
    created_at  DATETIME2 DEFAULT GETUTCDATE(),

    CONSTRAINT UQ_sector_presets_sector_id UNIQUE (sector_id)
  );

  PRINT '[ACI] core_sector_presets created';
END
GO

-- Seed default sector presets
IF NOT EXISTS (SELECT 1 FROM core_sector_presets WHERE sector_id = 'manufacturing')
BEGIN
  INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
  VALUES (
    'manufacturing',
    N'Gyártás',
    N'Manufacturing',
    N'Fertigung',
    N'Factory',
    N'["inventory","invoicing","workforce","tracking","performance","scheduling","reports"]',
    N'["oee","plc-connector","shift-management","quality","maintenance","digital-twin"]',
    N'{"default_unit":"db","currency":"EUR"}',
    'professional'
  );
  PRINT '[ACI] Sector preset: manufacturing seeded';
END
GO

IF NOT EXISTS (SELECT 1 FROM core_sector_presets WHERE sector_id = 'retail')
BEGIN
  INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
  VALUES (
    'retail',
    N'Kiskereskedelem',
    N'Retail',
    N'Einzelhandel',
    N'ShoppingCart',
    N'["inventory","invoicing","purchasing","pos","reports","file-import"]',
    N'["crm","workforce"]',
    N'{"default_unit":"db","currency":"HUF"}',
    'basic'
  );
  PRINT '[ACI] Sector preset: retail seeded';
END
GO

IF NOT EXISTS (SELECT 1 FROM core_sector_presets WHERE sector_id = 'services')
BEGIN
  INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
  VALUES (
    'services',
    N'Szolgáltatás',
    N'Services',
    N'Dienstleistung',
    N'Wrench',
    N'["invoicing","worksheets","crm","scheduling","tracking","reports"]',
    N'["inventory","fleet"]',
    N'{"default_unit":"óra","currency":"HUF"}',
    'professional'
  );
  PRINT '[ACI] Sector preset: services seeded';
END
GO

IF NOT EXISTS (SELECT 1 FROM core_sector_presets WHERE sector_id = 'gastronomy')
BEGIN
  INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
  VALUES (
    'gastronomy',
    N'Vendéglátás',
    N'Food & Beverage',
    N'Gastronomie',
    N'ChefHat',
    N'["inventory","invoicing","purchasing","reports","file-import"]',
    N'["workforce","quality","pos"]',
    N'{"default_unit":"kg","currency":"HUF"}',
    'basic'
  );
  PRINT '[ACI] Sector preset: gastronomy seeded';
END
GO

IF NOT EXISTS (SELECT 1 FROM core_sector_presets WHERE sector_id = 'construction')
BEGIN
  INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
  VALUES (
    'construction',
    N'Építőipar',
    N'Construction',
    N'Bauwesen',
    N'HardHat',
    N'["inventory","invoicing","tracking","fleet","reports"]',
    N'["workforce","purchasing","crm"]',
    N'{"default_unit":"db","currency":"HUF"}',
    'professional'
  );
  PRINT '[ACI] Sector preset: construction seeded';
END
GO

IF NOT EXISTS (SELECT 1 FROM core_sector_presets WHERE sector_id = 'logistics')
BEGIN
  INSERT INTO core_sector_presets (sector_id, name_hu, name_en, name_de, icon, modules, optional_modules, settings, recommended_tier)
  VALUES (
    'logistics',
    N'Logisztika',
    N'Logistics',
    N'Logistik',
    N'Truck',
    N'["fleet","delivery","tracking","inventory","invoicing","workforce","reports"]',
    N'["scheduling","crm","maintenance"]',
    N'{"default_unit":"db","currency":"EUR"}',
    'professional'
  );
  PRINT '[ACI] Sector preset: logistics seeded';
END
GO
