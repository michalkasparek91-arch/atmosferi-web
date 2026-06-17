-- Zrychlení běhu autonomního sběrače (Cron z 30 minut na 5 minut)
UPDATE public.automation_jobs
SET schedule = '*/5 * * * *', updated_at = NOW()
WHERE job_name = 'Continuous Web Discovery';
