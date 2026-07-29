alter table public.profiles
add column if not exists frozen boolean not null default false;

create table if not exists public.admin_settings (
  id smallint primary key default 1 check (id = 1),
  owner_id uuid not null unique references public.profiles(id) on delete restrict,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon;
revoke all on public.admin_settings from authenticated;
grant all on public.admin_settings to service_role;

drop view if exists public.directory_profiles;
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
where verified = true
  and frozen = false;

grant select on public.directory_profiles to anon;
grant select on public.directory_profiles to authenticated;

drop policy if exists "Members update their own profile" on public.profiles;
create policy "Members update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id and frozen = false)
with check (auth.uid() = id and frozen = false);

drop policy if exists "Members request contacts" on public.contacts;
create policy "Members request contacts"
on public.contacts for insert
to authenticated
with check (
  auth.uid() = requester_id
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.verified = true
      and member.frozen = false
  )
);

drop policy if exists "Members accept friend requests" on public.contacts;
create policy "Members accept friend requests"
on public.contacts for update
to authenticated
using (
  auth.uid() = addressee_id
  and status = 'requested'
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.verified = true
      and member.frozen = false
  )
)
with check (
  auth.uid() = addressee_id
  and status = 'accepted'
);

drop policy if exists "Members send messages" on public.messages;
create policy "Members send messages"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
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

drop policy if exists "Members upload their avatar" on storage.objects;
create policy "Members upload their avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.frozen = false
  )
);

drop policy if exists "Members replace their avatar" on storage.objects;
create policy "Members replace their avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.frozen = false
  )
);

drop policy if exists "Members upload message media" on storage.objects;
create policy "Members upload message media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.frozen = false
  )
);
