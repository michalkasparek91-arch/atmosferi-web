-- Insert the auto enrich leads job so that the trigger schedules it via pg_cron
INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active) 
VALUES ('Auto Enrich Leads', 'auto-enrich-leads', '*/10 * * * *', true)
ON CONFLICT (job_name) DO UPDATE 
SET function_name = EXCLUDED.function_name,
    schedule = EXCLUDED.schedule,
    is_active = EXCLUDED.is_active;

-- Fire trigger to sync schedule
UPDATE public.automation_jobs SET is_active = is_active WHERE job_name = 'Auto Enrich Leads';
