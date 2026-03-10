-- Migration 006: core_license tábla
-- A telepítés licencinformációit tárolja: tier, engedélyezett modulok, lejárat.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_license'
)
  CREATE TABLE core_license (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    license_key     NVARCHAR(255) NOT NULL,
    tier            NVARCHAR(50)  NOT NULL DEFAULT 'basic',   -- 'basic', 'professional', 'enterprise', 'dev'
    customer_name   NVARCHAR(200),
    customer_email  NVARCHAR(255),
    modules_allowed NVARCHAR(MAX),                            -- JSON array: ["workforce","tracking","fleet"]
    features_allowed NVARCHAR(MAX),                           -- JSON array: ["multi_site","api_gateway"]
    max_users       INT           DEFAULT 10,                 -- Max felhasználó szám
    issued_at       DATETIME2     DEFAULT SYSDATETIME(),
    expires_at      DATETIME2,                                -- NULL = nem jár le (lifetime)
    is_active       BIT           NOT NULL DEFAULT 1,
    created_at      DATETIME2     DEFAULT SYSDATETIME()
  );
GO

-- Dev license (fejlesztéshez — mindent engedélyez, nem jár le)
IF NOT EXISTS (SELECT 1 FROM core_license WHERE tier = 'dev')
  INSERT INTO core_license (license_key, tier, customer_name, modules_allowed, features_allowed, max_users, expires_at)
  VALUES (
    'DEV-0000-0000-0000',
    'dev',
    'Development',
    '["*"]',
    '["*"]',
    999,
    NULL
  );
GO

SELECT COUNT(*) AS core_license_count FROM core_license;
GO
