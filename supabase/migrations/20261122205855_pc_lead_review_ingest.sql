-- A paired Windows collector may submit review batches. Its key grants no reader or sender access.
create schema pc_lead_ingest;
revoke all on schema pc_lead_ingest from public;
create table pc_lead_ingest.devices (
  fingerprint text primary key check (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
revoke all on pc_lead_ingest.devices from public, anon, authenticated;
alter table pc_lead_ingest.devices enable row level security;

create index if not exists agency_review_email_idx on public.agency_outreach_leads (lower(btrim(email)));
create index if not exists agency_review_host_idx on public.agency_outreach_leads
  ((substring(regexp_replace(lower(btrim(website)), '^(https?://)?(www\.)?', '') from '^[^/?#]+')));

create function pc_lead_ingest.submit(items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  device_key text := current_setting('request.headers', true)::jsonb ->> 'x-atmosferi-import';
  row_data record;
  host_key text;
  email_key text;
  added integer := 0;
begin
  if auth.uid() is not null or device_key is null or length(device_key) <> 64 or not exists (
    select 1 from pc_lead_ingest.devices where fingerprint = encode(sha256(convert_to(device_key,'UTF8')),'hex')
  ) then raise insufficient_privilege using message='Unpaired collector'; end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>20 or octet_length(items::text)>250000
    then raise exception 'Invalid batch'; end if;
  -- Serialize retries from collectors so normalized e-mail and host deduplication is atomic.
  perform pg_advisory_xact_lock(829144, 1);
  for row_data in select * from jsonb_to_recordset(items) as r(source_id text, company_name text,
      email text, website text, city text, source_name text, notes text)
  loop
    email_key := lower(btrim(row_data.email));
    host_key := substring(regexp_replace(lower(btrim(row_data.website)), '^(https?://)?(www\.)?', '') from '^[^/?#]+');
    if row_data.source_id is null or row_data.source_id !~ '^pc-lead:[0-9a-f]{32}$'
      or coalesce(row_data.source_name,'') not in ('pc-lead-finder:overture','pc-lead-finder:seznam','pc-lead-finder:bing','pc-lead-finder:serper')
      or coalesce(row_data.website,'') !~ '^https?://[^[:space:]]+$' or length(row_data.website)>2048
      or coalesce(email_key,'') !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' or length(email_key)>320
      or coalesce(length(btrim(row_data.company_name)),0) not between 1 and 512
      or length(coalesce(row_data.city,''))>250 or coalesce(length(row_data.notes),0) not between 1 and 8192
      then raise exception 'Invalid collector row'; end if;
    insert into public.agency_outreach_leads(source_id,company_name,email,website,city,source_name,notes,review_state,priority,outreach_status)
    select row_data.source_id,row_data.company_name,email_key,row_data.website,row_data.city,row_data.source_name,row_data.notes,'review','REVIEW','new'
    where not exists (select 1 from public.agency_outreach_leads e where e.source_id=row_data.source_id
      or lower(btrim(e.email))=email_key or substring(regexp_replace(lower(btrim(e.website)), '^(https?://)?(www\.)?', '') from '^[^/?#]+')=host_key)
    on conflict(source_id) do nothing;
    if found then added := added+1; end if;
  end loop;
  return jsonb_build_object('received',jsonb_array_length(items),'inserted',added);
end $$;
revoke all on function pc_lead_ingest.submit(jsonb) from public, anon, authenticated;
grant usage on schema pc_lead_ingest to anon;
grant execute on function pc_lead_ingest.submit(jsonb) to anon;

create function public.submit_pc_lead_review(items jsonb) returns jsonb
language sql security invoker set search_path='' as $$select pc_lead_ingest.submit(items)$$;
revoke all on function public.submit_pc_lead_review(jsonb) from public, anon, authenticated;
grant execute on function public.submit_pc_lead_review(jsonb) to anon;
