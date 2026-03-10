-- Performance modul táblák

-- Teljesítmény bejegyzések
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'performance_entries')
  CREATE TABLE performance_entries (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    entry_date      DATE NOT NULL,
    worker_name     NVARCHAR(100) NOT NULL,
    team_name       NVARCHAR(100),
    task_code       NVARCHAR(50),
    task_name       NVARCHAR(200),
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 0,
    norm_time       DECIMAL(10,2),           -- Normaidő (unit-ból)
    actual_time     DECIMAL(10,2),           -- Valós idő (unit-ból)
    efficiency      DECIMAL(5,2),            -- Hatékonyság % (norm/actual*100)
    notes           NVARCHAR(500),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_perf_date' AND object_id = OBJECT_ID('performance_entries'))
  CREATE INDEX idx_perf_date ON performance_entries(entry_date DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_perf_worker' AND object_id = OBJECT_ID('performance_entries'))
  CREATE INDEX idx_perf_worker ON performance_entries(worker_name, entry_date DESC);
GO

-- KPI célok
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'performance_targets')
  CREATE TABLE performance_targets (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    target_type     NVARCHAR(20) NOT NULL,   -- 'worker' | 'team' | 'global'
    target_name     NVARCHAR(100),           -- worker/team neve (NULL ha global)
    period_type     NVARCHAR(20) NOT NULL,   -- 'daily' | 'weekly' | 'monthly'
    target_value    DECIMAL(10,2) NOT NULL,  -- Cél érték
    target_unit     NVARCHAR(50),            -- Mértékegység
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
