-- Add detail columns to food_waste_logs
-- These fields come from the DailyInputForm (Category → Sub-Category → Product → Reason → Destination)

ALTER TABLE public.food_waste_logs
  ADD COLUMN IF NOT EXISTS category    text,
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS product     text,
  ADD COLUMN IF NOT EXISTS reason      text,
  ADD COLUMN IF NOT EXISTS destination text;
