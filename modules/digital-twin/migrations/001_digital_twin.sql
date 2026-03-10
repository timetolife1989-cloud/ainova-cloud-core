-- Digital Twin tables
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_dt_layouts')
BEGIN
  CREATE TABLE mod_dt_layouts (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    site_id         INT NULL,
    layout_json     NVARCHAR(MAX) NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    is_active       BIT NOT NULL DEFAULT 1,
    created_by      INT NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_dt_machines')
BEGIN
  CREATE TABLE mod_dt_machines (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    layout_id       INT NOT NULL REFERENCES mod_dt_layouts(id),
    name            NVARCHAR(200) NOT NULL,
    machine_type    NVARCHAR(50) NOT NULL DEFAULT 'generic',
    pos_x           FLOAT NOT NULL DEFAULT 0,
    pos_y           FLOAT NOT NULL DEFAULT 0,
    width           FLOAT NOT NULL DEFAULT 100,
    height          FLOAT NOT NULL DEFAULT 60,
    status          NVARCHAR(20) NOT NULL DEFAULT 'idle',
    linked_oee_id   INT NULL,
    linked_plc_id   INT NULL,
    meta_json       NVARCHAR(MAX) NULL
  );
END;
