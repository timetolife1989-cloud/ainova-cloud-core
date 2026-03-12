-- Workforce v2: Add overtime tracking columns
-- Supports flexible overtime recording per shift/area

ALTER TABLE workforce_daily ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(10,2) DEFAULT 0;
ALTER TABLE workforce_daily ADD COLUMN IF NOT EXISTS overtime_workers INTEGER DEFAULT 0;
