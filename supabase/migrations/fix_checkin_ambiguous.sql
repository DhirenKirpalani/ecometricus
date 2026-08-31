-- Fix record_daily_checkin: "column reference checkin_date is ambiguous"
-- The RETURN QUERY uses bare column names that conflict with PL/pgSQL variables.

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
    v_today_date DATE := CURRENT_DATE;
    v_yesterday_date DATE := CURRENT_DATE - 1;
    v_prev_streak INTEGER := 0;
    v_existing_streak INTEGER := 0;
BEGIN
    -- Check if a check-in already exists for today
    SELECT streak_days INTO v_existing_streak
    FROM daily_checkins
    WHERE user_id = p_user_id AND daily_checkins.checkin_date = v_today_date;

    IF FOUND THEN
        IF p_entry_type = 'waste' THEN
            UPDATE daily_checkins SET waste_entries = waste_entries + 1
            WHERE user_id = p_user_id AND daily_checkins.checkin_date = v_today_date;
        ELSIF p_entry_type = 'water' THEN
            UPDATE daily_checkins SET water_entries = water_entries + 1
            WHERE user_id = p_user_id AND daily_checkins.checkin_date = v_today_date;
        ELSIF p_entry_type = 'energy' THEN
            UPDATE daily_checkins SET energy_entries = energy_entries + 1
            WHERE user_id = p_user_id AND daily_checkins.checkin_date = v_today_date;
        END IF;
        RETURN QUERY SELECT v_existing_streak AS streak_days, v_today_date AS checkin_date;
    ELSE
        -- Get yesterday's streak to continue the chain
        SELECT streak_days INTO v_prev_streak
        FROM daily_checkins
        WHERE user_id = p_user_id AND daily_checkins.checkin_date = v_yesterday_date
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
            COALESCE(v_prev_streak + 1, 1),
            v_today_date
        )
        ON CONFLICT (user_id, checkin_date) DO UPDATE SET
            waste_entries = daily_checkins.waste_entries + CASE WHEN p_entry_type = 'waste' THEN 1 ELSE 0 END,
            water_entries = daily_checkins.water_entries + CASE WHEN p_entry_type = 'water' THEN 1 ELSE 0 END,
            energy_entries = daily_checkins.energy_entries + CASE WHEN p_entry_type = 'energy' THEN 1 ELSE 0 END;

        RETURN QUERY SELECT COALESCE(v_prev_streak + 1, 1) AS streak_days, v_today_date AS checkin_date;
    END IF;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION record_daily_checkin TO authenticated, anon;
