-- Appointments module tables
-- Slot definitions + booking records

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'appointments_slots')
CREATE TABLE appointments_slots (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  provider_id     INT NULL,
  provider_name   NVARCHAR(200) NOT NULL DEFAULT '',
  day_of_week     SMALLINT NOT NULL,                  -- 0=Monday .. 6=Sunday
  start_time      NVARCHAR(5) NOT NULL,               -- HH:MM
  end_time        NVARCHAR(5) NOT NULL,               -- HH:MM
  slot_duration   INT NOT NULL DEFAULT 30,             -- minutes
  is_active       BIT NOT NULL DEFAULT 1,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'appointments_bookings')
CREATE TABLE appointments_bookings (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  provider_id     INT NULL,
  provider_name   NVARCHAR(200) NOT NULL DEFAULT '',
  customer_id     INT NULL,
  customer_name   NVARCHAR(200) NOT NULL,
  customer_phone  NVARCHAR(50) NULL,
  customer_email  NVARCHAR(200) NULL,
  service_type    NVARCHAR(100) NULL,
  booking_date    NVARCHAR(10) NOT NULL,              -- YYYY-MM-DD
  start_time      NVARCHAR(5) NOT NULL,               -- HH:MM
  end_time        NVARCHAR(5) NOT NULL,               -- HH:MM
  status          NVARCHAR(20) NOT NULL DEFAULT 'confirmed',
  notes           NVARCHAR(2000) NULL,
  reminder_sent   BIT NOT NULL DEFAULT 0,
  created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_appt_slots_provider')
  CREATE INDEX idx_appt_slots_provider ON appointments_slots(provider_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_appt_book_provider')
  CREATE INDEX idx_appt_book_provider ON appointments_bookings(provider_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_appt_book_date')
  CREATE INDEX idx_appt_book_date ON appointments_bookings(booking_date);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_appt_book_status')
  CREATE INDEX idx_appt_book_status ON appointments_bookings(status);
