-- Apply to Atmosferi only. SMTP credentials remain exclusively in Edge secrets.
-- An interrupted send stays reserved for manual reconciliation, never auto-retry.
ALTER TABLE public.email_outbox ADD COLUMN dispatch_attempted_at timestamptz;
CREATE TABLE public.email_dispatch_state (
  id integer PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'smtp' CHECK (provider IN ('brevo', 'ses', 'smtp')),
  daily_limit integer NOT NULL DEFAULT 300 CHECK (daily_limit BETWEEN 1 AND 300),
  lease_token uuid,
  lease_until timestamptz,
  last_template_id uuid,
  last_run_at timestamptz,
  last_error text
);
INSERT INTO public.email_dispatch_state (id) VALUES (1);
ALTER TABLE public.email_dispatch_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_dispatch_state FROM anon, authenticated;
GRANT SELECT ON public.email_dispatch_state TO authenticated;
GRANT ALL ON public.email_dispatch_state TO service_role;
CREATE POLICY email_dispatch_admin_read ON public.email_dispatch_state
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_admin = true
  ));

CREATE FUNCTION public.acquire_email_dispatch_lease(lease_token uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  WITH acquired AS (
    UPDATE public.email_dispatch_state
    SET lease_token = $1, lease_until = now() + interval '10 minutes'
    WHERE id = 1 AND (lease_until IS NULL OR lease_until < now())
    RETURNING id
  ) SELECT EXISTS(SELECT 1 FROM acquired);
$$;
CREATE FUNCTION public.email_dispatch_remaining(max_daily integer)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT greatest(0, $1 - count(*)::integer)
  FROM public.email_outbox
  WHERE coalesce(sent_at, dispatch_attempted_at) >= (date_trunc('day', now() AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'Europe/Prague');
$$;
REVOKE ALL ON FUNCTION public.acquire_email_dispatch_lease(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_dispatch_remaining(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_email_dispatch_lease(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_dispatch_remaining(integer) TO service_role;

-- PostgREST upsert needs a full unique index; the previous partial index cannot
-- satisfy ON CONFLICT(template_slug,lead_id). NULL lead IDs remain distinct.
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_template_lead_dispatch_key
  ON public.email_outbox(template_slug, lead_id);

-- These extensions are already used by the existing automation system.
-- Store project_url and service_role_key in Vault before enabling dispatch.
SELECT cron.schedule('acquisition-email-dispatch', '*/3 * * * *', $cron$
  SELECT net.http_post(
    url := p.decrypted_secret || '/functions/v1/dispatch-acquisition-emails',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || k.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  FROM vault.decrypted_secrets p CROSS JOIN vault.decrypted_secrets k
  WHERE p.name = 'project_url' AND k.name = 'service_role_key'
    AND EXISTS (SELECT 1 FROM public.email_dispatch_state WHERE id = 1 AND enabled);
$cron$);
