-- Insert or update the automation job for autonomous web sniper
INSERT INTO public.automation_jobs (job_name, function_name, schedule, is_active)
VALUES ('Continuous Web Discovery', 'autonomous-web-sniper', '*/30 * * * *', true)
ON CONFLICT (job_name) DO UPDATE
SET function_name = EXCLUDED.function_name,
    schedule = EXCLUDED.schedule,
    is_active = EXCLUDED.is_active;
