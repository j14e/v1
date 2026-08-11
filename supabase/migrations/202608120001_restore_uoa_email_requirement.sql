create or replace function public.enforce_auckland_student_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) !~ '^[a-z0-9._%+\-]+@aucklanduni\.ac\.nz$' then
    raise exception 'A University of Auckland student email is required.';
  end if;
  return new;
end;
$$;

drop trigger if exists require_auckland_email on auth.users;
create trigger require_auckland_email
before insert or update of email on auth.users
for each row execute function public.enforce_auckland_student_email();
