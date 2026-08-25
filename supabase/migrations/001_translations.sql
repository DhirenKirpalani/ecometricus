-- ─── Ecometricus Translations Table ──────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.translations (
  section     TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  en          TEXT        NOT NULL DEFAULT '',
  es          TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (section, key)
);

-- 2. Enable Row Level Security
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- 3. Policies
--    Anyone can read translations (public site needs them)
CREATE POLICY "translations_select_all"
  ON public.translations FOR SELECT
  USING (true);

--    Only authenticated users can insert/update/delete (admin via Translation Manager)
CREATE POLICY "translations_insert_auth"
  ON public.translations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "translations_update_auth"
  ON public.translations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "translations_delete_auth"
  ON public.translations FOR DELETE
  TO authenticated
  USING (true);

-- 4. Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS translations_updated_at ON public.translations;
CREATE TRIGGER translations_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_translations_updated_at();

-- 5. Helpful index
CREATE INDEX IF NOT EXISTS idx_translations_section ON public.translations(section);

-- ✅ Done. The app will auto-seed this table from lib/translations.ts on first load.
