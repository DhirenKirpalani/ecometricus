-- Add email column to profiles table and backfill from auth.users

-- 1. Add the column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Backfill: match profiles to auth.users by id (profiles.id = auth.users.id)
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND (p.email IS NULL OR p.email = '');

-- 4. Backfill: match by full_name if id match didn't work
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.email IS NULL
  AND au.raw_user_meta_data->>'full_name' = p.full_name;

-- 5. Verify
SELECT id, full_name, email, role FROM public.profiles LIMIT 20;
