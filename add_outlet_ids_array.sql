-- Migration: Add outlet_ids TEXT[] array column to personnel table
-- This allows GM users to be explicitly linked to all outlets they manage,
-- instead of using null outlet_id as an implicit "all outlets" marker.
-- Stores outlet_id codes (e.g., 'OUTL01', 'REGI01'), not UUIDs.
-- "All Outlets" = only outlets created by the same admin (user_id match)

-- Step 1: Drop existing column if it was created as UUID[] in a previous attempt
ALTER TABLE personnel DROP COLUMN IF EXISTS outlet_ids;

-- Step 2: Add the new array column as TEXT[] (outlet codes, not UUIDs)
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS outlet_ids TEXT[] DEFAULT NULL;

-- Step 3: Migrate existing data
-- For users with a valid UUID outlet_id: look up the outlet code from the same admin's outlets
UPDATE personnel
SET outlet_ids = ARRAY[(
  SELECT o.outlet_id FROM outlets o
  WHERE o.id = personnel.outlet_id::UUID
    AND o.user_id = personnel.user_id
  LIMIT 1
)]
WHERE outlet_id IS NOT NULL
  AND outlet_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- For GM users with null outlet_id — link to all outlets owned by the same admin
UPDATE personnel
SET outlet_ids = (
  SELECT array_agg(o.outlet_id)
  FROM outlets o
  WHERE o.outlet_id IS NOT NULL
    AND o.user_id = personnel.user_id
)
WHERE outlet_id IS NULL
  AND position ILIKE 'GM';

-- For users with non-UUID outlet_id (legacy codes like 'ROYAL2') — use the code directly
UPDATE personnel
SET outlet_ids = ARRAY[outlet_id]
WHERE outlet_ids IS NULL
  AND outlet_id IS NOT NULL;

-- Step 4: Verify migration
-- Check that all personnel rows have outlet_ids populated
SELECT id, full_name, position, role, outlet_id, outlet_ids, user_id
FROM personnel
ORDER BY created_at DESC;
