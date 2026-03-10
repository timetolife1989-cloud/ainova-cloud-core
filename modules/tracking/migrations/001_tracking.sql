-- Tracking modul táblák

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tracking_items')
  CREATE TABLE tracking_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    reference_code  NVARCHAR(100),              -- Rendelés/feladat szám
    title           NVARCHAR(200) NOT NULL,
    description     NVARCHAR(MAX),
    status          NVARCHAR(50) NOT NULL DEFAULT 'Nyitott',
    priority        NVARCHAR(20) DEFAULT 'normal',
    assigned_to     NVARCHAR(100),
    quantity        DECIMAL(10,2),
    due_date        DATE,
    completed_at    DATETIME2,
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tracking_status' AND object_id = OBJECT_ID('tracking_items'))
  CREATE INDEX idx_tracking_status ON tracking_items(status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tracking_due' AND object_id = OBJECT_ID('tracking_items'))
  CREATE INDEX idx_tracking_due ON tracking_items(due_date);
GO

-- Státusz változás napló
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tracking_history')
  CREATE TABLE tracking_history (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    item_id     INT NOT NULL REFERENCES tracking_items(id) ON DELETE CASCADE,
    old_status  NVARCHAR(50),
    new_status  NVARCHAR(50) NOT NULL,
    changed_by  NVARCHAR(100),
    note        NVARCHAR(500),
    created_at  DATETIME2 DEFAULT SYSDATETIME()
  );
GO
