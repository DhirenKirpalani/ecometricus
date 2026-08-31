-- Store super_admin role in the database instead of hardcoding in App.tsx
-- Updates profiles, personnel, and auth user_metadata for Dhiren Kirpalani

-- 1. Update profiles table
UPDATE public.profiles
SET role = 'super_admin', position = 'Admin', updated_at = now()
WHERE email = 'dhirenkirpalani2308@gmail.com'
   OR full_name ILIKE 'Dhiren Kirpalani';

-- 2. Update personnel table (if record exists)
UPDATE public.personnel
SET role = 'super_admin', position = 'Admin'
WHERE email ILIKE 'dhirenkirpalani2308@gmail.com';

-- 3. Update auth user_metadata (requires the auth uid)
-- Find the user by email and update their metadata
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE 'dhirenkirpalani2308@gmail.com';
  IF v_user_id IS NOT NULL THEN
    -- Update raw_user_meta_data to set role = super_admin
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', 'super_admin')
    WHERE id = v_user_id;
    RAISE NOTICE 'Updated auth metadata for user %', v_user_id;
  ELSE
    RAISE NOTICE 'No auth user found with email dhirenkirpalani2308@gmail.com';
  END IF;
END $$;
