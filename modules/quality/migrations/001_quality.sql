-- Quality modul táblák

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'quality_inspections')
  CREATE TABLE quality_inspections (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    inspection_date DATE NOT NULL,
    product_code    NVARCHAR(100),
    product_name    NVARCHAR(200),
    batch_number    NVARCHAR(100),
    inspector       NVARCHAR(100),
    total_checked   INT DEFAULT 0,
    passed_count    INT DEFAULT 0,
    rejected_count  INT DEFAULT 0,
    reject_code     NVARCHAR(50),
    reject_reason   NVARCHAR(500),
    status          NVARCHAR(30) DEFAULT 'pending',
    notes           NVARCHAR(MAX),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_quality_date' AND object_id = OBJECT_ID('quality_inspections'))
  CREATE INDEX idx_quality_date ON quality_inspections(inspection_date DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'quality_8d_reports')
  CREATE TABLE quality_8d_reports (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    inspection_id   INT REFERENCES quality_inspections(id),
    report_number   NVARCHAR(50) NOT NULL,
    d1_team         NVARCHAR(500),
    d2_problem      NVARCHAR(MAX),
    d3_containment  NVARCHAR(MAX),
    d4_root_cause   NVARCHAR(MAX),
    d5_corrective   NVARCHAR(MAX),
    d6_implemented  NVARCHAR(MAX),
    d7_preventive   NVARCHAR(MAX),
    d8_recognition  NVARCHAR(MAX),
    status          NVARCHAR(30) DEFAULT 'open',
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
