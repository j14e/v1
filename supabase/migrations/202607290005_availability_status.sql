alter table public.profiles
add column if not exists availability_status text not null default 'open_to_talk';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_availability_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_availability_status_check
    check (availability_status in ('open_to_talk', 'busy'));
  end if;
end
$$;

drop view if exists public.directory_profiles;
create view public.directory_profiles
with (security_barrier = true)
as
select
  id,
  display_name,
  availability_status,
  year_level,
  programme,
  major,
  department,
  courses,
  avatar_url,
  verified,
  created_at
from public.profiles
where verified = true
  and frozen = false;

grant select on public.directory_profiles to anon;
grant select on public.directory_profiles to authenticated;
