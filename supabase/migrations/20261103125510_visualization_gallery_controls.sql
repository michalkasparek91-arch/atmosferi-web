create table public.visualization_gallery_controls (
  image_key text primary key check (length(image_key) between 1 and 300),
  hidden boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0)
);
alter table public.visualization_gallery_controls enable row level security;
revoke all on public.visualization_gallery_controls from anon, authenticated;
grant select on public.visualization_gallery_controls to anon, authenticated;
grant insert, update on public.visualization_gallery_controls to authenticated;
grant all on public.visualization_gallery_controls to service_role;
create policy gallery_controls_read on public.visualization_gallery_controls
  for select to anon, authenticated using (true);
create policy gallery_controls_insert on public.visualization_gallery_controls
  for insert to authenticated with check (
    exists(select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
  );
create policy gallery_controls_update on public.visualization_gallery_controls
  for update to authenticated using (
    exists(select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
  ) with check (
    exists(select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
  );
