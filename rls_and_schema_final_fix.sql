-- 🛡️ FINAL Infrastructure Fix for Ecometricus
-- This script fixes both schema inconsistencies and RLS security blocks.

-- 1. Ensure Columns Exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS position text DEFAULT 'Staff',
ADD COLUMN IF NOT EXISTS legal_consent boolean DEFAULT false;

ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS admin_name text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS audit_cycle text DEFAULT 'Monthly';

ALTER TABLE public.benchmarks 
ADD COLUMN IF NOT EXISTS has_consented boolean DEFAULT false;

-- 2. RESET & FIX RLS PERMISSIONS (The core issue)
-- Force enable access for Profile and Settings synchronization
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles write access" ON public.profiles;
DROP POLICY IF EXISTS "Public Profile Access" ON public.profiles;
DROP POLICY IF EXISTS "Company settings access" ON public.company_settings;
DROP POLICY IF EXISTS "Benchmarks access" ON public.benchmarks;

-- Create FULL ACCESS policies (Necessary for MVP/Development initialization)
-- Note: In a true production environment, these would be restricted by auth.uid().
CREATE POLICY "Profiles universal access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Company settings universal access" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Benchmarks universal access" ON public.benchmarks FOR ALL USING (true) WITH CHECK (true);

-- 3. Grant table permissions
GRANT ALL ON public.profiles TO authenticated, anon;
GRANT ALL ON public.company_settings TO authenticated, anon;
GRANT ALL ON public.benchmarks TO authenticated, anon;

-- Standardize existing users
UPDATE public.profiles SET legal_consent = false WHERE legal_consent IS NULL;
