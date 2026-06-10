-- Insert the autonomous web sniper job so that the trigger schedules it via pg_cron
INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active) 
VALUES ('Continuous Web Discovery', 'autonomous-web-sniper', '*/30 * * * *', true)
ON CONFLICT (job_name) DO UPDATE 
SET function_name = EXCLUDED.function_name,
    schedule = EXCLUDED.schedule,
    is_active = EXCLUDED.is_active;
