-- The sender (edge function dispatch-agency-emails) runs as service_role.
-- This project does not grant new tables to service_role by default, so do it explicitly.
grant select, insert, update, delete on
  public.agency_outreach_leads,
  public.agency_outreach_templates,
  public.agency_outreach_settings,
  public.agency_outreach_log
to service_role;
grant select, insert on public.email_recipient_suppression to service_role;
grant select on public.profiles to service_role;
