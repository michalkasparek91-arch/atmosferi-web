GRANT SELECT, UPDATE ON public.automation_jobs TO anon, authenticated;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on automation_jobs" ON public.automation_jobs;
CREATE POLICY "Allow select on automation_jobs" ON public.automation_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update on automation_jobs" ON public.automation_jobs;
CREATE POLICY "Allow update on automation_jobs" ON public.automation_jobs FOR UPDATE USING (true);
