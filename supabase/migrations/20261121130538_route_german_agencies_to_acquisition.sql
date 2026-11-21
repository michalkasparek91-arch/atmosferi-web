-- The old CRM retains the import evidence; only acquisitions may address a routed lead.
alter table public.agency_outreach_leads drop constraint agency_outreach_leads_review_state_check;
alter table public.agency_outreach_leads add constraint agency_outreach_leads_review_state_check
  check (review_state in ('review','ready','acquisition'));

insert into public.email_templates
  (slug,name,category,language,trigger_type,is_enabled,layout_type,sender_email,subject,body,
   show_cta_button,show_job_widget,signature_greeting,signature_role,ps_footer_enabled)
values ('atmosferi-agenturen-de','Marketingové agentury · Německo','agentury','de','cron',false,'plain',
  'michal@atmosferi.com','Externe Unterstützung für Ihre Webprojekte',
  E'Guten Tag,\n\nich bin Michal Kašpárek von Atmosferi°. Ich entwickle Websites, Webanwendungen und Automatisierungen. Wenn bei Ihnen ein Kundenprojekt ansteht und im Team die Zeit für die technische Umsetzung fehlt, unterstütze ich Sie gerne – auch unter Ihrem Agenturnamen.\n\nArbeitsbeispiele finden Sie unter https://www.atmosferi.com/for-agencies.\n\nWäre eine solche Zusammenarbeit für Ihre Agentur interessant?\n\nFreundliche Grüße\nMichal Kašpárek\nAtmosferi°\n\nWenn Sie keine weiteren Nachrichten wünschen, genügt eine kurze Antwort.',
  false,false,'','',false)
on conflict (slug) do nothing;

create index if not exists marketing_leads_normalized_email_lookup on public.marketing_leads (lower(btrim(email)));

create function public.route_de_agency_acquisition() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
  target_email text := lower(btrim(new.email));
  existing_lead public.marketing_leads%rowtype;
  same_email_count integer;
begin
  if tg_op='UPDATE' then
    if old.review_state='acquisition' then
      -- Superseded CRM records must never be approved or sent via the Czech dispatcher.
      return old;
    end if;
  end if;
  if new.source_id not like 'pc-lead:%' or coalesce(new.source_name,'') not like 'pc-lead-finder:%'
     or not (string_to_array(replace(new.notes,chr(13),''),chr(10)) @>
          array['Obor: Marketingová agentura','Cílová země: Německo (DE)'])
     or new.review_state<>'review' or new.outreach_status<>'new'
     or new.sent_count<>0 or new.last_contacted_at is not null then
    return new;
  end if;

  if tg_op='INSERT' and exists (select 1 from public.agency_outreach_leads where source_id=new.source_id) then
    return new;
  end if;
  select count(*) into same_email_count from public.marketing_leads where lower(btrim(email))=target_email;
  if same_email_count=1 then
    select * into existing_lead from public.marketing_leads where lower(btrim(email))=target_email for update;
  end if;
  if same_email_count=0 then
    insert into public.marketing_leads (email,company_name,website,city,phone,description,source,
      category,subcategory,country,language,outreach_template_slug,outreach_import_review,outreach_email_ready)
    values (target_email,new.company_name,new.website,new.city,substring(new.notes from '(?:^|\n)Telefon: ([^\r\n]+)'),
      new.notes,new.source_name,'agentury',substring(new.notes from '(?:^|\n)Specializace: ([^\r\n]+)'),
      'DE','de','atmosferi-agenturen-de',true,false)
    on conflict (email) do nothing;
    if not found then new.source_reason := 'Akvizice: kolize e-mailu k prověření'; end if;
  elsif same_email_count=1 and existing_lead.category='marketing' and existing_lead.subcategory='Marketingová agentura'
      and existing_lead.language='de' and existing_lead.outreach_import_review and not existing_lead.outreach_email_ready
      and existing_lead.outreach_template_slug is null and existing_lead.source='scraped'
      and split_part(target_email,'@',2)=split_part(regexp_replace(lower(new.website),'^https?://(www[.])?',''),'/',1) then
    -- Only adopt a reviewed agency identity whose email domain matches its official website.
    update public.marketing_leads set category='agentury',outreach_template_slug='atmosferi-agenturen-de',
      company_name=coalesce(company_name,new.company_name),website=coalesce(website,new.website),city=coalesce(city,new.city),
      country=coalesce(country,'DE'),phone=coalesce(phone,substring(new.notes from '(?:^|\n)Telefon: ([^\r\n]+)')),
      description=concat_ws(chr(10),nullif(description,''),new.notes) where id=existing_lead.id;
  elsif same_email_count<>1 or existing_lead.category is distinct from 'agentury' or existing_lead.language is distinct from 'de'
      or existing_lead.outreach_template_slug is distinct from 'atmosferi-agenturen-de' then
    new.source_reason := 'Akvizice: kolize e-mailu k prověření';
  end if;
  new.review_state := 'acquisition';
  -- Legacy send_one also checks outreach_status; this block is local to the retired CRM copy.
  new.outreach_status := 'do_not_contact';
  return new;
end;
$$;
revoke all on function public.route_de_agency_acquisition() from public,anon,authenticated;
create trigger route_de_agency_acquisition before insert or update on public.agency_outreach_leads
for each row execute function public.route_de_agency_acquisition();

update public.agency_outreach_leads set updated_at=now()
where source_id like 'pc-lead:%' and source_name like 'pc-lead-finder:%' and review_state='review'
  and outreach_status='new' and sent_count=0 and last_contacted_at is null
  and string_to_array(replace(notes,chr(13),''),chr(10)) @> array['Obor: Marketingová agentura','Cílová země: Německo (DE)'];
