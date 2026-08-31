-- Backfill gamification_ledger with points for existing user data
-- Awards retroactive points for all past waste entries, resource entries, and streaks

DO $$
DECLARE
  v_waste_log     RECORD;
  v_resource_log  RECORD;
  v_checkin       RECORD;
  v_outlet_id     uuid;
BEGIN
  -- 1. Backfill On-Time Entry (+10) and Entry with Image (+10) for every existing waste log
  FOR v_waste_log IN SELECT id, user_id, outlet_id, image_url, created_at FROM public.food_waste_logs WHERE is_mock = false AND user_id IS NOT NULL LOOP
    IF v_waste_log.outlet_id IS NOT NULL THEN
      INSERT INTO public.gamification_ledger (outlet_id, profile_id, points_awarded, created_at)
      VALUES (v_waste_log.outlet_id, v_waste_log.user_id, 10, v_waste_log.created_at);
    END IF;

    IF v_waste_log.outlet_id IS NOT NULL AND v_waste_log.image_url IS NOT NULL THEN
      INSERT INTO public.gamification_ledger (outlet_id, profile_id, points_awarded, created_at)
      VALUES (v_waste_log.outlet_id, v_waste_log.user_id, 10, v_waste_log.created_at);
    END IF;
  END LOOP;

  -- 2. Backfill On-Time Entry (+10) and Energy Reading (+10) for every existing resource log
  -- resource_logs uses outlet_code (text), not outlet_id (uuid) — resolve via outlets table
  FOR v_resource_log IN
    SELECT r.id, r.user_id, r.outlet_code, r.outlet_name, r.water_liters, r.energy_kwh, r.created_at
    FROM public.resource_logs r
    WHERE r.is_mock = false AND r.user_id IS NOT NULL
  LOOP
    -- Resolve outlet UUID from outlet_code or outlet_name
    SELECT o.id INTO v_outlet_id FROM public.outlets o
    WHERE o.outlet_id = v_resource_log.outlet_code
       OR o.outlet_name = v_resource_log.outlet_name
    LIMIT 1;

    -- On-Time Entry (for any resource reading)
    IF v_outlet_id IS NOT NULL THEN
      INSERT INTO public.gamification_ledger (outlet_id, profile_id, points_awarded, created_at)
      VALUES (v_outlet_id, v_resource_log.user_id, 10, v_resource_log.created_at);
    END IF;

    -- Energy Reading (only if energy_kwh > 0)
    IF v_outlet_id IS NOT NULL AND v_resource_log.energy_kwh IS NOT NULL AND v_resource_log.energy_kwh > 0 THEN
      INSERT INTO public.gamification_ledger (outlet_id, profile_id, points_awarded, created_at)
      VALUES (v_outlet_id, v_resource_log.user_id, 10, v_resource_log.created_at);
    END IF;
  END LOOP;

  -- 3. Backfill 5-Day Streak Bonus (+50) for users with streak >= 5
  FOR v_checkin IN
    SELECT DISTINCT user_id, streak_days
    FROM public.daily_checkins
    WHERE streak_days >= 5 AND user_id IS NOT NULL
  LOOP
    -- Find outlet from latest waste log
    SELECT outlet_id INTO v_outlet_id FROM public.food_waste_logs WHERE user_id = v_checkin.user_id AND outlet_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;

    -- Fallback: find from resource_logs via outlet_code
    IF v_outlet_id IS NULL THEN
      SELECT o.id INTO v_outlet_id
      FROM public.resource_logs r JOIN public.outlets o ON o.outlet_id = r.outlet_code
      WHERE r.user_id = v_checkin.user_id
      ORDER BY r.created_at DESC LIMIT 1;
    END IF;

    IF v_outlet_id IS NOT NULL THEN
      INSERT INTO public.gamification_ledger (outlet_id, profile_id, points_awarded, created_at)
      VALUES (v_outlet_id, v_checkin.user_id, 50, now());
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete';
END $$;
