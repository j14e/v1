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
  oracle_user_id uuid;
  candidate record;
  low_member uuid;
  high_member uuid;
  new_connection_id uuid;
  new_connected_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in to use Connection Oracle.';
  end if;

  select p.id
  into oracle_user_id
  from public.profiles p
  where p.id = auth.uid()
    and p.verified = true
    and p.frozen = false
    and p.is_demo = false;

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
      p.avatar_url
    from public.profiles p
    where p.id <> oracle_user_id
      and p.verified = true
      and p.frozen = false
      and p.is_demo = false
      and not exists (
        select 1
        from public.oracle_connections existing
        where (
          existing.member_low = oracle_user_id
          and existing.member_high = p.id
        ) or (
          existing.member_low = p.id
          and existing.member_high = oracle_user_id
        )
      )
    order by random()
    limit 5
  loop
    if oracle_user_id < candidate.id then
      low_member := oracle_user_id;
      high_member := candidate.id;
    else
      low_member := candidate.id;
      high_member := oracle_user_id;
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
      oracle_user_id,
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
      oracle_user_id,
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
    match_reasons := '{}'::text[];
    connected_at := new_connected_at;
    return next;
  end loop;
end;
$$;

revoke all on function public.run_connection_oracle() from public;
revoke all on function public.run_connection_oracle() from anon;
grant execute on function public.run_connection_oracle() to authenticated;
