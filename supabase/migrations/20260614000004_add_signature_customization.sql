ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS signature_greeting varchar(255) DEFAULT 'S pozdravem',
ADD COLUMN IF NOT EXISTS signature_role varchar(255) DEFAULT 'web a vizualizace pro architekturu';
