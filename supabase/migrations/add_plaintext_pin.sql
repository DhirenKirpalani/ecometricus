-- Add plaintext_pin column to personnel table
-- Stores the generated password so it can be pre-filled on the invite page
-- The hashed pincode (pincode column) is still used for verification

ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS plaintext_pin text;
