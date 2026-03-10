-- PLC Connector tables
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_devices')
BEGIN
  CREATE TABLE mod_plc_devices (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    protocol        NVARCHAR(20) NOT NULL DEFAULT 's7',
    ip_address      NVARCHAR(50) NOT NULL,
    port            INT NOT NULL DEFAULT 102,
    rack            INT NULL DEFAULT 0,
    slot            INT NULL DEFAULT 1,
    is_active       BIT NOT NULL DEFAULT 1,
    last_seen_at    DATETIME2 NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_registers')
BEGIN
  CREATE TABLE mod_plc_registers (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    device_id       INT NOT NULL REFERENCES mod_plc_devices(id),
    name            NVARCHAR(200) NOT NULL,
    address         NVARCHAR(50) NOT NULL,
    data_type       NVARCHAR(20) NOT NULL DEFAULT 'INT',
    unit            NVARCHAR(20) NULL,
    scale_factor    FLOAT NOT NULL DEFAULT 1.0,
    poll_interval   INT NOT NULL DEFAULT 5000,
    is_active       BIT NOT NULL DEFAULT 1
  );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_data')
BEGIN
  CREATE TABLE mod_plc_data (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    register_id     INT NOT NULL REFERENCES mod_plc_registers(id),
    raw_value       FLOAT NOT NULL,
    scaled_value    FLOAT NOT NULL,
    timestamp       DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );

  CREATE INDEX IX_plc_data_register_ts ON mod_plc_data (register_id, timestamp DESC);
END;
