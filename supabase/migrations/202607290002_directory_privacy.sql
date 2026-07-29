drop view if exists public.directory_profiles;

revoke select on public.profiles from anon;
grant select on public.profiles to authenticated;
grant select on public.profiles to service_role;

drop policy if exists "Verified profiles are public" on public.profiles;
drop policy if exists "Verified profiles are visible to members" on public.profiles;
create policy "Verified profiles are visible to members"
on public.profiles for select
to authenticated
using (verified = true or auth.uid() = id);

create view public.directory_profiles
with (security_barrier = true)
as
select
  id,
  display_name,
  year_level,
  programme,
  major,
  department,
  courses,
  avatar_url,
  verified,
  created_at
from public.profiles
where verified = true;

grant select on public.directory_profiles to anon;
grant select on public.directory_profiles to authenticated;
