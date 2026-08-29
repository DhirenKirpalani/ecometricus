-- ─────────────────────────────────────────────────────────────
-- Fix: Reload PostgREST schema cache + ensure resource_logs columns
-- ─────────────────────────────────────────────────────────────

-- 1. Ensure resource_logs has all expected columns
-- Actual table schema uses water_liters and energy_kwh (not amount + resource_type)
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS water_liters NUMERIC DEFAULT 0;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS energy_kwh NUMERIC DEFAULT 0;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS outlet_name TEXT;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;

-- 2. Ensure food_waste_logs has all expected columns
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS outlet_name TEXT;
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS images JSONB;
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS managed_by TEXT;

-- 3. Reload PostgREST schema cache (fixes "column not found in schema cache" errors)
NOTIFY pgrst, 'reload schema';

-- 4. Alternative: call the reload function if available
DO $$
BEGIN
  BEGIN
    PERFORM pgrst_reload_schema();
  EXCEPTION WHEN OTHERS THEN
    -- Function may not exist, NOTIFY above should suffice
    NULL;
  END;
END $$;

-- 5. Ensure daily_checkins table exists (for streak tracking)
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name     TEXT,
    user_role     TEXT,
    outlet_code   TEXT,
    waste_entries   INTEGER DEFAULT 0,
    water_entries   INTEGER DEFAULT 0,
    energy_entries  INTEGER DEFAULT 0,
    streak_days   INTEGER DEFAULT 1,
    checkin_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date DESC);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own checkins" ON daily_checkins;
CREATE POLICY "Users can view own checkins" ON daily_checkins FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own checkins" ON daily_checkins;
CREATE POLICY "Users can insert own checkins" ON daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own checkins" ON daily_checkins;
CREATE POLICY "Users can update own checkins" ON daily_checkins FOR UPDATE USING (auth.uid() = user_id);
GRANT ALL ON public.daily_checkins TO authenticated, anon;

-- 6. Ensure record_daily_checkin function exists
CREATE OR REPLACE FUNCTION record_daily_checkin(
    p_user_id   UUID,
    p_user_name TEXT,
    p_user_role TEXT,
    p_outlet_code TEXT,
    p_entry_type TEXT
)
RETURNS TABLE(streak_days INTEGER, checkin_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    yesterday_date DATE := CURRENT_DATE - 1;
    prev_streak INTEGER := 0;
    existing_record RECORD;
BEGIN
    SELECT * INTO existing_record FROM daily_checkins
    WHERE user_id = p_user_id AND checkin_date = today_date;

    IF FOUND THEN
        IF p_entry_type = 'waste' THEN
            UPDATE daily_checkins SET waste_entries = waste_entries + 1
            WHERE user_id = p_user_id AND checkin_date = today_date;
        ELSIF p_entry_type = 'water' THEN
            UPDATE daily_checkins SET water_entries = water_entries + 1
            WHERE user_id = p_user_id AND checkin_date = today_date;
        ELSIF p_entry_type = 'energy' THEN
            UPDATE daily_checkins SET energy_entries = energy_entries + 1
            WHERE user_id = p_user_id AND checkin_date = today_date;
        END IF;
        RETURN QUERY SELECT existing_record.streak_days, today_date;
    ELSE
        SELECT streak_days INTO prev_streak
        FROM daily_checkins
        WHERE user_id = p_user_id AND checkin_date = yesterday_date
        LIMIT 1;

        INSERT INTO daily_checkins (
            user_id, user_name, user_role, outlet_code,
            waste_entries, water_entries, energy_entries,
            streak_days, checkin_date
        ) VALUES (
            p_user_id, p_user_name, p_user_role, p_outlet_code,
            CASE WHEN p_entry_type = 'waste' THEN 1 ELSE 0 END,
            CASE WHEN p_entry_type = 'water' THEN 1 ELSE 0 END,
            CASE WHEN p_entry_type = 'energy' THEN 1 ELSE 0 END,
            COALESCE(prev_streak + 1, 1),
            today_date
        )
        ON CONFLICT (user_id, checkin_date) DO UPDATE SET
            waste_entries = daily_checkins.waste_entries + CASE WHEN p_entry_type = 'waste' THEN 1 ELSE 0 END,
            water_entries = daily_checkins.water_entries + CASE WHEN p_entry_type = 'water' THEN 1 ELSE 0 END,
            energy_entries = daily_checkins.energy_entries + CASE WHEN p_entry_type = 'energy' THEN 1 ELSE 0 END;

        RETURN QUERY SELECT COALESCE(prev_streak + 1, 1), today_date;
    END IF;
END;
$$;

-- 7. Reload schema cache again after creating function
NOTIFY pgrst, 'reload schema';

-- 8. Enable Realtime for live chart updates
-- This allows the frontend to subscribe to changes and auto-refresh charts
-- Use DO blocks to skip tables that are already in the publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.food_waste_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.outlets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.benchmarks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9. Function to delete a user's auth account (called via RPC by admin)
-- This avoids needing a separate edge function deployment
CREATE OR REPLACE FUNCTION public.delete_user_account(target_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_uuid UUID;
  caller_email TEXT;
  caller_role TEXT;
BEGIN
  -- Get the caller's email from the current JWT
  caller_email := auth.email()::TEXT;

  -- Look up the caller's role in personnel
  SELECT role INTO caller_role
  FROM public.personnel
  WHERE email = caller_email
  LIMIT 1;

  -- Only admins and super_admins can delete users
  IF caller_role IS NULL OR (caller_role NOT ILIKE '%admin%') THEN
    RETURN json_build_object('success', false, 'error', 'Forbidden: admin access required');
  END IF;

  -- Find the target user's UUID by email
  SELECT id INTO target_uuid
  FROM auth.users
  WHERE email = target_email
  LIMIT 1;

  IF target_uuid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  -- Delete related data
  DELETE FROM public.daily_checkins WHERE user_id = target_uuid;
  DELETE FROM public.benchmarks WHERE user_id = target_uuid;
  DELETE FROM public.personnel WHERE email = target_email;

  -- Delete the auth account
  DELETE FROM auth.users WHERE id = target_uuid;

  RETURN json_build_object('success', true, 'deleted_user_id', target_uuid);
END;
$$;

-- Grant execute to authenticated users (the function itself checks admin role)
GRANT EXECUTE ON FUNCTION public.delete_user_account(TEXT) TO authenticated;
