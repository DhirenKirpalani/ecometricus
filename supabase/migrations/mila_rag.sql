-- Mila RAG: Document storage with full-text search
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ── Documents table ──
-- Note: fts column is maintained via trigger (not GENERATED) because
-- unaccent() is not immutable and can't be used in generated columns.
CREATE TABLE IF NOT EXISTS mila_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  source      TEXT DEFAULT 'manual',
  category    TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  fts         tsvector
);

-- ── Trigger function to keep fts column in sync ──
CREATE OR REPLACE FUNCTION mila_documents_fts_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('english', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.content, ''))), 'B');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS trg_mila_docs_fts ON mila_documents;

CREATE TRIGGER trg_mila_docs_fts
  BEFORE INSERT OR UPDATE ON mila_documents
  FOR EACH ROW
  EXECUTE FUNCTION mila_documents_fts_update();

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_mila_docs_fts ON mila_documents USING gin(fts);
CREATE INDEX IF NOT EXISTS idx_mila_docs_category ON mila_documents(category);
CREATE INDEX IF NOT EXISTS idx_mila_docs_trgm ON mila_documents USING gin(content gin_trgm_ops);

-- ── RPC: Full-text search with ranking ──
CREATE OR REPLACE FUNCTION match_mila_documents(
  query_text TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source TEXT,
  category TEXT,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    d.source,
    d.category,
    ts_rank(d.fts, websearch_to_tsquery('english', unaccent(query_text))) AS rank
  FROM mila_documents d
  WHERE d.fts @@ websearch_to_tsquery('english', unaccent(query_text))
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- ── RPC: Fuzzy fallback search (trigram similarity) ──
CREATE OR REPLACE FUNCTION fuzzy_mila_documents(
  query_text TEXT,
  match_count INT DEFAULT 3,
  similarity_threshold REAL DEFAULT 0.15
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source TEXT,
  category TEXT,
  similarity REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    d.source,
    d.category,
    similarity(d.content, query_text) AS similarity
  FROM mila_documents d
  WHERE similarity(d.content, query_text) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ── Enable RLS ──
ALTER TABLE mila_documents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (RAG retrieval needs to work for all users)
CREATE POLICY "mila_docs_read_all" ON mila_documents
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete (admin management)
CREATE POLICY "mila_docs_insert_auth" ON mila_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "mila_docs_update_auth" ON mila_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "mila_docs_delete_auth" ON mila_documents
  FOR DELETE TO authenticated USING (true);
