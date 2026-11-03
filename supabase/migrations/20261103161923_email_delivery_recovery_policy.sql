-- Individual opt-outs are always suppressed, but are not a global outage.
-- Old-provider events must not repeatedly stop a new-provider recovery run.
create or replace function public.suppress_failed_email_recipient() returns trigger
language plpgsql security invoker set search_path='' as $$
declare recipient text; settings public.email_dispatch_state%rowtype; total integer; failures integer;
begin
 if TG_OP='UPDATE' and OLD.delivery_status is not distinct from NEW.delivery_status then return NEW; end if;
 if NEW.delivery_status not in ('bounced','spam','unsubscribed','blocked') then return NEW; end if;
 if NEW.delivery_status in ('bounced','spam','unsubscribed') then
  select lower(trim(email)) into recipient from public.marketing_leads where id=NEW.lead_id;
  if recipient is not null then
   insert into public.email_recipient_suppression(email,reason) values(recipient,'delivery_'||NEW.delivery_status) on conflict(email) do nothing;
   update public.marketing_leads set outreach_import_review=true,outreach_email_ready=false,
    tags=array(select distinct x from unnest(coalesce(tags,'{}')||array['email:suppressed']) x)
   where lower(trim(email))=recipient;
  end if;
 end if;
 if NEW.delivery_status='unsubscribed' then return NEW; end if;
 select * into settings from public.email_dispatch_state where id=1 for update;
 if settings.safety_started_at is null or coalesce(NEW.sent_at,NEW.dispatch_attempted_at)<settings.safety_started_at then return NEW; end if;
 if NEW.delivery_status='spam' then
  update public.email_dispatch_state set enabled=false,safety_paused=true,last_error='Pozastaveno: příjemce označil zprávu jako spam. Zkontrolujte doručitelnost.' where id=1;
 elsif NEW.provider=settings.provider and NEW.delivery_status='blocked' then
  update public.email_dispatch_state set enabled=false,safety_paused=true,last_error='Pozastaveno: server příjemce blokuje poskytovatele. '||left(coalesce(NEW.error_message,''),300) where id=1;
 elsif NEW.provider=settings.provider and NEW.delivery_status='bounced' then
  select count(*),count(*) filter(where delivery_status='bounced') into total,failures
  from public.email_outbox where provider=settings.provider
   and coalesce(sent_at,dispatch_attempted_at)>=greatest(settings.safety_started_at,now()-interval '24 hours')
   and status in ('sent','failed');
  if failures>=3 or (total>=20 and failures::numeric/total>=0.05) then
   update public.email_dispatch_state set enabled=false,safety_paused=true,
    last_error=format('Pozastaveno: %s nedoručitelných zpráv z %s pokusů v aktuálním běhu. Chybné adresy byly vyřazeny.',failures,total) where id=1;
  end if;
 end if;
 return NEW;
end;
$$;

-- Preserve event type/reason atomically, instead of treating every soft bounce as a dead mailbox.
create function public.apply_email_delivery_event(p_message_id text,p_event text,p_reason text default '',p_at text default '')
returns integer language plpgsql security invoker set search_path='' as $$
declare item record; new_status text; event jsonb; updated integer:=0;
begin
 new_status:=case p_event
  when 'delivered' then 'delivered' when 'opened' then 'opened' when 'unique_opened' then 'opened'
  when 'click' then 'clicked' when 'hard_bounce' then 'bounced' when 'invalid_email' then 'bounced'
  when 'blocked' then 'blocked' when 'soft_bounce' then 'deferred' when 'deferred' then 'deferred'
  when 'complaint' then 'spam' when 'spam' then 'spam' when 'unsubscribed' then 'unsubscribed' when 'unsubscribe' then 'unsubscribed' end;
 if new_status is null or p_message_id is null or p_message_id='' then return 0; end if;
 if new_status in ('bounced','deferred') and lower(coalesce(p_reason,'')) ~ '(spamcop|blacklist|blocklist|spamhaus|ip.*blocked)' then new_status:='blocked'; end if;
 event:=jsonb_build_object('event',p_event,'reason',left(coalesce(p_reason,''),1000),'at',left(coalesce(p_at,''),100));
 for item in select id,delivery_status,coalesce(delivery_events,'[]'::jsonb) as events from public.email_outbox
   where provider='brevo' and provider_message_id=p_message_id for update loop
  if item.events @> jsonb_build_array(event) then continue; end if;
  if item.delivery_status in ('spam','unsubscribed','bounced') and new_status not in ('spam','unsubscribed') then new_status:=item.delivery_status; end if;
  if item.delivery_status='clicked' and new_status in ('opened','delivered','deferred') then new_status:='clicked'; end if;
  if item.delivery_status='opened' and new_status in ('delivered','deferred') then new_status:='opened'; end if;
  update public.email_outbox set delivery_status=new_status,
   error_message=case when new_status in ('bounced','blocked','deferred','spam') then left(coalesce(p_reason,''),1000) else error_message end,
   delivery_events=(select jsonb_agg(value order by ord) from jsonb_array_elements(item.events||jsonb_build_array(event)) with ordinality as e(value,ord)
    where ord>greatest(0,jsonb_array_length(item.events)+1-50)) where id=item.id;
  updated:=updated+1;
 end loop;
 return updated;
end;
$$;
revoke all on function public.apply_email_delivery_event(text,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_email_delivery_event(text,text,text,text) to service_role;
