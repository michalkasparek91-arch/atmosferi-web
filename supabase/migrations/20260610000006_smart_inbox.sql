-- Create email_replies table
CREATE TABLE IF NOT EXISTS public.email_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email TEXT NOT NULL,
    from_name TEXT,
    subject TEXT,
    body_text TEXT,
    ai_sentiment TEXT DEFAULT 'other',
    ai_draft_reply TEXT,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.email_replies TO anon;
GRANT ALL ON TABLE public.email_replies TO authenticated;
GRANT ALL ON TABLE public.email_replies TO service_role;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.email_replies FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.email_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.email_replies FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.email_replies FOR DELETE USING (true);

-- Add real-time replication
alter publication supabase_realtime add table public.email_replies;
