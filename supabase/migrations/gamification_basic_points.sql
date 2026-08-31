-- Ensure display_name is unique so ON CONFLICT works
DELETE FROM public.gamification_actions a USING public.gamification_actions b
  WHERE a.id > b.id AND a.display_name = b.display_name;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gamification_actions_display_name_key') THEN
    ALTER TABLE public.gamification_actions ADD CONSTRAINT gamification_actions_display_name_key UNIQUE (display_name);
  END IF;
END $$;

-- Gamification point actions for basic role users (spec-aligned)
-- Note: actual column name is "points" (NOT NULL), not "points_value"
INSERT INTO public.gamification_actions (display_name, points) VALUES
  ('Entry with Image',    10),
  ('On-Time Entry',       10),
  ('Energy Reading',      10),
  ('5-Day Streak Bonus',  50),
  ('Mila Comment',         5)
ON CONFLICT (display_name) DO UPDATE SET points = excluded.points;
