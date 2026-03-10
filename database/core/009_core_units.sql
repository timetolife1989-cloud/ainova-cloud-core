-- Migration 009: core_units tábla — Univerzális mértékegység rendszer

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_units'
)
  CREATE TABLE core_units (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    unit_code   NVARCHAR(50)  NOT NULL,       -- 'minutes', 'pieces', 'kg', 'eur'
    unit_label  NVARCHAR(100) NOT NULL,       -- 'perc', 'darab', 'kilogramm'
    unit_type   NVARCHAR(50)  NOT NULL,       -- 'time', 'count', 'weight', 'currency', 'ratio', 'length', 'volume', 'distance', 'custom'
    symbol      NVARCHAR(20),                 -- 'min', 'db', 'kg', '€', '%'
    decimals    INT           DEFAULT 2,
    is_builtin  BIT           NOT NULL DEFAULT 0,
    is_active   BIT           NOT NULL DEFAULT 1,
    created_at  DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_core_units_code' AND object_id = OBJECT_ID('dbo.core_units'))
  ALTER TABLE core_units ADD CONSTRAINT UQ_core_units_code UNIQUE (unit_code);
GO

IF NOT EXISTS (SELECT 1 FROM core_units WHERE unit_code = 'minutes')
BEGIN
  INSERT INTO core_units (unit_code, unit_label, unit_type, symbol, decimals, is_builtin) VALUES
    ('minutes',  'perc',       'time',     'min',  2, 1),
    ('hours',    'óra',        'time',     'ó',    1, 1),
    ('pieces',   'darab',      'count',    'db',   0, 1),
    ('kg',       'kilogramm',  'weight',   'kg',   2, 1),
    ('tons',     'tonna',      'weight',   't',    2, 1),
    ('meters',   'méter',      'length',   'm',    2, 1),
    ('liters',   'liter',      'volume',   'l',    2, 1),
    ('eur',      'EUR',        'currency', '€',    2, 1),
    ('huf',      'HUF',        'currency', 'Ft',   0, 1),
    ('usd',      'USD',        'currency', '$',    2, 1),
    ('percent',  'százalék',   'ratio',    '%',    1, 1),
    ('km',       'kilométer',  'distance', 'km',   1, 1);
END
GO

SELECT COUNT(*) AS core_units_count FROM core_units;
GO
