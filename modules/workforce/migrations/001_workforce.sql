-- Workforce modul tábla: napi műszaki létszám

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'workforce_daily')
  CREATE TABLE workforce_daily (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    record_date     DATE NOT NULL,
    shift_name      NVARCHAR(50),               -- Műszak neve (admin setting-ből konfigurálható)
    area_name       NVARCHAR(100),              -- Terület/részleg neve
    planned_count   DECIMAL(10,2) DEFAULT 0,    -- Tervezett létszám (unit_id szerinti egységben)
    actual_count    DECIMAL(10,2) DEFAULT 0,    -- Tényleges létszám
    absent_count    DECIMAL(10,2) DEFAULT 0,    -- Hiányzók száma
    notes           NVARCHAR(500),
    recorded_by     NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_workforce_daily' AND object_id = OBJECT_ID('workforce_daily'))
  CREATE UNIQUE INDEX UQ_workforce_daily ON workforce_daily(record_date, shift_name, area_name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_workforce_date' AND object_id = OBJECT_ID('workforce_daily'))
  CREATE INDEX idx_workforce_date ON workforce_daily(record_date DESC);
GO
