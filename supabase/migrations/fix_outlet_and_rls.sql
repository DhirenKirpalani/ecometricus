-- ─────────────────────────────────────────────────────────────
-- Fix: Ensure outlets.name exists, add outlet_name to food_waste_logs,
-- fix RLS policies for inserts, and relax outlet_id NOT NULL
-- ─────────────────────────────────────────────────────────────

-- 1. Ensure outlets has a name column
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Add outlet_name to food_waste_logs (denormalized for easy querying)
ALTER TABLE public.food_waste_logs ADD COLUMN IF NOT EXISTS outlet_name TEXT;

-- 3. Add outlet_name to resource_logs
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS outlet_name TEXT;

-- 4. Relax outlet_id constraint: allow NULL (for entries where outlet lookup fails)
ALTER TABLE public.food_waste_logs ALTER COLUMN outlet_id DROP NOT NULL;

-- 5. Fix RLS on food_waste_logs — ensure authenticated users can insert
ALTER TABLE public.food_waste_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.food_waste_logs;
CREATE POLICY "Enable read for all" ON public.food_waste_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.food_waste_logs;
CREATE POLICY "Enable insert for authenticated" ON public.food_waste_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated" ON public.food_waste_logs;
CREATE POLICY "Enable update for authenticated" ON public.food_waste_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.food_waste_logs;
CREATE POLICY "Enable delete for authenticated" ON public.food_waste_logs FOR DELETE TO authenticated USING (true);

-- 6. (resource_logs RLS moved to section 10 below for completeness)

-- 7. Grant permissions
GRANT ALL ON public.food_waste_logs TO authenticated, anon;

-- 8. Fix record_daily_checkin: make p_user_role and p_outlet_code more flexible
-- (Drop and recreate with SECURITY DEFINER so it bypasses RLS)
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

-- 9. Ensure benchmarks table exists with all required columns + unique constraint
CREATE TABLE IF NOT EXISTS public.benchmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    outlet_name TEXT NOT NULL DEFAULT 'Unknown Outlet',
    food_waste_target_kg NUMERIC DEFAULT 65,
    energy_limit_kwh NUMERIC DEFAULT 500,
    water_usage_liters NUMERIC DEFAULT 5000,
    food_cost_cap_percent NUMERIC DEFAULT 30,
    labor_cost_cap_percent NUMERIC DEFAULT 25,
    profit_margin_target NUMERIC DEFAULT 25,
    total_sales_target NUMERIC DEFAULT 16500,
    sentiment_target NUMERIC DEFAULT 4.5,
    avg_check_target NUMERIC DEFAULT 47,
    gamification_goal INTEGER DEFAULT 3000,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, outlet_name)
);

-- Add any missing columns to existing benchmarks table
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS outlet_name TEXT NOT NULL DEFAULT 'Unknown Outlet';
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS food_waste_target_kg NUMERIC DEFAULT 65;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS energy_limit_kwh NUMERIC DEFAULT 500;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS water_usage_liters NUMERIC DEFAULT 5000;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS food_cost_cap_percent NUMERIC DEFAULT 30;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS labor_cost_cap_percent NUMERIC DEFAULT 25;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS profit_margin_target NUMERIC DEFAULT 25;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS total_sales_target NUMERIC DEFAULT 16500;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS sentiment_target NUMERIC DEFAULT 4.5;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS avg_check_target NUMERIC DEFAULT 47;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS gamification_goal INTEGER DEFAULT 3000;
ALTER TABLE public.benchmarks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure unique constraint exists for upsert onConflict
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'benchmarks_user_id_outlet_name_key'
        AND conrelid = 'public.benchmarks'::regclass
    ) THEN
        ALTER TABLE public.benchmarks ADD CONSTRAINT benchmarks_user_id_outlet_name_key UNIQUE (user_id, outlet_name);
    END IF;
END $$;

-- RLS for benchmarks
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated on benchmarks" ON public.benchmarks;
CREATE POLICY "Enable all for authenticated on benchmarks" ON public.benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.benchmarks TO authenticated, anon;

-- 10. Ensure resource_logs has required columns + RLS
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS outlet_name TEXT;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.resource_logs ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Relax outlet_id NOT NULL on resource_logs if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resource_logs' AND column_name = 'outlet_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.resource_logs ALTER COLUMN outlet_id DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.resource_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all on resource_logs" ON public.resource_logs;
CREATE POLICY "Enable read for all on resource_logs" ON public.resource_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated on resource_logs" ON public.resource_logs;
CREATE POLICY "Enable insert for authenticated on resource_logs" ON public.resource_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for authenticated on resource_logs" ON public.resource_logs;
CREATE POLICY "Enable update for authenticated on resource_logs" ON public.resource_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable delete for authenticated on resource_logs" ON public.resource_logs;
CREATE POLICY "Enable delete for authenticated on resource_logs" ON public.resource_logs FOR DELETE TO authenticated USING (true);
GRANT ALL ON public.resource_logs TO authenticated, anon;

