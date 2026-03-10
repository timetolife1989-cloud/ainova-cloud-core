-- Maintenance modul táblák

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'maintenance_assets')
  CREATE TABLE maintenance_assets (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    asset_code      NVARCHAR(50) NOT NULL,
    asset_name      NVARCHAR(200) NOT NULL,
    asset_type      NVARCHAR(50),
    location        NVARCHAR(100),
    is_active       BIT DEFAULT 1,
    notes           NVARCHAR(500),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_maint_asset_code' AND object_id = OBJECT_ID('maintenance_assets'))
  CREATE UNIQUE INDEX UQ_maint_asset_code ON maintenance_assets(asset_code);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'maintenance_schedules')
  CREATE TABLE maintenance_schedules (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    asset_id        INT NOT NULL REFERENCES maintenance_assets(id),
    task_name       NVARCHAR(200) NOT NULL,
    interval_days   INT NOT NULL,
    last_done_date  DATE,
    next_due_date   DATE,
    priority        NVARCHAR(20) DEFAULT 'normal',
    assigned_to     NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_maint_due' AND object_id = OBJECT_ID('maintenance_schedules'))
  CREATE INDEX idx_maint_due ON maintenance_schedules(next_due_date);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'maintenance_log')
  CREATE TABLE maintenance_log (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    schedule_id     INT REFERENCES maintenance_schedules(id),
    asset_id        INT NOT NULL REFERENCES maintenance_assets(id),
    done_date       DATE NOT NULL,
    duration_min    INT,
    cost            DECIMAL(10,2),
    notes           NVARCHAR(MAX),
    performed_by    NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
