-- Sync profiles table with auth.users — add missing columns, backfill all data

-- 1. Add missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text DEFAULT 'Admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legal_consent boolean DEFAULT false;

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Sync: update existing profiles by matching id (profiles.id = auth.users.id)
-- Normalize role to lowercase to satisfy check constraints
UPDATE public.profiles p
SET
  email     = COALESCE(p.email, au.email),
  full_name = COALESCE(NULLIF(p.full_name, ''), au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  role      = LOWER(COALESCE(NULLIF(p.role, ''), au.raw_user_meta_data->>'role', 'admin')),
  position  = COALESCE(NULLIF(p.position, ''), au.raw_user_meta_data->>'position', 'Admin')
FROM auth.users au
WHERE p.id = au.id;

-- 4. Sync: fallback match by full_name for profiles not matched by id
UPDATE public.profiles p
SET
  email = au.email,
  role  = LOWER(COALESCE(NULLIF(p.role, ''), au.raw_user_meta_data->>'role', 'admin'))
FROM auth.users au
WHERE (p.email IS NULL OR p.email = '')
  AND au.raw_user_meta_data->>'full_name' = p.full_name;

-- 5. Insert missing profiles for auth users that don't have a profile row
-- Normalize role to lowercase to satisfy check constraints
INSERT INTO public.profiles (id, full_name, email, role, position, legal_consent)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'Unknown User'),
  au.email,
  LOWER(COALESCE(au.raw_user_meta_data->>'role', 'admin')),
  COALESCE(au.raw_user_meta_data->>'position', 'Admin'),
  COALESCE((au.raw_user_meta_data->>'legal_consent')::boolean, false)
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

-- 6. Verify — show all profiles with auth data side by side
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.position,
  au.email AS auth_email,
  au.raw_user_meta_data->>'role' AS auth_role,
  au.raw_user_meta_data->>'position' AS auth_position,
  au.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY au.created_at DESC;
