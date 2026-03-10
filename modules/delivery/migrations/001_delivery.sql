-- Delivery modul táblák

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'delivery_shipments')
  CREATE TABLE delivery_shipments (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    shipment_date   DATE NOT NULL,
    customer_name   NVARCHAR(200) NOT NULL,
    customer_code   NVARCHAR(50),
    order_number    NVARCHAR(100),
    quantity        DECIMAL(10,2) DEFAULT 0,
    weight          DECIMAL(10,2),
    value           DECIMAL(15,2),
    status          NVARCHAR(30) DEFAULT 'pending',  -- 'pending' | 'shipped' | 'delivered' | 'returned'
    notes           NVARCHAR(500),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_delivery_date' AND object_id = OBJECT_ID('delivery_shipments'))
  CREATE INDEX idx_delivery_date ON delivery_shipments(shipment_date DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_delivery_customer' AND object_id = OBJECT_ID('delivery_shipments'))
  CREATE INDEX idx_delivery_customer ON delivery_shipments(customer_name);
GO
