
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    session_id TEXT
);

