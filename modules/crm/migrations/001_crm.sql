-- CRM Customers
CREATE TABLE IF NOT EXISTS crm_customers (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  name            NVARCHAR(200) NOT NULL,
  company_name    NVARCHAR(200),
  email           NVARCHAR(200),
  phone           NVARCHAR(50),
  address         NVARCHAR(MAX),
  city            NVARCHAR(100),
  postal_code     NVARCHAR(10),
  country         NVARCHAR(2) DEFAULT 'HU',
  tax_number      NVARCHAR(30),
  eu_tax_number   NVARCHAR(30),
  customer_type   NVARCHAR(20) DEFAULT 'company',
  source          NVARCHAR(50),
  notes           NVARCHAR(MAX),
  is_active       BIT DEFAULT 1,
  created_at      DATETIME2 DEFAULT GETUTCDATE(),
  updated_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- CRM Interactions
CREATE TABLE IF NOT EXISTS crm_interactions (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  type            NVARCHAR(20) NOT NULL,
  subject         NVARCHAR(300),
  description     NVARCHAR(MAX),
  interaction_date DATETIME2 DEFAULT GETUTCDATE(),
  next_follow_up  DATE,
  created_by      INT REFERENCES core_users(id),
  created_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- CRM Opportunities (pipeline)
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  customer_id     INT NOT NULL REFERENCES crm_customers(id),
  title           NVARCHAR(300) NOT NULL,
  stage           NVARCHAR(20) DEFAULT 'lead',
  value           DECIMAL(12,2),
  currency        NVARCHAR(3) DEFAULT 'HUF',
  probability     SMALLINT DEFAULT 0,
  expected_close  DATE,
  assigned_to     INT REFERENCES core_users(id),
  notes           NVARCHAR(MAX),
  created_at      DATETIME2 DEFAULT GETUTCDATE(),
  updated_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- CRM Reminders
CREATE TABLE IF NOT EXISTS crm_reminders (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  customer_id     INT REFERENCES crm_customers(id),
  opportunity_id  INT REFERENCES crm_opportunities(id),
  user_id         INT NOT NULL REFERENCES core_users(id),
  title           NVARCHAR(200) NOT NULL,
  due_date        DATETIME2 NOT NULL,
  is_completed    BIT DEFAULT 0,
  completed_at    DATETIME2,
  created_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- Indexes
CREATE INDEX idx_crm_cust_name ON crm_customers(name);
CREATE INDEX idx_crm_cust_email ON crm_customers(email);
CREATE INDEX idx_crm_cust_active ON crm_customers(is_active);
CREATE INDEX idx_crm_inter_cust ON crm_interactions(customer_id);
CREATE INDEX idx_crm_opp_cust ON crm_opportunities(customer_id);
CREATE INDEX idx_crm_opp_stage ON crm_opportunities(stage);
CREATE INDEX idx_crm_remind_user ON crm_reminders(user_id, is_completed);
CREATE INDEX idx_crm_remind_due ON crm_reminders(due_date);
