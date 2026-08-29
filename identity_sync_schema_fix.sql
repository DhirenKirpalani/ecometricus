-- 🛡️ IDENTITY Tab Sync & De-Duplication Fix
-- Resolves "outlets.code" missing, duplicates, and unique constraint violations.

-- 1. Fix Outlets Table Schema
ALTER TABLE public.outlets 
ADD COLUMN IF NOT EXISTS code text UNIQUE;

-- 2. Ensure Company Settings Unique Constraint
-- The "Update Hub" uses user_id as its unique key.
ALTER TABLE public.company_settings DROP CONSTRAINT IF EXISTS company_settings_user_id_key;
ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_user_id_key UNIQUE (user_id);

-- 3. Enable Universal Access for Outlets (RLS)
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Outlets universal access" ON public.outlets;
CREATE POLICY "Outlets universal access" ON public.outlets FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Seed Data (Optional - Only if not already present)
-- Ensures the base outlets aren't blocked by missing data.
-- INSERT INTO public.outlets (name, code, location, color_hex) 
-- VALUES ('Royal', 'ROY02', 'Global', '#FF914D') ON CONFLICT (code) DO NOTHING;
