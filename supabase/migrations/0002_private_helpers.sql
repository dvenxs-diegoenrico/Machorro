-- Harden: the helpers behind the access rules move to a private schema that the API doesn't expose.
-- Publicly callable are only: is_admin() (signed-in), get_track_key() (signed-in, checks access),
-- invite_email() (anyone holding a secret invite token).

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.email = private.current_email())
$$;

create or replace function private.has_access(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.project_access pa
    join public.clients c on c.id = pa.client_id
    where pa.project_id = p_project and c.email = private.current_email()
  )
$$;

create or replace function private.track_project(p_track uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select v.project_id from public.tracks t join public.versions v on v.id = t.version_id where t.id = p_track
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- policies → private helpers
drop policy "producer manages panas" on public.clients;
drop policy "a pana sees themself" on public.clients;
drop policy "producer manages projects" on public.projects;
drop policy "panas see shared projects" on public.projects;
drop policy "producer manages access" on public.project_access;
drop policy "producer manages versions" on public.versions;
drop policy "panas see versions" on public.versions;
drop policy "producer manages tracks" on public.tracks;
drop policy "panas see tracks" on public.tracks;
drop policy "producer manages keys" on public.track_keys;
drop policy "read comments" on public.comments;
drop policy "write own comments" on public.comments;
drop policy "producer resolves comments" on public.comments;
drop policy "delete own or producer" on public.comments;
drop policy "producer reads listens" on public.listens;
drop policy "producer manages invites" on public.invites;
drop policy "producer writes session files" on storage.objects;
drop policy "producer updates session files" on storage.objects;
drop policy "producer deletes session files" on storage.objects;
drop policy "people with access read session files" on storage.objects;

create policy "producer manages panas" on public.clients for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "a pana sees themself" on public.clients for select to authenticated using (email = private.current_email());
create policy "producer manages projects" on public.projects for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "panas see shared projects" on public.projects for select to authenticated using (private.has_access(id));
create policy "producer manages access" on public.project_access for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "producer manages versions" on public.versions for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "panas see versions" on public.versions for select to authenticated using (private.has_access(project_id));
create policy "producer manages tracks" on public.tracks for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "panas see tracks" on public.tracks for select to authenticated
  using (private.has_access((select v.project_id from public.versions v where v.id = version_id)));
create policy "producer manages keys" on public.track_keys for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "read comments" on public.comments for select to authenticated
  using (private.has_access((select v.project_id from public.versions v where v.id = version_id)));
create policy "write own comments" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and private.has_access((select v.project_id from public.versions v where v.id = version_id)));
create policy "producer resolves comments" on public.comments for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "delete own or producer" on public.comments for delete to authenticated using (author_id = auth.uid() or private.is_admin());
create policy "producer reads listens" on public.listens for select to authenticated using (private.is_admin());
create policy "producer manages invites" on public.invites for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "producer writes session files" on storage.objects for insert to authenticated
  with check (bucket_id = 'sessions' and private.is_admin());
create policy "producer updates session files" on storage.objects for update to authenticated
  using (bucket_id = 'sessions' and private.is_admin());
create policy "producer deletes session files" on storage.objects for delete to authenticated
  using (bucket_id = 'sessions' and private.is_admin());
create policy "people with access read session files" on storage.objects for select to authenticated
  using (bucket_id = 'sessions' and private.has_access(((storage.foldername(name))[1])::uuid));

-- the public API surface
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select private.is_admin() $$;

create or replace function public.get_track_key(p_track uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := private.current_email();
  v_key text;
begin
  if v_email = '' then raise exception 'not signed in' using errcode = '28000'; end if;
  if not private.has_access(private.track_project(p_track)) then
    raise exception 'no access' using errcode = '42501';
  end if;
  if (select count(*) from public.listens l where l.email = v_email and l.at > now() - interval '10 minutes') >= 240 then
    raise exception 'slow down' using errcode = '54000';
  end if;
  select k.key into v_key from public.track_keys k where k.track_id = p_track;
  insert into public.listens (track_id, email) values (p_track, v_email);
  return v_key;
end $$;

drop function public.has_access(uuid);
drop function public.track_project(uuid);
drop function public.current_email();

revoke all on function public.is_admin() from public, anon;
revoke all on function public.get_track_key(uuid) from public, anon;
revoke all on function public.invite_email(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_track_key(uuid) to authenticated;
grant execute on function public.invite_email(uuid) to anon, authenticated;
