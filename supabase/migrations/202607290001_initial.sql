create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  year_level text not null default 'Not listed',
  programme text,
  major text,
  department text,
  courses text[] not null default '{}',
  avatar_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;

drop policy if exists "Verified profiles are public" on public.profiles;
create policy "Verified profiles are public"
on public.profiles for select
using (verified = true or auth.uid() = id);

drop policy if exists "Members update their own profile" on public.profiles;
create policy "Members update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Members see their contacts" on public.contacts;
create policy "Members see their contacts"
on public.contacts for select
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Members request contacts" on public.contacts;
create policy "Members request contacts"
on public.contacts for insert
with check (auth.uid() = requester_id);

drop policy if exists "Members remove their contact requests" on public.contacts;
create policy "Members remove their contact requests"
on public.contacts for delete
using (auth.uid() = requester_id);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
  )
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'year_level', ''), 'Not listed'),
    nullif(new.raw_user_meta_data ->> 'programme', ''),
    nullif(new.raw_user_meta_data ->> 'major', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'courses', '[]'::jsonb))),
      '{}'
    ),
    new.email_confirmed_at is not null
  )
  on conflict (id) do update set
    email = excluded.email,
    verified = excluded.verified,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set verified = new.email_confirmed_at is not null,
      email = lower(new.email),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
after update of email_confirmed_at, email on auth.users
for each row execute function public.handle_user_verified();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Members upload their avatar" on storage.objects;
create policy "Members upload their avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Members replace their avatar" on storage.objects;
create policy "Members replace their avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Members delete their avatar" on storage.objects;
create policy "Members delete their avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
