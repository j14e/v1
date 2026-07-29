alter table public.messages
add column if not exists message_type text not null default 'member';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_message_type_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
    add constraint messages_message_type_check
    check (message_type in ('member', 'connection'));
  end if;
end
$$;

create table if not exists public.oracle_connections (
  id uuid primary key default gen_random_uuid(),
  member_low uuid not null references public.profiles(id) on delete cascade,
  member_high uuid not null references public.profiles(id) on delete cascade,
  initiated_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_low, member_high),
  check (member_low < member_high),
  check (initiated_by = member_low or initiated_by = member_high)
);

create index if not exists oracle_connections_member_low_idx
on public.oracle_connections (member_low, created_at desc);

create index if not exists oracle_connections_member_high_idx
on public.oracle_connections (member_high, created_at desc);

alter table public.oracle_connections enable row level security;

drop policy if exists "Members see their Oracle connections"
on public.oracle_connections;
create policy "Members see their Oracle connections"
on public.oracle_connections for select
to authenticated
using (auth.uid() = member_low or auth.uid() = member_high);

revoke all on public.oracle_connections from anon;
revoke insert, update, delete on public.oracle_connections from authenticated;
grant select on public.oracle_connections to authenticated;

drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and message_type = 'member'
  and exists (
    select 1
    from public.profiles sender
    where sender.id = auth.uid()
      and sender.verified = true
      and sender.frozen = false
  )
  and exists (
    select 1
    from public.profiles recipient
    where recipient.id = recipient_id
      and recipient.verified = true
      and recipient.frozen = false
  )
);

create or replace function public.run_connection_oracle()
returns table (
  matched_id uuid,
  display_name text,
  availability_status text,
  year_level text,
  programme text,
  major text,
  department text,
  courses text[],
  avatar_url text,
  match_reasons text[],
  connected_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  oracle_user record;
  candidate record;
  low_member uuid;
  high_member uuid;
  new_connection_id uuid;
  new_connected_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in to use Connection Oracle.';
  end if;

  select
    p.id,
    p.year_level,
    p.programme,
    p.major,
    p.department,
    p.courses
  into oracle_user
  from public.profiles p
  where p.id = auth.uid()
    and p.verified = true
    and p.frozen = false;

  if not found then
    raise exception 'A verified, active profile is required.';
  end if;

  for candidate in
    select
      p.id,
      p.display_name,
      p.availability_status,
      p.year_level,
      p.programme,
      p.major,
      p.department,
      p.courses,
      p.avatar_url,
      array_remove(
        array[
          case
            when p.year_level = oracle_user.year_level then 'same year'
          end,
          case
            when p.programme is not null
              and p.programme = oracle_user.programme then 'same programme'
          end,
          case
            when p.major is not null
              and p.major = oracle_user.major then 'same major'
          end,
          case
            when p.department is not null
              and p.department = oracle_user.department then 'same department'
          end,
          case
            when p.courses && oracle_user.courses then 'shared courses'
          end
        ],
        null
      ) as reasons
    from public.profiles p
    where p.id <> oracle_user.id
      and p.verified = true
      and p.frozen = false
      and not exists (
        select 1
        from public.oracle_connections existing
        where (
          existing.member_low = oracle_user.id
          and existing.member_high = p.id
        ) or (
          existing.member_low = p.id
          and existing.member_high = oracle_user.id
        )
      )
    order by
      (p.year_level = oracle_user.year_level) desc,
      (
        case
          when p.programme is not null
            and p.programme = oracle_user.programme then 8
          else 0
        end
        + case
          when p.major is not null
            and p.major = oracle_user.major then 6
          else 0
        end
        + case
          when p.department is not null
            and p.department = oracle_user.department then 4
          else 0
        end
        + (
          select count(*)::integer
          from unnest(p.courses) candidate_course
          where candidate_course = any(oracle_user.courses)
        )
      ) desc,
      random()
    limit 5
  loop
    if oracle_user.id < candidate.id then
      low_member := oracle_user.id;
      high_member := candidate.id;
    else
      low_member := candidate.id;
      high_member := oracle_user.id;
    end if;

    new_connection_id := null;
    new_connected_at := now();

    insert into public.oracle_connections (
      member_low,
      member_high,
      initiated_by,
      created_at
    )
    values (
      low_member,
      high_member,
      oracle_user.id,
      new_connected_at
    )
    on conflict (member_low, member_high) do nothing
    returning id into new_connection_id;

    if new_connection_id is null then
      continue;
    end if;

    insert into public.messages (
      sender_id,
      recipient_id,
      body,
      message_type
    )
    values (
      oracle_user.id,
      candidate.id,
      'connected',
      'connection'
    );

    matched_id := candidate.id;
    display_name := candidate.display_name;
    availability_status := candidate.availability_status;
    year_level := candidate.year_level;
    programme := candidate.programme;
    major := candidate.major;
    department := candidate.department;
    courses := candidate.courses;
    avatar_url := candidate.avatar_url;
    match_reasons := candidate.reasons;
    connected_at := new_connected_at;
    return next;
  end loop;
end;
$$;

revoke all on function public.run_connection_oracle() from public;
revoke all on function public.run_connection_oracle() from anon;
grant execute on function public.run_connection_oracle() to authenticated;
