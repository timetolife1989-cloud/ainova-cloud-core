-- Fleet modul táblák

-- Járművek
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fleet_vehicles')
  CREATE TABLE fleet_vehicles (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    plate_number    NVARCHAR(20) NOT NULL,
    vehicle_name    NVARCHAR(100),
    vehicle_type    NVARCHAR(50),       -- 'car', 'van', 'truck', 'forklift', 'other'
    is_active       BIT NOT NULL DEFAULT 1,
    notes           NVARCHAR(500),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fleet_plate' AND object_id = OBJECT_ID('fleet_vehicles'))
  CREATE UNIQUE INDEX idx_fleet_plate ON fleet_vehicles(plate_number);
GO

-- Futás bejegyzések
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fleet_trips')
  CREATE TABLE fleet_trips (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id      INT NOT NULL REFERENCES fleet_vehicles(id),
    trip_date       DATE NOT NULL,
    driver_name     NVARCHAR(100),
    start_km        DECIMAL(10,1),
    end_km          DECIMAL(10,1),
    distance        DECIMAL(10,1),
    purpose         NVARCHAR(500),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fleet_trips_date' AND object_id = OBJECT_ID('fleet_trips'))
  CREATE INDEX idx_fleet_trips_date ON fleet_trips(trip_date DESC);
GO

-- Tankolások
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'fleet_refuels')
  CREATE TABLE fleet_refuels (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    vehicle_id      INT NOT NULL REFERENCES fleet_vehicles(id),
    refuel_date     DATE NOT NULL,
    amount          DECIMAL(10,2),
    cost            DECIMAL(10,2),
    km_at_refuel    DECIMAL(10,1),
    fuel_type       NVARCHAR(50),
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO
