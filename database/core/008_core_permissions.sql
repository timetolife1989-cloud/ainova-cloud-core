-- Migration 008: core_permissions + core_role_permissions

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_permissions'
)
  CREATE TABLE core_permissions (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    permission_code NVARCHAR(100) NOT NULL,
    description     NVARCHAR(500),
    module_id       NVARCHAR(50),       -- NULL = core, egyébként modul ID
    is_builtin      BIT NOT NULL DEFAULT 0,
    created_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_core_permissions_code' AND object_id = OBJECT_ID('dbo.core_permissions'))
  ALTER TABLE core_permissions ADD CONSTRAINT UQ_core_permissions_code UNIQUE (permission_code);
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_role_permissions'
)
  CREATE TABLE core_role_permissions (
    role_id       INT NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES core_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
  );
GO

-- Beépített core permission-ök
IF NOT EXISTS (SELECT 1 FROM core_permissions WHERE permission_code = 'admin.access')
BEGIN
  INSERT INTO core_permissions (permission_code, description, module_id, is_builtin) VALUES
    ('admin.access',   'Admin panel hozzáférés',       NULL, 1),
    ('users.view',     'Felhasználók megtekintése',    NULL, 1),
    ('users.manage',   'Felhasználók kezelése',        NULL, 1),
    ('modules.toggle', 'Modulok be/kikapcsolása',      NULL, 1),
    ('settings.view',  'Beállítások megtekintése',     NULL, 1),
    ('settings.edit',  'Beállítások módosítása',       NULL, 1),
    ('data.import',    'Adatok importálása',           NULL, 1),
    ('data.export',    'Adatok exportálása',           NULL, 1),
    ('reports.view',   'Riportok megtekintése',        NULL, 1),
    ('reports.edit',   'Riportok szerkesztése',        NULL, 1),
    ('audit.view',     'Audit napló megtekintése',     NULL, 1);
END
GO

-- Admin: minden jogosultság
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.role_code = 'admin'
  AND NOT EXISTS (SELECT 1 FROM core_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
GO

-- Manager: import, export, riportok, felhasználók megtekintése
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.role_code = 'manager'
  AND p.permission_code IN ('users.view','data.import','data.export','reports.view','reports.edit','settings.view')
  AND NOT EXISTS (SELECT 1 FROM core_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
GO

-- User: riportok megtekintése
INSERT INTO core_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM core_roles r, core_permissions p
WHERE r.role_code = 'user'
  AND p.permission_code IN ('reports.view')
  AND NOT EXISTS (SELECT 1 FROM core_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
GO

SELECT COUNT(*) AS core_permissions_count FROM core_permissions;
GO
