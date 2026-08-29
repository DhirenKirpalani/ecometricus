-- ─────────────────────────────────────────────────────────────
-- User Activity Tracking: Add user attribution + daily check-ins
-- ─────────────────────────────────────────────────────────────

-- 1. Add user_id and created_by to food_waste_logs
ALTER TABLE public.food_waste_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 2. Add user_id and created_by to resource_logs
ALTER TABLE public.resource_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3. Create daily_checkins table — tracks daily form submissions per user
-- Used for streaks, gamification, and compliance monitoring
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name     TEXT,
    user_role     TEXT,
    outlet_code   TEXT,
    -- What they submitted
    waste_entries   INTEGER DEFAULT 0,
    water_entries   INTEGER DEFAULT 0,
    energy_entries  INTEGER DEFAULT 0,
    -- Streak tracking
    streak_days   INTEGER DEFAULT 1,
    -- The check-in date (date only, no time)
    checkin_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    -- One check-in per user per day
    UNIQUE(user_id, checkin_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_streak ON daily_checkins(user_id, streak_days DESC);

-- RLS: Users can see their own check-ins, admins/super_admins can see all
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkins" ON daily_checkins;
CREATE POLICY "Users can view own checkins"
    ON daily_checkins FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own checkins" ON daily_checkins;
CREATE POLICY "Users can insert own checkins"
    ON daily_checkins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own checkins" ON daily_checkins;
CREATE POLICY "Users can update own checkins"
    ON daily_checkins FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can view all check-ins
DROP POLICY IF EXISTS "Admins can view all checkins" ON daily_checkins;
CREATE POLICY "Admins can view all checkins"
    ON daily_checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role IN ('admin', 'super_admin'))
        )
    );

-- Grant access
GRANT ALL ON public.daily_checkins TO authenticated, anon;

-- 4. Helper function: Record or update a daily check-in
-- Called when a user submits waste or resource entries
CREATE OR REPLACE FUNCTION record_daily_checkin(
    p_user_id   UUID,
    p_user_name TEXT,
    p_user_role TEXT,
    p_outlet_code TEXT,
    p_entry_type TEXT -- 'waste', 'water', or 'energy'
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
    -- Check if there's already a check-in today
    SELECT * INTO existing_record FROM daily_checkins
    WHERE user_id = p_user_id AND checkin_date = today_date;
    
    IF FOUND THEN
        -- Update existing check-in: increment the appropriate counter
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
        -- New check-in: check if there was one yesterday for streak
        SELECT streak_days INTO prev_streak
        FROM daily_checkins
        WHERE user_id = p_user_id AND checkin_date = yesterday_date
        LIMIT 1;
        
        -- Insert new check-in with incremented streak (or 1 if no yesterday)
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
