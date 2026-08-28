-- Fix: Add outlet_name column to food_waste_logs and resource_logs
-- so chart hooks can query by outlet name without joining

ALTER TABLE public.food_waste_logs 
ADD COLUMN IF NOT EXISTS outlet_name text;

ALTER TABLE public.resource_logs 
ADD COLUMN IF NOT EXISTS outlet_name text;

-- Backfill outlet_name from outlets table
-- Try using 'name' column first, fall back to 'code' if name doesn't exist
DO $$
BEGIN
  -- food_waste_logs backfill
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='name') THEN
    UPDATE public.food_waste_logs fwl
    SET outlet_name = o.name
    FROM public.outlets o
    WHERE fwl.outlet_id = o.id AND fwl.outlet_name IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='code') THEN
    UPDATE public.food_waste_logs fwl
    SET outlet_name = o.code
    FROM public.outlets o
    WHERE fwl.outlet_id = o.id AND fwl.outlet_name IS NULL;
  END IF;

  -- resource_logs backfill
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='name') THEN
    UPDATE public.resource_logs rl
    SET outlet_name = o.name
    FROM public.outlets o
    WHERE rl.outlet_id = o.id AND rl.outlet_name IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='code') THEN
    UPDATE public.resource_logs rl
    SET outlet_name = o.code
    FROM public.outlets o
    WHERE rl.outlet_id = o.id AND rl.outlet_name IS NULL;
  END IF;
END $$;
