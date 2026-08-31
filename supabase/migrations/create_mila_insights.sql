-- Create mila_insights table for AI-generated alerts and suggestions
CREATE TABLE IF NOT EXISTS mila_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can only see their own insights
ALTER TABLE mila_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
    ON mila_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
    ON mila_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
    ON mila_insights FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
    ON mila_insights FOR DELETE
    USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_mila_insights_user_unread
    ON mila_insights(user_id, is_read)
    WHERE is_read = false;

-- Enable realtime
ALTER TABLE mila_insights REPLICA IDENTITY FULL;
