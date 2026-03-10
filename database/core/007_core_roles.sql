-- Migration 007: core_roles tábla
-- Dinamikus szerepkörök — admin panelből konfigurálható

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_roles'
)
  CREATE TABLE core_roles (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    role_code   NVARCHAR(50)  NOT NULL,
    role_label  NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    color       NVARCHAR(50)  DEFAULT 'bg-gray-700 text-gray-300',
    icon        NVARCHAR(50)  DEFAULT 'User',
    priority    INT           DEFAULT 10,
    is_builtin  BIT           NOT NULL DEFAULT 0,
    is_active   BIT           NOT NULL DEFAULT 1,
    created_at  DATETIME2     DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_core_roles_code' AND object_id = OBJECT_ID('dbo.core_roles'))
  ALTER TABLE core_roles ADD CONSTRAINT UQ_core_roles_code UNIQUE (role_code);
GO

IF NOT EXISTS (SELECT 1 FROM core_roles WHERE role_code = 'admin')
BEGIN
  INSERT INTO core_roles (role_code, role_label, description, color, icon, priority, is_builtin)
  VALUES
    ('admin',   'Rendszergazda', 'Teljes hozzáférés',              'bg-purple-900 text-purple-200', 'Shield',    100, 1),
    ('manager', 'Vezető',        'Riportok, importok, felhasználók','bg-blue-900 text-blue-200',     'Briefcase',  50, 1),
    ('user',    'Felhasználó',   'Alap hozzáférés',                'bg-gray-700 text-gray-300',     'User',       10, 1);
END
GO

SELECT COUNT(*) AS core_roles_count FROM core_roles;
GO
