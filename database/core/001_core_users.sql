-- Migration 001: core_users table
-- Bootstrap admin password: Admin1234! (must be changed on first login)

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_users'
)
BEGIN
  CREATE TABLE core_users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    username      NVARCHAR(100) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name     NVARCHAR(200),
    email         NVARCHAR(255),
    role          NVARCHAR(50) NOT NULL DEFAULT 'user',
    is_active     BIT NOT NULL DEFAULT 1,
    first_login   BIT NOT NULL DEFAULT 1,
    created_at    DATETIME2 DEFAULT SYSDATETIME(),
    updated_at    DATETIME2 DEFAULT SYSDATETIME()
  );

  ALTER TABLE core_users
    ADD CONSTRAINT UQ_core_users_username UNIQUE (username);
END
GO

-- Bootstrap admin user (password: Admin1234!, first_login=1 forces password change)
IF NOT EXISTS (SELECT 1 FROM core_users WHERE username = 'admin')
  INSERT INTO core_users (username, password_hash, full_name, role, first_login)
  VALUES ('admin', '$2b$12$aywHDatUa4u8cm5/Fx0q3OWkNX/h0DGMhzlUn222k31/7px48ciuy', 'Administrator', 'admin', 1);
GO

SELECT COUNT(*) AS core_users_count FROM core_users;
GO
