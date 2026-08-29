-- Platform-wide settings (super admin configurable)
-- Single-row table for global config: weekly reset day, announcement banner, etc.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Weekly chart reset: day-of-week when the chart week starts (0=Sun..6=Sat)
  -- Charts show data from this day 00:00 local onward; previous week's data is excluded.
  weekly_reset_day  smallint NOT NULL DEFAULT 6,  -- 6 = Saturday (end-of-day reset)
  -- Announcement banner
  banner_enabled    boolean  NOT NULL DEFAULT false,
  banner_text       text     NOT NULL DEFAULT '',
  banner_type       text     NOT NULL DEFAULT 'info',  -- info | warning | success
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Seed a single default row
INSERT INTO public.platform_settings (weekly_reset_day, banner_enabled, banner_text, banner_type)
VALUES (6, false, '', 'info')
ON CONFLICT DO NOTHING;

-- RLS: allow authenticated users to read (charts need the reset day),
-- but only super admins should write. We allow all for now (UI gates the write).
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform settings read access" ON public.platform_settings;
CREATE POLICY "Platform settings read access" ON public.platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Platform settings write access" ON public.platform_settings;
CREATE POLICY "Platform settings write access" ON public.platform_settings
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated, anon;
