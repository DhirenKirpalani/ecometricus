-- Migration: Add sales_logs and avg_check_logs tables for KPI charts
-- These tables store daily sales breakdown and average check data per outlet

-- ── sales_logs ──
CREATE TABLE IF NOT EXISTS public.sales_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id   UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
  outlet_name TEXT,
  food        NUMERIC DEFAULT 0,      -- Food revenue
  beverage    NUMERIC DEFAULT 0,      -- Beverage revenue
  user_id     UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for sales_logs" ON public.sales_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable select for sales_logs" ON public.sales_logs FOR SELECT USING (true);

-- ── avg_check_logs ──
CREATE TABLE IF NOT EXISTS public.avg_check_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id   UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
  outlet_name TEXT,
  restaurant  NUMERIC DEFAULT 0,      -- Restaurant avg check
  bar         NUMERIC DEFAULT 0,      -- Bar avg check
  banquets    NUMERIC DEFAULT 0,      -- Banquets avg check
  user_id     UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.avg_check_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for avg_check_logs" ON public.avg_check_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable select for avg_check_logs" ON public.avg_check_logs FOR SELECT USING (true);
