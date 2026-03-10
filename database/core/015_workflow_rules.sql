-- Workflow Rules table for automation engine
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'core_workflow_rules')
BEGIN
  CREATE TABLE core_workflow_rules (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    trigger_event   NVARCHAR(200) NOT NULL,
    conditions_json NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    actions_json    NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    is_enabled      BIT NOT NULL DEFAULT 1,
    module_id       NVARCHAR(100) NULL,
    created_by      INT NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

-- API Keys table for external integrations
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'core_api_keys')
BEGIN
  CREATE TABLE core_api_keys (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    api_key         NVARCHAR(64) NOT NULL UNIQUE,
    permissions     NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    rate_limit      INT NOT NULL DEFAULT 1000,
    is_active       BIT NOT NULL DEFAULT 1,
    last_used_at    DATETIME2 NULL,
    created_by      INT NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    expires_at      DATETIME2 NULL
  );
END;

-- Sites table for multi-site support
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'core_sites')
BEGIN
  CREATE TABLE core_sites (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    code            NVARCHAR(20) NOT NULL UNIQUE,
    address         NVARCHAR(500) NULL,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );

  -- Default site
  INSERT INTO core_sites (name, code) VALUES (N'Főtelephely', 'HQ');
END;

-- Dashboard layouts table for custom dashboards
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'core_dashboard_layouts')
BEGIN
  CREATE TABLE core_dashboard_layouts (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT NOT NULL,
    name            NVARCHAR(200) NOT NULL DEFAULT 'Default',
    layout_json     NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    is_default      BIT NOT NULL DEFAULT 0,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;
