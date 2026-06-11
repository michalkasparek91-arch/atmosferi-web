
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_name TEXT NOT NULL,
    company_name TEXT,
    project_title TEXT NOT NULL,
    description TEXT,
    price_quote TEXT,
    portfolio_images JSONB,
    status TEXT DEFAULT 'sent',
    view_count INTEGER DEFAULT 0
);

