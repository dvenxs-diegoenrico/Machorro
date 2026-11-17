-- Master control: a read-only owner login that can see how the whole system is doing.
--
-- The owner gets NO table access at all. They can call one function, master_stats(), which
-- returns counts, plays, health checks and the latest activity. They are not producers and
-- they have no access to any project, so they can't listen, read keys, download or change a
-- thing. The owner's email is added by hand in the database, never in this repository.

create table if not exists public.owners (
  email text primary key check (email = lower(email) and email like '%@%')
);
alter table public.owners enable row level security; -- no policies: nothing reads it through the API

create or replace function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.owners o where o.email = private.current_email())
$$;
revoke all on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$ select private.is_owner() $$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

create or replace function public.master_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_owner() then
    raise exception 'owner only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'at', now(),

    'counts', jsonb_build_object(
      'projects', (select count(*) from public.projects),
      'panas', (select count(*) from public.clients),
      'versions', (select count(*) from public.versions),
      'tracks', (select count(*) from public.tracks),
      'comments', (select count(*) from public.comments),
      'open_invites', (select count(*) from public.invites where expires_at > now()),
      'stored_bytes', (select coalesce(sum(size_bytes), 0) from public.tracks),
      'bucket_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects where bucket_id = 'sessions'),
      'bucket_files', (select count(*) from storage.objects where bucket_id = 'sessions')
    ),

    'plays', jsonb_build_object(
      'day', (select count(*) from public.listens where at > now() - interval '1 day'),
      'week', (select count(*) from public.listens where at > now() - interval '7 days'),
      'month', (select count(*) from public.listens where at > now() - interval '30 days'),
      'listeners_week', (select count(distinct email) from public.listens where at > now() - interval '7 days')
    ),

    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'plays', coalesce(p.n, 0), 'listeners', coalesce(p.u, 0)) order by d), '[]'::jsonb)
      from generate_series(current_date - 29, current_date, interval '1 day') d
      left join (
        select at::date as day, count(*) as n, count(distinct email) as u
        from public.listens where at >= current_date - 29 group by 1
      ) p on p.day = d::date
    ),

    'top_tracks', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select t.name, pr.catalogue_no, pr.title, count(*) as plays, count(distinct l.email) as listeners
        from public.listens l
        join public.tracks t on t.id = l.track_id
        join public.versions v on v.id = t.version_id
        join public.projects pr on pr.id = v.project_id
        where l.at > now() - interval '30 days'
        group by t.id, t.name, pr.catalogue_no, pr.title
        order by plays desc limit 8
      ) x
    ),

    'projects', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.catalogue_no desc), '[]'::jsonb) from (
        select pr.catalogue_no, pr.artist, pr.title, pr.created_at,
          (select count(*) from public.versions v where v.project_id = pr.id) as versions,
          (select count(*) from public.tracks t join public.versions v on v.id = t.version_id where v.project_id = pr.id) as tracks,
          (select coalesce(sum(t.size_bytes), 0) from public.tracks t join public.versions v on v.id = t.version_id where v.project_id = pr.id) as bytes,
          (select count(*) from public.project_access pa where pa.project_id = pr.id) as panas,
          (select count(*) from public.listens l join public.tracks t on t.id = l.track_id join public.versions v on v.id = t.version_id
             where v.project_id = pr.id and l.at > now() - interval '30 days') as plays,
          (select max(l.at) from public.listens l join public.tracks t on t.id = l.track_id join public.versions v on v.id = t.version_id
             where v.project_id = pr.id) as last_play
        from public.projects pr
      ) x
    ),

    'panas', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.last_play desc nulls last, x.name), '[]'::jsonb) from (
        select c.name, c.email, c.created_at,
          (select count(*) from public.project_access pa where pa.client_id = c.id) as projects,
          (select count(*) from public.listens l where l.email = c.email and l.at > now() - interval '30 days') as plays,
          (select max(l.at) from public.listens l where l.email = c.email) as last_play
        from public.clients c
      ) x
    ),

    'recent_plays', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select l.at, l.email, t.name as track, pr.catalogue_no
        from public.listens l
        join public.tracks t on t.id = l.track_id
        join public.versions v on v.id = t.version_id
        join public.projects pr on pr.id = v.project_id
        order by l.at desc limit 25
      ) x
    ),

    'recent_comments', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select c.created_at, c.author_name, left(c.body, 300) as body, c.time_seconds, c.resolved, pr.catalogue_no
        from public.comments c
        join public.versions v on v.id = c.version_id
        join public.projects pr on pr.id = v.project_id
        order by c.created_at desc limit 15
      ) x
    ),

    -- each number is how many things are wrong; 0 is healthy
    'health', jsonb_build_object(
      'tracks_without_key', (select count(*) from public.tracks t where not exists (select 1 from public.track_keys k where k.track_id = t.id)),
      'tracks_missing_file', (select count(*) from public.tracks t where not exists (select 1 from storage.objects o where o.bucket_id = 'sessions' and o.name = t.stream_path)),
      'files_without_track', (select count(*) from storage.objects o where o.bucket_id = 'sessions' and not exists (select 1 from public.tracks t where t.stream_path = o.name)),
      'projects_without_current', (select count(*) from public.projects pr
        where exists (select 1 from public.versions v where v.project_id = pr.id)
          and not exists (select 1 from public.versions v where v.project_id = pr.id and v.is_current)),
      'projects_without_tracks', (select count(*) from public.projects pr
        where not exists (select 1 from public.versions v join public.tracks t on t.version_id = v.id where v.project_id = pr.id)),
      'panas_without_access', (select count(*) from public.clients c where not exists (select 1 from public.project_access pa where pa.client_id = c.id)),
      'heavy_listeners_24h', (select count(*) from (select email from public.listens where at > now() - interval '1 day' group by email having count(*) >= 300) h),
      'producers', (select count(*) from public.admins),
      'owners', (select count(*) from public.owners)
    )
  );
end $$;
revoke all on function public.master_stats() from public, anon;
grant execute on function public.master_stats() to authenticated;
