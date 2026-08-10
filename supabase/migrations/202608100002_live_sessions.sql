create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.live_session_members (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, member_id)
);

create table if not exists public.live_session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists live_session_members_member_idx
on public.live_session_members (member_id, joined_at desc);

create index if not exists live_session_messages_session_idx
on public.live_session_messages (session_id, created_at asc);

alter table public.live_sessions enable row level security;
alter table public.live_session_members enable row level security;
alter table public.live_session_messages enable row level security;

drop policy if exists "Members read their live sessions" on public.live_sessions;
create policy "Members read their live sessions"
on public.live_sessions for select
to authenticated
using (
  exists (
    select 1 from public.live_session_members member
    where member.session_id = id and member.member_id = auth.uid()
  )
);

drop policy if exists "Members read their own live memberships" on public.live_session_members;
create policy "Members read their own live memberships"
on public.live_session_members for select
to authenticated
using (member_id = auth.uid());

drop policy if exists "Members read live messages" on public.live_session_messages;
create policy "Members read live messages"
on public.live_session_messages for select
to authenticated
using (
  exists (
    select 1 from public.live_session_members member
    where member.session_id = session_id and member.member_id = auth.uid()
  )
);

drop policy if exists "Members send live messages" on public.live_session_messages;
create policy "Members send live messages"
on public.live_session_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.live_session_members member
    where member.session_id = session_id and member.member_id = auth.uid()
  )
);

revoke all on public.live_sessions from anon;
revoke all on public.live_session_members from anon;
revoke all on public.live_session_messages from anon;
revoke insert, update, delete on public.live_sessions from authenticated;
revoke insert, update, delete on public.live_session_members from authenticated;
grant select, insert on public.live_session_messages to authenticated;

drop function if exists public.join_live_match_queue();
create function public.join_live_match_queue()
returns table (
  status text,
  matched_id uuid,
  display_name text,
  year_level text,
  programme text,
  major text,
  department text,
  courses text[],
  avatar_url text,
  queue_count integer,
  live_session_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_member public.profiles%rowtype;
  waiting_entry public.live_match_queue%rowtype;
  matched_member public.profiles%rowtype;
  active_queue_count integer;
  fallback_found boolean;
  new_session_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to match.'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select * into current_member from public.profiles
  where id = auth.uid() and verified = true and frozen = false;
  if not found then raise exception 'A verified, active SONA profile is required.'; end if;

  delete from public.live_match_queue where last_seen_at < now() - interval '2 minutes';

  select * into waiting_entry from public.live_match_queue
  where user_id = current_member.id for update;
  if found then
    update public.live_match_queue set last_seen_at = now() where user_id = current_member.id;
    select count(*)::integer into active_queue_count from public.live_match_queue
    where last_seen_at >= now() - interval '2 minutes';
    return query select 'queued'::text, null::uuid, null::text, null::text,
      null::text, null::text, null::text, null::text[], null::text, active_queue_count, null::uuid;
    return;
  end if;

  select q.* into waiting_entry
  from public.live_match_queue q
  join public.profiles p on p.id = q.user_id
  where q.user_id <> current_member.id
    and q.last_seen_at >= now() - interval '2 minutes'
    and p.verified = true and p.frozen = false
  order by random() limit 1 for update of q skip locked;

  if found then
    select * into matched_member from public.profiles where id = waiting_entry.user_id;
    delete from public.live_match_queue where user_id = waiting_entry.user_id;
    insert into public.live_sessions default values returning id into new_session_id;
    insert into public.live_session_members (session_id, member_id)
    values (new_session_id, current_member.id), (new_session_id, matched_member.id);
    select count(*)::integer into active_queue_count from public.live_match_queue
    where last_seen_at >= now() - interval '2 minutes';
    return query select 'matched'::text, matched_member.id, matched_member.display_name,
      matched_member.year_level, matched_member.programme, matched_member.major,
      matched_member.department, matched_member.courses, matched_member.avatar_url,
      active_queue_count, new_session_id;
    return;
  end if;

  insert into public.live_match_queue (user_id, joined_at, last_seen_at)
  values (current_member.id, now(), now());
  select * into matched_member from public.profiles
  where id <> current_member.id and verified = true and frozen = false
  order by random() limit 1;
  fallback_found := found;
  select count(*)::integer into active_queue_count from public.live_match_queue
  where last_seen_at >= now() - interval '2 minutes';

  if fallback_found then
    insert into public.messages (sender_id, recipient_id, body, message_type)
    values (current_member.id, matched_member.id, 'Connected!', 'connection');
    update public.live_match_queue set fallback_connected_at = now()
    where user_id = current_member.id;
    return query select 'queued_fallback'::text, matched_member.id, matched_member.display_name,
      matched_member.year_level, matched_member.programme, matched_member.major,
      matched_member.department, matched_member.courses, matched_member.avatar_url,
      active_queue_count, null::uuid;
    return;
  end if;

  return query select 'queued'::text, null::uuid, null::text, null::text,
    null::text, null::text, null::text, null::text[], null::text, active_queue_count, null::uuid;
end;
$$;

create or replace function public.get_latest_live_session()
returns table (
  session_id uuid,
  peer_id uuid,
  display_name text,
  avatar_url text
)
language sql
security definer
set search_path = ''
as $$
  select session_member.session_id, peer.member_id, profile.display_name, profile.avatar_url
  from public.live_session_members session_member
  join public.live_sessions live_session on live_session.id = session_member.session_id
  join public.live_session_members peer on peer.session_id = session_member.session_id
    and peer.member_id <> session_member.member_id
  join public.profiles profile on profile.id = peer.member_id
  where session_member.member_id = auth.uid()
  order by live_session.created_at desc
  limit 1
$$;

revoke all on function public.join_live_match_queue() from public;
revoke all on function public.join_live_match_queue() from anon;
grant execute on function public.join_live_match_queue() to authenticated;
revoke all on function public.get_latest_live_session() from public;
revoke all on function public.get_latest_live_session() from anon;
grant execute on function public.get_latest_live_session() to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_session_members') then
    alter publication supabase_realtime add table public.live_session_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_session_messages') then
    alter publication supabase_realtime add table public.live_session_messages;
  end if;
end
$$;
