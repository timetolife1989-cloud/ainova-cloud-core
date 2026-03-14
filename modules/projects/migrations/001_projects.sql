-- Projects module tables
-- Projects, tasks (with hierarchy), costs

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects_projects')
CREATE TABLE projects_projects (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  name            NVARCHAR(300) NOT NULL,
  client_name     NVARCHAR(200) NULL,
  client_id       INT NULL,
  status          NVARCHAR(20) NOT NULL DEFAULT 'planning',
  start_date      NVARCHAR(10) NULL,
  end_date        NVARCHAR(10) NULL,
  budget          DECIMAL(12,2) NULL,
  actual_cost     DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency        NVARCHAR(3) NOT NULL DEFAULT 'HUF',
  description     NVARCHAR(2000) NULL,
  manager_id      INT NULL,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects_tasks')
CREATE TABLE projects_tasks (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  project_id      INT NOT NULL,
  parent_id       INT NULL,
  title           NVARCHAR(300) NOT NULL,
  description     NVARCHAR(2000) NULL,
  status          NVARCHAR(20) NOT NULL DEFAULT 'todo',
  assigned_to     INT NULL,
  assigned_name   NVARCHAR(200) NULL,
  start_date      NVARCHAR(10) NULL,
  due_date        NVARCHAR(10) NULL,
  estimated_hours DECIMAL(5,1) NULL,
  actual_hours    DECIMAL(5,1) NOT NULL DEFAULT 0,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects_costs')
CREATE TABLE projects_costs (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  project_id      INT NOT NULL,
  description     NVARCHAR(300) NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  cost_type       NVARCHAR(20) NOT NULL DEFAULT 'material',
  cost_date       NVARCHAR(10) NOT NULL,
  created_by      INT NULL,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proj_status')
  CREATE INDEX idx_proj_status ON projects_projects(status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proj_manager')
  CREATE INDEX idx_proj_manager ON projects_projects(manager_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proj_task_proj')
  CREATE INDEX idx_proj_task_proj ON projects_tasks(project_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proj_task_assigned')
  CREATE INDEX idx_proj_task_assigned ON projects_tasks(assigned_to);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_proj_cost_proj')
  CREATE INDEX idx_proj_cost_proj ON projects_costs(project_id);
