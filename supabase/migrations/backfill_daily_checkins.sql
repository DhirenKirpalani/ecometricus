-- Simple backfill: insert check-in records directly from existing logs
-- Run this in the Supabase SQL Editor

-- Insert check-in for Nira Eco (Aug 31) from waste + resource logs
INSERT INTO daily_checkins (user_id, user_name, user_role, outlet_code, waste_entries, water_entries, energy_entries, streak_days, checkin_date)
SELECT
    w.user_id,
    'Nira Eco' AS user_name,
    'basic' AS user_role,
    w.outlet_id AS outlet_code,
    w.waste_count,
    COALESCE(r.water_count, 0),
    COALESCE(r.energy_count, 0),
    1,
    w.checkin_date
FROM (
    SELECT user_id, outlet_id, DATE(created_at) AS checkin_date, COUNT(*) AS waste_count
    FROM food_waste_logs
    WHERE user_id IS NOT NULL AND outlet_id = '5a3e6d94-61b0-4ae0-8f2c-e84a8d407c65'
    GROUP BY user_id, outlet_id, DATE(created_at)
) w
LEFT JOIN (
    SELECT user_id, outlet_code, DATE(created_at) AS checkin_date,
        COUNT(*) FILTER (WHERE water_liters > 0) AS water_count,
        COUNT(*) FILTER (WHERE energy_kwh > 0) AS energy_count
    FROM resource_logs
    WHERE user_id IS NOT NULL AND outlet_code = 'REGI01'
    GROUP BY user_id, outlet_code, DATE(created_at)
) r ON r.user_id = w.user_id AND r.checkin_date = w.checkin_date
ON CONFLICT (user_id, checkin_date) DO UPDATE SET
    waste_entries = EXCLUDED.waste_entries,
    water_entries = EXCLUDED.water_entries,
    energy_entries = EXCLUDED.energy_entries;

-- Verify
SELECT * FROM daily_checkins;
