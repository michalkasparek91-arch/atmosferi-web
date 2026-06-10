-- Oprava práv (GRANTS) a RLS pro email_templates a marketing_campaigns, aby frontend mohl číst a zapisovat šablony

GRANT ALL ON public.email_templates TO anon, authenticated, service_role;
GRANT ALL ON public.marketing_campaigns TO anon, authenticated, service_role;

-- Zajištění, že Row Level Security propustí všechny dotazy (pokud je zapnuto)
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.email_templates;
CREATE POLICY "Enable all operations for all users" ON public.email_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.marketing_campaigns;
CREATE POLICY "Enable all operations for all users" ON public.marketing_campaigns FOR ALL USING (true) WITH CHECK (true);
