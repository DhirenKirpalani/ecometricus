-- Add new benchmark columns to the benchmarks table
-- These allow admin-configurable targets for KPI charts and gamification

ALTER TABLE benchmarks
  ADD COLUMN IF NOT EXISTS profit_margin_target NUMERIC DEFAULT 25,
  ADD COLUMN IF NOT EXISTS total_sales_target NUMERIC DEFAULT 16500,
  ADD COLUMN IF NOT EXISTS sentiment_target NUMERIC DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS avg_check_target NUMERIC DEFAULT 47,
  ADD COLUMN IF NOT EXISTS gamification_goal INTEGER DEFAULT 3000;

-- Backfill existing rows with defaults
UPDATE benchmarks
SET
  profit_margin_target = COALESCE(profit_margin_target, 25),
  total_sales_target = COALESCE(total_sales_target, 16500),
  sentiment_target = COALESCE(sentiment_target, 4.5),
  avg_check_target = COALESCE(avg_check_target, 47),
  gamification_goal = COALESCE(gamification_goal, 3000)
WHERE profit_margin_target IS NULL
   OR total_sales_target IS NULL
   OR sentiment_target IS NULL
   OR avg_check_target IS NULL
   OR gamification_goal IS NULL;
