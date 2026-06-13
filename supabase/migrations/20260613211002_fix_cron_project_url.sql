-- Fix hardcoded project URL and anon key in the sync_automation_job_cron function
CREATE OR REPLACE FUNCTION public.sync_automation_job_cron()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_job_name   text := 'auto_' || NEW.function_name;
  v_url        text := 'https://paryiowezqlnffanxtnt.supabase.co/functions/v1/' || NEW.function_name;
  v_anon_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnlpb3dlenFsbmZmYW54dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3MzYsImV4cCI6MjA5NjQwOTczNn0.yyd-pRRXds1o8lU9mVWk21zu-5l_dcdxiBjDSKfKw5o';
  v_command    text;
BEGIN
  -- Always unschedule any existing entry first
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job_name) THEN
    PERFORM cron.unschedule(v_job_name);
  END IF;

  IF NEW.is_active IS TRUE THEN
    v_command := format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      )$cmd$,
      v_url,
      json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key)
    );
    PERFORM cron.schedule(v_job_name, NEW.schedule, v_command);
  END IF;

  RETURN NEW;
END;
$$;

-- Touch the table to force the trigger to fire and recreate all cron jobs with the corrected URL
UPDATE public.automation_jobs SET is_active = is_active;
