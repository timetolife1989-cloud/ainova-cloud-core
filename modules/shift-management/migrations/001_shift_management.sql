-- Shift Management táblák

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'shift_definitions')
  CREATE TABLE shift_definitions (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    shift_name      NVARCHAR(100) NOT NULL,
    start_time      NVARCHAR(5) NOT NULL,    -- 'HH:MM'
    end_time        NVARCHAR(5) NOT NULL,
    color           NVARCHAR(20),
    is_active       BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'shift_assignments')
  CREATE TABLE shift_assignments (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    worker_name     NVARCHAR(100) NOT NULL,
    team_name       NVARCHAR(100),
    shift_id        INT NOT NULL REFERENCES shift_definitions(id),
    assignment_date DATE NOT NULL,
    status          NVARCHAR(20) DEFAULT 'planned',
    notes           NVARCHAR(500),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shift_assign_date' AND object_id = OBJECT_ID('shift_assignments'))
  CREATE INDEX idx_shift_assign_date ON shift_assignments(assignment_date, worker_name);
GO
