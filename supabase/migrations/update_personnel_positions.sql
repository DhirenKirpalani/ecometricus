-- Update existing personnel + profiles positions to match the new position values
-- Valid positions: 'Admin', 'GM', 'Exec Chef', 'Outlet Manager', 'Chef Prep'
-- Link: personnel.user_id = profiles.id (both = Supabase auth user ID)

-- ── 1. Fix personnel table ───────────────────────────────────────────────────

UPDATE public.personnel
SET position = 'Admin'
WHERE role IN ('admin', 'super_admin')
  AND (position IS NULL OR position NOT IN ('Admin', 'GM', 'Exec Chef', 'Outlet Manager', 'Chef Prep'));

UPDATE public.personnel
SET position = 'Exec Chef'
WHERE role = 'supervisor'
  AND (position IS NULL OR position NOT IN ('Admin', 'GM', 'Exec Chef', 'Outlet Manager', 'Chef Prep'));

UPDATE public.personnel
SET position = 'Chef Prep'
WHERE role = 'basic'
  AND (position IS NULL OR position NOT IN ('Admin', 'GM', 'Exec Chef', 'Outlet Manager', 'Chef Prep'));

UPDATE public.personnel
SET position = 'GM'
WHERE role = 'view'
  AND (position IS NULL OR position NOT IN ('Admin', 'GM', 'Exec Chef', 'Outlet Manager', 'Chef Prep'));

-- Fix stale values (F&B Director, Manager, Supervisor, etc.)
UPDATE public.personnel
SET position = 'Admin'
WHERE position IN ('F&B Director', 'Manager')
  AND role IN ('admin', 'super_admin');

UPDATE public.personnel
SET position = 'Exec Chef'
WHERE position = 'Supervisor'
  AND role = 'supervisor';

-- ── 2. Mirror updated positions into profiles table ──────────────────────────
-- personnel.user_id = profiles.id

UPDATE public.profiles pr
SET
  position = pe.position,
  role     = pe.role
FROM public.personnel pe
WHERE pr.id = pe.user_id
  AND pe.user_id IS NOT NULL;
