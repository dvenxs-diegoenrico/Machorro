-- chorro.com · sessions (the private console)
-- Producer (Dani) uploads; panas (clients) listen. Nobody downloads.
--
-- Security model
--   * Every table has row-level security. Panas only ever see projects shared with their email.
--   * Audio is compressed AND encrypted in Dani's browser before upload. Storage holds ciphertext only.
--   * Track keys live in track_keys, which no one can read directly. A pana gets one key at a time
--     through get_track_key(), which checks access, rate-limits and logs the listen.
--   * The storage bucket is private. Files are reached only by short-lived signed URLs, and only by
--     people with access to the project.

create extension if not exists pgcrypto;

-- ── who is the producer ─────────────────────────────────────────
create table public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;
-- no policies: only the security-definer helpers below read it

create or replace function public.current_email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.email = public.current_email())
$$;

-- ── panas ───────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null unique check (email = lower(email) and email like '%@%'),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  catalogue_no text not null unique check (catalogue_no ~ '^ec-[0-9]{3,}$'),
  artist text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.project_access (
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, client_id)
);

create or replace function public.has_access(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.project_access pa
    join public.clients c on c.id = pa.client_id
    where pa.project_id = p_project and c.email = public.current_email()
  )
$$;

create table public.versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null check (length(label) between 1 and 60),
  notes text not null default '',
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.versions (project_id);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versions (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('stem', 'group', 'mix', 'master')),
  grp text not null default '' check (grp in ('', 'drums', 'bass', 'guitars', 'keys', 'vox', 'fx', 'other')),
  sort int not null default 0,
  stream_path text not null,
  codec text not null,
  sample_rate int not null,
  channels int not null,
  frames bigint not null,
  duration real not null,
  size_bytes bigint not null,
  peaks jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.tracks (version_id);

create or replace function public.track_project(p_track uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select v.project_id from public.tracks t join public.versions v on v.id = t.version_id where t.id = p_track
$$;

-- the decryption keys: no direct reads for anyone but the producer
create table public.track_keys (
  track_id uuid primary key references public.tracks (id) on delete cascade,
  key text not null
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versions (id) on delete cascade,
  author_id uuid not null default auth.uid(),
  author_name text not null default '',
  time_seconds real not null check (time_seconds >= 0),
  body text not null check (length(body) between 1 and 2000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.comments (version_id);

-- every key handed out, for the producer's eyes (and the rate limit)
create table public.listens (
  id bigint generated always as identity primary key,
  track_id uuid not null references public.tracks (id) on delete cascade,
  email text not null,
  at timestamptz not null default now()
);
create index on public.listens (email, at);

-- invite links: /sessions/join/<token> pre-fills the pana's email on the login page
create table public.invites (
  token uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

-- ── row-level security ─────────────────────────────────────────
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_access enable row level security;
alter table public.versions enable row level security;
alter table public.tracks enable row level security;
alter table public.track_keys enable row level security;
alter table public.comments enable row level security;
alter table public.listens enable row level security;
alter table public.invites enable row level security;

create policy "producer manages panas" on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "a pana sees themself" on public.clients for select to authenticated using (email = public.current_email());

create policy "producer manages projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "panas see shared projects" on public.projects for select to authenticated using (public.has_access(id));

create policy "producer manages access" on public.project_access for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "producer manages versions" on public.versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "panas see versions" on public.versions for select to authenticated using (public.has_access(project_id));

create policy "producer manages tracks" on public.tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "panas see tracks" on public.tracks for select to authenticated
  using (public.has_access((select v.project_id from public.versions v where v.id = version_id)));

create policy "producer manages keys" on public.track_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "read comments" on public.comments for select to authenticated
  using (public.has_access((select v.project_id from public.versions v where v.id = version_id)));
create policy "write own comments" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.has_access((select v.project_id from public.versions v where v.id = version_id)));
create policy "producer resolves comments" on public.comments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "delete own or producer" on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy "producer reads listens" on public.listens for select to authenticated using (public.is_admin());
create policy "producer manages invites" on public.invites for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── functions the app calls ────────────────────────────────────
-- one key, for one track, for someone with access; at most 240 keys per person per 10 minutes
create or replace function public.get_track_key(p_track uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := public.current_email();
  v_key text;
begin
  if v_email = '' then raise exception 'not signed in' using errcode = '28000'; end if;
  if not public.has_access(public.track_project(p_track)) then
    raise exception 'no access' using errcode = '42501';
  end if;
  if (select count(*) from public.listens l where l.email = v_email and l.at > now() - interval '10 minutes') >= 240 then
    raise exception 'slow down' using errcode = '54000';
  end if;
  select k.key into v_key from public.track_keys k where k.track_id = p_track;
  insert into public.listens (track_id, email) values (p_track, v_email);
  return v_key;
end $$;
revoke all on function public.get_track_key(uuid) from public, anon;
grant execute on function public.get_track_key(uuid) to authenticated;

-- invite link → the email to pre-fill (only while the invite is valid)
create or replace function public.invite_email(p_token uuid) returns text
language sql stable security definer set search_path = '' as $$
  select c.email from public.invites i join public.clients c on c.id = i.client_id
  where i.token = p_token and i.expires_at > now()
$$;
grant execute on function public.invite_email(uuid) to anon, authenticated;

-- am I the producer? (the app uses it to choose the panel)
grant execute on function public.is_admin() to authenticated;

-- ── storage: one private bucket, ciphertext only ───────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sessions', 'sessions', false, 104857600, array['application/octet-stream'])
on conflict (id) do nothing;

-- paths: <project_id>/<version_id>/<track_id>.chorro
create policy "producer writes session files" on storage.objects for insert to authenticated
  with check (bucket_id = 'sessions' and public.is_admin());
create policy "producer updates session files" on storage.objects for update to authenticated
  using (bucket_id = 'sessions' and public.is_admin());
create policy "producer deletes session files" on storage.objects for delete to authenticated
  using (bucket_id = 'sessions' and public.is_admin());
create policy "people with access read session files" on storage.objects for select to authenticated
  using (bucket_id = 'sessions' and public.has_access(((storage.foldername(name))[1])::uuid));

-- ── the producer ───────────────────────────────────────────────
-- Replace with Dani's login email before applying:
-- insert into public.admins (email) values ('dani@example.com');
