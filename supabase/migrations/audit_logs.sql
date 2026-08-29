-- ── Audit Logs Table ──────────────────────────────────────────────
-- Tracks all actions made by admins and members within Ecometricus.
-- Each log entry captures: who did what, when, and contextual details.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name  TEXT NOT NULL DEFAULT 'Unknown',
  actor_role  TEXT NOT NULL DEFAULT 'member',
  action      TEXT NOT NULL,                    -- e.g. 'outlet_added', 'outlet_removed', 'settings_saved'
  entity_type TEXT NOT NULL DEFAULT 'general',  -- e.g. 'outlet', 'company', 'personnel', 'benchmark'
  entity_name TEXT,                             -- name of the affected entity
  description TEXT,                             -- human-readable summary
  metadata    JSONB DEFAULT '{}'::jsonb,        -- additional context (old/new values, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own audit logs
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own audit logs (for cleanup)
CREATE POLICY "Users can delete own audit logs"
  ON public.audit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
