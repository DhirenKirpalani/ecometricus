-- 🛡️ Comprehensive Schema Synchronization for Ecometricus
-- Fixes PGRST204 errors and ensures all frontend requirements are met.

-- 1. Profiles Table Enhancement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS position text DEFAULT 'Staff',
ADD COLUMN IF NOT EXISTS legal_consent boolean DEFAULT false;

-- 2. Company Settings Table (Create if not exists and add columns)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_name text,
    company_name text,
    audit_cycle text DEFAULT 'Monthly',
    audit_from_date text,
    audit_to_date text,
    audit_outlet_selection text DEFAULT 'All outlets',
    audit_comments text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Ensure all columns exist in company_settings (in case table existed but was incomplete)
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS admin_name text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS audit_cycle text DEFAULT 'Monthly',
ADD COLUMN IF NOT EXISTS audit_from_date text,
ADD COLUMN IF NOT EXISTS audit_to_date text,
ADD COLUMN IF NOT EXISTS audit_outlet_selection text DEFAULT 'All outlets',
ADD COLUMN IF NOT EXISTS audit_comments text;

-- 3. Benchmarks Table Enhancement
ALTER TABLE public.benchmarks 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS has_consented boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS water_usage_target_l numeric DEFAULT 30000,
ADD COLUMN IF NOT EXISTS energy_limit_kwh numeric DEFAULT 1200;

-- स्टैंडर्डाइज़ benchmarks (Handle existing rows)
UPDATE public.benchmarks SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL AND (SELECT count(*) FROM auth.users) > 0;
