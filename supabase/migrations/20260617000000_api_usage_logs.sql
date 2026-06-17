-- Create api_usage_logs table to track AI usage
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine TEXT NOT NULL,
    service_name TEXT NOT NULL,
    requests_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster querying by engine and date
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_engine_created_at ON api_usage_logs(engine, created_at);

-- Allow authenticated and anon (for edge functions acting as service role, RLS is bypassed, but good practice to enable it)
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for edge functions"
    ON api_usage_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow select for authenticated"
    ON api_usage_logs FOR SELECT
    USING (auth.role() = 'authenticated');
