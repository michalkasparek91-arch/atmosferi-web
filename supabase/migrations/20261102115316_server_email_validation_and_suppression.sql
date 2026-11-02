-- Server-only validation. No contacts are deleted and no opt-out is reset.
CREATE TABLE IF NOT EXISTS public.email_domain_check (
 domain text PRIMARY KEY, has_mx boolean NOT NULL DEFAULT false,
 checked_at timestamptz NOT NULL DEFAULT now(),
 validation_status text NOT NULL CHECK(validation_status IN ('valid','invalid','unknown'))
);
-- Compatible with the older domain-cache migration on a fresh checkout.
ALTER TABLE public.email_domain_check ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'unknown'
 CHECK(validation_status IN ('valid','invalid','unknown'));
CREATE TABLE public.email_recipient_suppression (
 email text PRIMARY KEY, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.email_validation_state (
 id integer PRIMARY KEY CHECK(id=1), enabled boolean NOT NULL DEFAULT true,
 lease_until timestamptz, last_run_at timestamptz, last_error text,
 checked_domains integer NOT NULL DEFAULT 0
);
INSERT INTO public.email_validation_state(id) VALUES(1);
ALTER TABLE public.email_domain_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipient_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_validation_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_domain_check,public.email_recipient_suppression,public.email_validation_state FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.email_domain_check,public.email_recipient_suppression,public.email_validation_state TO service_role;
GRANT SELECT ON public.email_validation_state TO authenticated;
CREATE POLICY email_validation_admin_read ON public.email_validation_state FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_admin=true
));
ALTER TABLE public.marketing_leads ADD COLUMN outreach_email_ready boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_dispatch_state ADD COLUMN safety_started_at timestamptz;
ALTER TABLE public.email_dispatch_state ADD COLUMN safety_paused boolean NOT NULL DEFAULT true;
CREATE INDEX marketing_leads_ready_audience_idx ON public.marketing_leads(category,language,id) WHERE outreach_email_ready;
CREATE INDEX IF NOT EXISTS marketing_leads_email_domain_idx ON public.marketing_leads((lower(split_part(email,'@',2))));

INSERT INTO public.email_recipient_suppression(email,reason)
SELECT lower(trim(email)),'placeholder_or_invalid_syntax' FROM public.marketing_leads
WHERE lower(split_part(trim(email),'@',2))='placeholder.zrobee.cz'
 OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
 OR lower(split_part(trim(email),'@',2)) ~ '(^|\.)(example\.(com|net|org)|invalid|test|localhost)$'
ON CONFLICT(email) DO NOTHING;
INSERT INTO public.email_recipient_suppression(email,reason)
SELECT DISTINCT lower(trim(l.email)), 'delivery_'||o.delivery_status
FROM public.email_outbox o JOIN public.marketing_leads l ON l.id=o.lead_id
WHERE o.delivery_status IN ('bounced','spam','unsubscribed')
ON CONFLICT(email) DO NOTHING;
UPDATE public.marketing_leads l SET outreach_email_ready=false,outreach_import_review=true,
 tags=ARRAY(SELECT DISTINCT x FROM unnest(coalesce(l.tags,'{}')||ARRAY['email:suppressed']) x)
WHERE EXISTS(SELECT 1 FROM public.email_recipient_suppression s WHERE s.email=lower(trim(l.email)));

CREATE FUNCTION public.suppress_failed_email_recipient() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE recipient text;
BEGIN
 IF NEW.delivery_status IN ('bounced','spam','unsubscribed') THEN
  SELECT lower(trim(email)) INTO recipient FROM public.marketing_leads WHERE id=NEW.lead_id;
  IF recipient IS NOT NULL THEN
   INSERT INTO public.email_recipient_suppression(email,reason) VALUES(recipient,'delivery_'||NEW.delivery_status)
   ON CONFLICT(email) DO NOTHING;
   UPDATE public.marketing_leads SET outreach_import_review=true,outreach_email_ready=false,
    tags=ARRAY(SELECT DISTINCT x FROM unnest(coalesce(tags,'{}')||ARRAY['email:suppressed']) x)
   WHERE lower(trim(email))=recipient;
  END IF;
  -- Stop the recovery run on its first new negative delivery event.
  UPDATE public.email_dispatch_state SET enabled=false,safety_paused=true,
   last_error='Rozesílání pozastaveno: nový bounce, odhlášení nebo stížnost po obnovení. Zkontrolujte doručitelnost.'
  WHERE id=1 AND safety_started_at IS NOT NULL AND NEW.sent_at>=safety_started_at;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.suppress_failed_email_recipient() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER email_outbox_suppress_negative_delivery AFTER INSERT OR UPDATE OF delivery_status ON public.email_outbox
FOR EACH ROW EXECUTE FUNCTION public.suppress_failed_email_recipient();

CREATE FUNCTION public.claim_email_validation() RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 WITH claimed AS(UPDATE public.email_validation_state SET lease_until=now()+interval '2 minutes'
 WHERE id=1 AND enabled AND (lease_until IS NULL OR lease_until<now()) RETURNING id)
 SELECT EXISTS(SELECT 1 FROM claimed);
$$;
CREATE OR REPLACE FUNCTION public.pending_email_domains(max_rows integer DEFAULT 200)
RETURNS TABLE(domain text,kontaktu bigint) LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT lower(split_part(l.email,'@',2)),count(*) FROM public.marketing_leads l
 LEFT JOIN public.email_domain_check c ON c.domain=lower(split_part(l.email,'@',2))
 WHERE NOT l.outreach_import_review AND l.marketing_notifications IS DISTINCT FROM false
 AND l.email_notifications IS DISTINCT FROM false AND NOT ('známé'=ANY(coalesce(l.tags,'{}')))
 AND NOT EXISTS(SELECT 1 FROM public.email_recipient_suppression s WHERE s.email=lower(trim(l.email)))
 AND (c.domain IS NULL OR c.checked_at<now()-interval '30 days'
  OR (c.validation_status='unknown' AND c.checked_at<now()-interval '6 hours'))
 GROUP BY 1 ORDER BY count(*) DESC LIMIT least(greatest(max_rows,1),500);
$$;
CREATE FUNCTION public.apply_email_domain_validation(p_domain text,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_status NOT IN ('valid','invalid','unknown') THEN RAISE EXCEPTION 'Invalid domain status'; END IF;
 INSERT INTO public.email_domain_check(domain,has_mx,validation_status,checked_at)
 VALUES(lower(p_domain),p_status='valid',p_status,now())
 ON CONFLICT(domain) DO UPDATE SET has_mx=excluded.has_mx,validation_status=excluded.validation_status,checked_at=excluded.checked_at;
 UPDATE public.marketing_leads l SET outreach_email_ready=(p_status='valid'
  AND l.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
  AND NOT l.outreach_import_review AND l.marketing_notifications IS DISTINCT FROM false
  AND l.email_notifications IS DISTINCT FROM false AND NOT ('známé'=ANY(coalesce(l.tags,'{}')))
  AND NOT EXISTS(SELECT 1 FROM public.email_recipient_suppression s WHERE s.email=lower(trim(l.email))))
 WHERE lower(split_part(l.email,'@',2))=lower(p_domain);
END;
$$;
CREATE FUNCTION public.email_recipient_is_ready(recipient text) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.email_domain_check c
 WHERE c.domain=lower(split_part(trim(recipient),'@',2)) AND c.validation_status='valid'
 AND c.checked_at>now()-interval '30 days')
 AND NOT EXISTS(SELECT 1 FROM public.email_recipient_suppression s WHERE s.email=lower(trim(recipient)));
$$;
REVOKE ALL ON FUNCTION public.claim_email_validation(),public.pending_email_domains(integer),public.apply_email_domain_validation(text,text),public.email_recipient_is_ready(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_validation(),public.pending_email_domains(integer),public.apply_email_domain_validation(text,text),public.email_recipient_is_ready(text) TO service_role;

-- Validation runs independently of both the browser and the sending switch.
SELECT cron.schedule('acquisition-email-validation','* * * * *',$cron$
 SELECT net.http_post(
  url:='https://paryiowezqlnffanxtnt.supabase.co/functions/v1/validate-lead-domains',
  headers:=jsonb_build_object('Content-Type','application/json','x-atmosferi-cron-token',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='atmosferi_email_dispatch_token')),
  body:='{}'::jsonb,timeout_milliseconds:=60000)
 WHERE EXISTS(SELECT 1 FROM public.email_validation_state WHERE id=1 AND enabled);
$cron$);
