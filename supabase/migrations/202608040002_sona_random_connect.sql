create or replace function public.connect_random_member()
returns table (
  matched_id uuid,
  display_name text,
  year_level text,
  programme text,
  major text,
  department text,
  courses text[],
  avatar_url text,
  connected_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_member public.profiles%rowtype;
  matched_member public.profiles%rowtype;
  connection_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Sign in to connect.';
  end if;

  select * into current_member
  from public.profiles
  where id = auth.uid()
    and verified = true
    and frozen = false;

  if not found then
    raise exception 'A verified, active SONA profile is required.';
  end if;

  select * into matched_member
  from public.profiles
  where id <> current_member.id
    and verified = true
    and frozen = false
  order by random()
  limit 1;

  if not found then
    return;
  end if;

  insert into public.messages (
    sender_id,
    recipient_id,
    body,
    message_type,
    created_at
  ) values (
    current_member.id,
    matched_member.id,
    'connected',
    'connection',
    connection_time
  );

  return query select
    matched_member.id,
    matched_member.display_name,
    matched_member.year_level,
    matched_member.programme,
    matched_member.major,
    matched_member.department,
    matched_member.courses,
    matched_member.avatar_url,
    connection_time;
end;
$$;

revoke all on function public.connect_random_member() from public;
revoke all on function public.connect_random_member() from anon;
grant execute on function public.connect_random_member() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  signup_year text := btrim(coalesce(new.raw_user_meta_data ->> 'year_level', ''));
  signup_courses text[];
begin
  select coalesce(
    array_agg(upper(regexp_replace(course, '\s+', '', 'g'))),
    '{}'::text[]
  ) into signup_courses
  from jsonb_array_elements_text(
    coalesce(new.raw_user_meta_data -> 'courses', '[]'::jsonb)
  ) as course;

  if char_length(signup_name) < 2 or char_length(signup_name) > 80 then
    raise exception 'A name between 2 and 80 characters is required.';
  end if;

  if signup_year not in (
    'First year',
    'Second year',
    'Third year',
    'Fourth year',
    'Fifth year or above'
  ) then
    raise exception 'A valid year is required.';
  end if;

  if cardinality(signup_courses) = 0 or exists (
    select 1
    from unnest(signup_courses) as course_code
    where course_code !~ '^[A-Z]{2,10}[0-9]{3}[A-Z]?$'
  ) then
    raise exception 'Use course codes like DES100 or COMPSCI130.';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    year_level,
    programme,
    major,
    department,
    courses,
    verified
  ) values (
    new.id,
    lower(new.email),
    signup_name,
    signup_year,
    nullif(new.raw_user_meta_data ->> 'programme', ''),
    nullif(new.raw_user_meta_data ->> 'major', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    signup_courses,
    new.email_confirmed_at is not null
  )
  on conflict (id) do update set
    email = excluded.email,
    verified = excluded.verified,
    updated_at = now();
  return new;
end;
$$;
