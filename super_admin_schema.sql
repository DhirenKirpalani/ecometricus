-- Super Admin: Add status column to company_settings for platform control
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Enable RLS (already enabled, but ensure policy allows super admin access)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company settings universal access" ON public.company_settings;
CREATE POLICY "Company settings universal access" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.company_settings TO authenticated, anon;
