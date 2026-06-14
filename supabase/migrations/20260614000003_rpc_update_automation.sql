CREATE OR REPLACE FUNCTION update_automation_job_schedule(p_job_name text, p_schedule text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.automation_jobs
  SET schedule = p_schedule, updated_at = NOW()
  WHERE job_name = p_job_name;
END;
$$;

GRANT EXECUTE ON FUNCTION update_automation_job_schedule(text, text) TO anon, authenticated;
