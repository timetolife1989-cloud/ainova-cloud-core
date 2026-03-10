-- Inventory modul táblák

-- Termékek / készlet tételek
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'inventory_items')
  CREATE TABLE inventory_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    sku             NVARCHAR(50) NOT NULL,
    item_name       NVARCHAR(200) NOT NULL,
    category        NVARCHAR(100),
    current_qty     DECIMAL(10,2) DEFAULT 0,
    min_qty         DECIMAL(10,2) DEFAULT 0,
    max_qty         DECIMAL(10,2),
    unit_name       NVARCHAR(50),
    location        NVARCHAR(100),
    notes           NVARCHAR(500),
    is_active       BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_sku' AND object_id = OBJECT_ID('inventory_items'))
  CREATE UNIQUE INDEX idx_inv_sku ON inventory_items(sku);
GO

-- Készlet mozgások
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'inventory_movements')
  CREATE TABLE inventory_movements (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    item_id         INT NOT NULL REFERENCES inventory_items(id),
    movement_type   NVARCHAR(20) NOT NULL,   -- 'in' | 'out' | 'adjustment'
    quantity        DECIMAL(10,2) NOT NULL,
    reference       NVARCHAR(100),           -- Rendelés szám, stb.
    notes           NVARCHAR(500),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inv_mov_item' AND object_id = OBJECT_ID('inventory_movements'))
  CREATE INDEX idx_inv_mov_item ON inventory_movements(item_id, created_at DESC);
GO
