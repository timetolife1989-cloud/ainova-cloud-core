-- Quality modul: Hibakód katalógus tábla

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'quality_defect_codes')
  CREATE TABLE quality_defect_codes (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    code        NVARCHAR(50) NOT NULL UNIQUE,
    name_hu     NVARCHAR(200) NOT NULL,
    name_en     NVARCHAR(200),
    name_de     NVARCHAR(200),
    category    NVARCHAR(100),
    severity    NVARCHAR(30) DEFAULT 'minor',  -- minor, major, critical
    is_active   BIT DEFAULT 1,
    created_at  DATETIME2 DEFAULT SYSDATETIME(),
    updated_at  DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_defect_codes_code' AND object_id = OBJECT_ID('quality_defect_codes'))
  CREATE INDEX idx_defect_codes_code ON quality_defect_codes(code);
GO
