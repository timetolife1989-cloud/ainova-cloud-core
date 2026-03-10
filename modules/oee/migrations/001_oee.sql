-- OEE modul táblák

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'oee_machines')
  CREATE TABLE oee_machines (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    machine_code    NVARCHAR(50) NOT NULL,
    machine_name    NVARCHAR(200) NOT NULL,
    area            NVARCHAR(100),
    is_active       BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_oee_machine_code' AND object_id = OBJECT_ID('oee_machines'))
  CREATE UNIQUE INDEX UQ_oee_machine_code ON oee_machines(machine_code);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'oee_records')
  CREATE TABLE oee_records (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    machine_id          INT NOT NULL REFERENCES oee_machines(id),
    record_date         DATE NOT NULL,
    shift               NVARCHAR(20),
    planned_time_min    DECIMAL(10,2) NOT NULL,
    run_time_min        DECIMAL(10,2) NOT NULL,
    ideal_cycle_sec     DECIMAL(10,2),
    total_count         INT DEFAULT 0,
    good_count          INT DEFAULT 0,
    reject_count        INT DEFAULT 0,
    availability_pct    DECIMAL(5,2),
    performance_pct     DECIMAL(5,2),
    quality_pct         DECIMAL(5,2),
    oee_pct             DECIMAL(5,2),
    notes               NVARCHAR(500),
    created_by          NVARCHAR(100),
    created_at          DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_oee_date_machine' AND object_id = OBJECT_ID('oee_records'))
  CREATE INDEX idx_oee_date_machine ON oee_records(record_date DESC, machine_id);
GO
