-- Populate KPI data for the admin's 4 outlets (Regis, Marmalade, Fish market, Petit Dejune)
-- This generates realistic weekly data for charts

-- Outlet IDs:
-- Regis:        5a3e6d94-61b0-4ae0-8f2c-e84a8d407c65
-- Marmalade:    605d8c30-0587-431c-a8aa-dbb780db339b
-- Fish market:  dc80f5bd-79a4-4ad7-99c4-53a4d0f82591
-- Petit Dejune: 411f1cc2-f48a-4bc0-a9a3-bf16ebc285ae

-- Food Cost (%): 25-35 range (column: value)
INSERT INTO food_cost_logs (outlet_id, value, created_at)
SELECT o.id, 
  25 + random() * 10,
  (CURRENT_DATE - INTERVAL '6 days' + (d || ' days')::INTERVAL)::TIMESTAMPTZ
FROM outlets o
CROSS JOIN generate_series(0, 6) AS d
WHERE o.user_id = 'bf0a72b9-8011-4b94-8431-15564781d665';

-- Labor Cost (%): 20-30 range (column: value)
INSERT INTO labor_cost_logs (outlet_id, value, created_at)
SELECT o.id,
  20 + random() * 10,
  (CURRENT_DATE - INTERVAL '6 days' + (d || ' days')::INTERVAL)::TIMESTAMPTZ
FROM outlets o
CROSS JOIN generate_series(0, 6) AS d
WHERE o.user_id = 'bf0a72b9-8011-4b94-8431-15564781d665';

-- Profit Margins (%): 15-30 range (column: margin_percentage)
INSERT INTO profit_margins_logs (outlet_id, margin_percentage, created_at)
SELECT o.id,
  15 + random() * 15,
  (CURRENT_DATE - INTERVAL '6 days' + (d || ' days')::INTERVAL)::TIMESTAMPTZ
FROM outlets o
CROSS JOIN generate_series(0, 6) AS d
WHERE o.user_id = 'bf0a72b9-8011-4b94-8431-15564781d665';

-- Sales Logs (columns: food, beverage)
INSERT INTO sales_logs (outlet_id, food, beverage, created_at)
SELECT o.id,
  3000 + random() * 4000,
  1500 + random() * 2500,
  (CURRENT_DATE - INTERVAL '6 days' + (d || ' days')::INTERVAL)::TIMESTAMPTZ
FROM outlets o
CROSS JOIN generate_series(0, 6) AS d
WHERE o.user_id = 'bf0a72b9-8011-4b94-8431-15564781d665';

-- Avg Check Logs (columns: restaurant, bar, banquets)
INSERT INTO avg_check_logs (outlet_id, restaurant, bar, banquets, created_at)
SELECT o.id,
  35 + random() * 20,
  20 + random() * 15,
  50 + random() * 30,
  (CURRENT_DATE - INTERVAL '6 days' + (d || ' days')::INTERVAL)::TIMESTAMPTZ
FROM outlets o
CROSS JOIN generate_series(0, 6) AS d
WHERE o.user_id = 'bf0a72b9-8011-4b94-8431-15564781d665';

-- Customer Sentiment Logs (column: rating_value) — 3.5 - 5.0 range
INSERT INTO customer_sentiment_logs (outlet_id, rating_value, created_at)
SELECT o.id,
  3.5 + random() * 1.5,
  (CURRENT_DATE - INTERVAL '6 days' + (d || ' days')::INTERVAL)::TIMESTAMPTZ
FROM outlets o
CROSS JOIN generate_series(0, 6) AS d
WHERE o.user_id = 'bf0a72b9-8011-4b94-8431-15564781d665';

-- Verify
SELECT 'food_cost_logs' as tbl, count(*) FROM food_cost_logs WHERE outlet_id IN (SELECT id FROM outlets WHERE user_id = 'bf0a72b9-8011-4b94-8431-15564781d665')
UNION ALL
SELECT 'labor_cost_logs', count(*) FROM labor_cost_logs WHERE outlet_id IN (SELECT id FROM outlets WHERE user_id = 'bf0a72b9-8011-4b94-8431-15564781d665')
UNION ALL
SELECT 'profit_margins_logs', count(*) FROM profit_margins_logs WHERE outlet_id IN (SELECT id FROM outlets WHERE user_id = 'bf0a72b9-8011-4b94-8431-15564781d665')
UNION ALL
SELECT 'sales_logs', count(*) FROM sales_logs WHERE outlet_id IN (SELECT id FROM outlets WHERE user_id = 'bf0a72b9-8011-4b94-8431-15564781d665')
UNION ALL
SELECT 'avg_check_logs', count(*) FROM avg_check_logs WHERE outlet_id IN (SELECT id FROM outlets WHERE user_id = 'bf0a72b9-8011-4b94-8431-15564781d665')
UNION ALL
SELECT 'customer_sentiment_logs', count(*) FROM customer_sentiment_logs WHERE outlet_id IN (SELECT id FROM outlets WHERE user_id = 'bf0a72b9-8011-4b94-8431-15564781d665');
