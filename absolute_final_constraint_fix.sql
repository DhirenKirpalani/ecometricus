-- 🛡️ ABSOLUTE FINAL Constraint Fix for Ecometricus
-- Resolves the 'profiles_role_check' violation and 'company_settings' unique constraint issues.

-- 1. Fix Profiles Table Role Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Optional: Re-add a more permissive constraint that matches frontend 'types.ts'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'supervisor', 'basic', 'view', 'Admin', 'Supervisor', 'View'));

-- 2. Fix Company Settings Unique Constraint
-- The app uses ON CONFLICT (user_id), so we MUST have a UNIQUE index or constraint on user_id.
ALTER TABLE public.company_settings DROP CONSTRAINT IF EXISTS company_settings_user_id_key;
ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_user_id_key UNIQUE (user_id);

-- 3. Ensure Schema is Synchronized
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS position text DEFAULT 'Staff',
ADD COLUMN IF NOT EXISTS legal_consent boolean DEFAULT false;

ALTER TABLE public.benchmarks 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS has_consented boolean DEFAULT false;

-- 4. Enable Universal Access (Retry RLS just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles universal access" ON public.profiles;
CREATE POLICY "Profiles universal access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Company settings universal access" ON public.company_settings;
CREATE POLICY "Company settings universal access" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
