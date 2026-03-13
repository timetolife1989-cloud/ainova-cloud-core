-- ============================================================
-- AINOVA DRONE SYSTEM — Supabase Database Setup
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Project: ACI-Demo-Intelligence
-- ============================================================

-- 1. Drone Sessions Table
CREATE TABLE IF NOT EXISTS public.drone_sessions (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  model_used TEXT NOT NULL,
  gpu_config TEXT DEFAULT '2x RTX PRO 6000',
  total_results INTEGER DEFAULT 0,
  cost_usd FLOAT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  notes TEXT
);

-- 2. Drone Results Table
CREATE TABLE IF NOT EXISTS public.drone_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.drone_sessions(id),
  drone_type TEXT NOT NULL CHECK (drone_type IN ('tech_research', 'industry_data', 'competitor_analysis')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  summary TEXT,
  source_urls TEXT[],
  relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
  applied_to_aci BOOLEAN DEFAULT FALSE,
  applied_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_drone_results_type ON public.drone_results(drone_type);
CREATE INDEX IF NOT EXISTS idx_drone_results_category ON public.drone_results(category);
CREATE INDEX IF NOT EXISTS idx_drone_results_session ON public.drone_results(session_id);
CREATE INDEX IF NOT EXISTS idx_drone_results_score ON public.drone_results(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_drone_results_created ON public.drone_results(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.drone_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_results ENABLE ROW LEVEL SECURITY;

-- 5. Policies — service_role has full access (drones use service_role key)
CREATE POLICY "Service role full access on drone_sessions"
  ON public.drone_sessions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on drone_results"
  ON public.drone_results FOR ALL
  USING (true) WITH CHECK (true);

-- 6. Updated_at auto-trigger for drone_results
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drone_results_updated_at
    BEFORE UPDATE ON public.drone_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Verification: Check tables were created
-- ============================================================
SELECT 'drone_sessions' as table_name, count(*) as rows FROM public.drone_sessions
UNION ALL
SELECT 'drone_results' as table_name, count(*) as rows FROM public.drone_results;
