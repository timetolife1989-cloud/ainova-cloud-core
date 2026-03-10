-- Scheduling modul táblák

-- Kapacitás tervek
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'scheduling_capacity')
  CREATE TABLE scheduling_capacity (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    week_start      DATE NOT NULL,           -- Hét kezdete (hétfő)
    resource_type   NVARCHAR(50) NOT NULL,   -- 'worker' | 'machine' | 'area'
    resource_name   NVARCHAR(100) NOT NULL,
    planned_hours   DECIMAL(10,2) DEFAULT 0,
    allocated_hours DECIMAL(10,2) DEFAULT 0,
    actual_hours    DECIMAL(10,2) DEFAULT 0,
    notes           NVARCHAR(500),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_sched_week' AND object_id = OBJECT_ID('scheduling_capacity'))
  CREATE INDEX idx_sched_week ON scheduling_capacity(week_start DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_sched_resource' AND object_id = OBJECT_ID('scheduling_capacity'))
  CREATE UNIQUE INDEX UQ_sched_resource ON scheduling_capacity(week_start, resource_type, resource_name);
GO

-- Allokációk (feladatok erőforrásokhoz rendelése)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'scheduling_allocations')
  CREATE TABLE scheduling_allocations (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    capacity_id     INT NOT NULL REFERENCES scheduling_capacity(id) ON DELETE CASCADE,
    task_name       NVARCHAR(200) NOT NULL,
    task_code       NVARCHAR(50),
    hours           DECIMAL(10,2) NOT NULL,
    priority        INT DEFAULT 0,
    status          NVARCHAR(20) DEFAULT 'planned',  -- 'planned' | 'in_progress' | 'done'
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
