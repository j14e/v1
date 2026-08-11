create table if not exists public.live_match_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  fallback_connected_at timestamptz
);

create index if not exists live_match_queue_active_idx
on public.live_match_queue (last_seen_at desc);

alter table public.live_match_queue enable row level security;
revoke all on public.live_match_queue from anon;
revoke all on public.live_match_queue from authenticated;

drop function if exists public.join_live_match_queue();
create or replace function public.join_live_match_queue()
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
  queue_count integer
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
begin
  if auth.uid() is null then
    raise exception 'Sign in to match.';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select * into current_member
  from public.profiles
  where id = auth.uid()
    and verified = true
    and frozen = false;

  if not found then
    raise exception 'A verified, active SONA profile is required.';
  end if;

  delete from public.live_match_queue
  where last_seen_at < now() - interval '2 minutes';

  select * into waiting_entry
  from public.live_match_queue
  where user_id = current_member.id
  for update;

  if found then
    update public.live_match_queue
    set last_seen_at = now()
    where user_id = current_member.id;

    select count(*)::integer into active_queue_count
    from public.live_match_queue
    where last_seen_at >= now() - interval '2 minutes';

    return query select 'queued'::text, null::uuid, null::text, null::text,
      null::text, null::text, null::text, null::text[], null::text, active_queue_count;
    return;
  end if;

  select q.* into waiting_entry
  from public.live_match_queue q
  join public.profiles p on p.id = q.user_id
  where q.user_id <> current_member.id
    and q.last_seen_at >= now() - interval '2 minutes'
    and p.verified = true
    and p.frozen = false
  order by random()
  limit 1
  for update of q skip locked;

  if found then
    select * into matched_member
    from public.profiles
    where id = waiting_entry.user_id;

    delete from public.live_match_queue
    where user_id = waiting_entry.user_id;

    insert into public.messages (sender_id, recipient_id, body, message_type)
    values (current_member.id, matched_member.id, 'Connected!', 'connection');

    select count(*)::integer into active_queue_count
    from public.live_match_queue
    where last_seen_at >= now() - interval '2 minutes';

    return query select
      'matched'::text, matched_member.id, matched_member.display_name,
      matched_member.year_level, matched_member.programme, matched_member.major,
      matched_member.department, matched_member.courses, matched_member.avatar_url,
      active_queue_count;
    return;
  end if;

  insert into public.live_match_queue (user_id, joined_at, last_seen_at)
  values (current_member.id, now(), now());

  select * into matched_member
  from public.profiles
  where id <> current_member.id
    and verified = true
    and frozen = false
  order by random()
  limit 1;
  fallback_found := found;

  select count(*)::integer into active_queue_count
  from public.live_match_queue
  where last_seen_at >= now() - interval '2 minutes';

  if fallback_found then
    insert into public.messages (sender_id, recipient_id, body, message_type)
    values (current_member.id, matched_member.id, 'Connected!', 'connection');

    update public.live_match_queue
    set fallback_connected_at = now()
    where user_id = current_member.id;

    return query select
      'queued_fallback'::text, matched_member.id, matched_member.display_name,
      matched_member.year_level, matched_member.programme, matched_member.major,
      matched_member.department, matched_member.courses, matched_member.avatar_url,
      active_queue_count;
    return;
  end if;

  return query select 'queued'::text, null::uuid, null::text, null::text,
    null::text, null::text, null::text, null::text[], null::text, active_queue_count;
end;
$$;

create or replace function public.touch_live_match_queue()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  update public.live_match_queue set last_seen_at = now() where user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.leave_live_match_queue()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.live_match_queue where user_id = auth.uid();
end;
$$;

revoke all on function public.join_live_match_queue() from public;
revoke all on function public.join_live_match_queue() from anon;
grant execute on function public.join_live_match_queue() to authenticated;
revoke all on function public.touch_live_match_queue() from public;
revoke all on function public.touch_live_match_queue() from anon;
grant execute on function public.touch_live_match_queue() to authenticated;
revoke all on function public.leave_live_match_queue() from public;
revoke all on function public.leave_live_match_queue() from anon;
grant execute on function public.leave_live_match_queue() to authenticated;

drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and message_type = 'member'
  and (media_type is null or media_type = 'image')
  and exists (
    select 1 from public.profiles sender
    where sender.id = auth.uid() and sender.verified = true and sender.frozen = false
  )
  and exists (
    select 1 from public.profiles recipient
    where recipient.id = recipient_id and recipient.verified = true and recipient.frozen = false
  )
);
