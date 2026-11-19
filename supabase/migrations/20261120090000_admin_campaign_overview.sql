-- One call for the admin "Kampaně" overview: what each template has sent, when, and what waits.
create or replace function public.admin_campaign_overview()
returns table (
  template_slug text,
  sent_total bigint,
  sent_today bigint,
  sent_7d bigint,
  failed_7d bigint,
  queued bigint,
  last_sent_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select o.template_slug,
    count(*) filter (where o.status = 'sent'),
    count(*) filter (where o.status = 'sent' and o.sent_at >= date_trunc('day', now() at time zone 'Europe/Prague') at time zone 'Europe/Prague'),
    count(*) filter (where o.status = 'sent' and o.sent_at >= now() - interval '7 days'),
    count(*) filter (where o.status = 'failed' and o.created_at >= now() - interval '7 days'),
    count(*) filter (where o.status in ('draft', 'pending')),
    max(o.sent_at)
  from public.email_outbox o
  where o.template_slug is not null
  group by o.template_slug;
end $$;
revoke all on function public.admin_campaign_overview() from public, anon;
grant execute on function public.admin_campaign_overview() to authenticated;
