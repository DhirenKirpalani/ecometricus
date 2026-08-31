-- Simplified RLS fix: allow all authenticated users to read daily_checkins
-- (The table only contains check-in data, no sensitive info)

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Admins can read all checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Supervisors can read outlet checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can insert own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can update own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Authenticated can read checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Authenticated can insert checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Authenticated can update checkins" ON daily_checkins;

-- Simple policy: any authenticated user can read all check-ins
CREATE POLICY "Authenticated can read checkins" ON daily_checkins
    FOR SELECT TO authenticated USING (true);

-- Any authenticated user can insert (the function uses SECURITY DEFINER anyway)
CREATE POLICY "Authenticated can insert checkins" ON daily_checkins
    FOR INSERT TO authenticated WITH CHECK (true);

-- Any authenticated user can update
CREATE POLICY "Authenticated can update checkins" ON daily_checkins
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Verify
SELECT * FROM daily_checkins;
