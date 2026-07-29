alter table public.profiles
add column if not exists is_demo boolean not null default false;

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
  is_demo,
  created_at
from public.profiles
where verified = true
  and frozen = false;

grant select on public.directory_profiles to anon;
grant select on public.directory_profiles to authenticated;

create table if not exists public.banner_submissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ),
  created_at timestamptz not null default now()
);

create index if not exists banner_submissions_created_idx
on public.banner_submissions (created_at desc);

alter table public.banner_submissions enable row level security;

drop policy if exists "Showcase submissions are public"
on public.banner_submissions;
create policy "Showcase submissions are public"
on public.banner_submissions for select
using (true);

drop policy if exists "Verified members submit showcase files"
on public.banner_submissions;
create policy "Verified members submit showcase files"
on public.banner_submissions for insert
to authenticated
with check (
  auth.uid() = member_id
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.verified = true
      and member.frozen = false
      and member.is_demo = false
  )
);

drop policy if exists "Members remove their showcase files"
on public.banner_submissions;
create policy "Members remove their showcase files"
on public.banner_submissions for delete
to authenticated
using (auth.uid() = member_id);

grant select on public.banner_submissions to anon;
grant select, insert, delete on public.banner_submissions to authenticated;
grant all on public.banner_submissions to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'directory-banners',
  'directory-banners',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Directory banners are public" on storage.objects;
create policy "Directory banners are public"
on storage.objects for select
using (bucket_id = 'directory-banners');

drop policy if exists "Verified members upload directory banners"
on storage.objects;
create policy "Verified members upload directory banners"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'directory-banners'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1
    from public.profiles member
    where member.id = auth.uid()
      and member.verified = true
      and member.frozen = false
      and member.is_demo = false
  )
);

drop policy if exists "Members remove their directory banners"
on storage.objects;
create policy "Members remove their directory banners"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'directory-banners'
  and auth.uid()::text = (storage.foldername(name))[1]
);
