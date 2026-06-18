-- Add tracking columns to email_outbox
ALTER TABLE email_outbox
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_status TEXT,
ADD COLUMN IF NOT EXISTS html_archive_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_events JSONB DEFAULT '[]'::jsonb;

-- Create an index to quickly find an email by its provider_message_id (useful for webhooks)
CREATE INDEX IF NOT EXISTS email_outbox_provider_message_id_idx ON email_outbox (provider_message_id);

-- Create a storage bucket for HTML email archives
INSERT INTO storage.buckets (id, name, public) 
VALUES ('email_archive', 'email_archive', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all' AND tablename = 'objects') THEN
        CREATE POLICY "Enable read access for all" ON storage.objects FOR SELECT USING (bucket_id = 'email_archive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users only' AND tablename = 'objects') THEN
        CREATE POLICY "Enable insert for authenticated users only" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'email_archive');
    END IF;
END $$;
