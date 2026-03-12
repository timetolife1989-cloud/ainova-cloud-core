-- =========================================================
-- PLC Connector fejlesztések — 002-es migráció
-- Riasztások, driver konfig, lekérdezés státusz
-- =========================================================

-- PLC riasztási szabályok (küszöbérték alapú alert konfiguráció)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_alerts')
BEGIN
  CREATE TABLE mod_plc_alerts (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    device_id       INT NOT NULL REFERENCES mod_plc_devices(id) ON DELETE CASCADE,
    register_id     INT NOT NULL REFERENCES mod_plc_registers(id) ON DELETE CASCADE,
    alert_name      NVARCHAR(200) NOT NULL,
    condition       NVARCHAR(20) NOT NULL,   -- gt|lt|eq|ne|gte|lte|between|outside
    threshold_low   FLOAT NULL,              -- alsó küszöb (between/outside esetén kötelező)
    threshold_high  FLOAT NULL,              -- felső küszöb (between/outside esetén kötelező)
    severity        NVARCHAR(20) NOT NULL DEFAULT 'warning', -- info|warning|critical
    message_hu      NVARCHAR(500) NULL,
    message_en      NVARCHAR(500) NULL,
    cooldown_sec    INT NOT NULL DEFAULT 300, -- minimum ennyi másodperc között küld új alertet
    notify_email    BIT NOT NULL DEFAULT 0,
    notify_slack    BIT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    last_triggered_at DATETIME2 NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

-- PLC illesztőprogram konfiguráció (protokoll specifikus JSON beállítások)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_driver_config')
BEGIN
  CREATE TABLE mod_plc_driver_config (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    device_id       INT NOT NULL UNIQUE REFERENCES mod_plc_devices(id) ON DELETE CASCADE,
    protocol        NVARCHAR(30) NOT NULL,  -- s7|modbus_tcp|modbus_rtu|mqtt|opcua
    -- S7 specifikus
    s7_model        NVARCHAR(50) NULL,      -- S300|S400|S1200|S1500|Logo
    s7_timeout_ms   INT NOT NULL DEFAULT 3000,
    -- Modbus TCP specifikus
    modbus_unit_id  INT NULL DEFAULT 1,     -- Slave ID / Unit ID (0-255)
    modbus_big_endian BIT NOT NULL DEFAULT 1,
    -- Modbus RTU specifikus  
    serial_port     NVARCHAR(50) NULL,      -- /dev/ttyS0 | COM3
    serial_baud     INT NULL DEFAULT 9600,
    serial_parity   NVARCHAR(5) NULL DEFAULT 'none',  -- none|even|odd
    -- MQTT specifikus
    mqtt_broker_url NVARCHAR(500) NULL,     -- mqtts://broker.example.com:8883
    mqtt_topic_sub  NVARCHAR(500) NULL,     -- feliratkozási topik pattern
    mqtt_topic_pub  NVARCHAR(500) NULL,     -- publikálási topik alap
    mqtt_client_id  NVARCHAR(200) NULL,
    mqtt_username   NVARCHAR(100) NULL,
    mqtt_password_ref NVARCHAR(200) NULL,   -- env kulcs referencia
    mqtt_qos        INT NOT NULL DEFAULT 1, -- 0|1|2
    -- OPC-UA specifikus
    opcua_endpoint  NVARCHAR(500) NULL,     -- opc.tcp://192.168.1.10:4840
    opcua_security  NVARCHAR(50) NULL DEFAULT 'None', -- None|Basic128|Basic256
    opcua_user      NVARCHAR(100) NULL,
    opcua_password_ref NVARCHAR(200) NULL,
    -- Extra JSON (protocol-specifikus opciók)
    extra_config    NVARCHAR(MAX) NULL,     -- {}, opcionális JSON
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

-- PLC lekérdezési státusz napló (eszközönként az utolsó poll eredménye)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_poll_status')
BEGIN
  CREATE TABLE mod_plc_poll_status (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    device_id       INT NOT NULL UNIQUE REFERENCES mod_plc_devices(id) ON DELETE CASCADE,
    last_poll_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    poll_status     NVARCHAR(20) NOT NULL,   -- ok|timeout|error|connecting
    poll_latency_ms INT NULL,
    registers_read  INT NOT NULL DEFAULT 0,
    error_code      NVARCHAR(100) NULL,
    error_message   NVARCHAR(500) NULL,
    consecutive_errors INT NOT NULL DEFAULT 0,
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

-- Riasztás esemény napló (minden egyes kiváltott alert rögzítése)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_plc_alert_events')
BEGIN
  CREATE TABLE mod_plc_alert_events (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    alert_id        INT NOT NULL REFERENCES mod_plc_alerts(id) ON DELETE CASCADE,
    device_id       INT NOT NULL,
    register_id     INT NOT NULL,
    trigger_value   FLOAT NULL,           -- a kiváltó érték
    severity        NVARCHAR(20) NOT NULL,
    message         NVARCHAR(500) NULL,
    acknowledged    BIT NOT NULL DEFAULT 0,
    acknowledged_by INT NULL REFERENCES core_users(id),
    acknowledged_at DATETIME2 NULL,
    occurred_at     DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );

  CREATE INDEX IX_plc_alert_events_device ON mod_plc_alert_events (device_id, occurred_at DESC);
  CREATE INDEX IX_plc_alert_events_ack ON mod_plc_alert_events (acknowledged, occurred_at DESC);
END;
