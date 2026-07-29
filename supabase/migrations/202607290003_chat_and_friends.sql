create unique index if not exists contacts_unique_member_pair
on public.contacts (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

drop policy if exists "Members accept friend requests" on public.contacts;
create policy "Members accept friend requests"
on public.contacts for update
to authenticated
using (
  auth.uid() = addressee_id
  and status = 'requested'
)
with check (
  auth.uid() = addressee_id
  and status = 'accepted'
);

drop policy if exists "Members remove their contact requests" on public.contacts;
drop policy if exists "Members remove friendships" on public.contacts;
create policy "Members remove friendships"
on public.contacts for delete
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant select, insert, delete on public.contacts to authenticated;
grant update (status) on public.contacts to authenticated;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_type text check (media_type in ('image', 'audio')),
  media_path text,
  duration_seconds integer check (
    duration_seconds is null
    or duration_seconds between 0 and 600
  ),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id),
  check (
    nullif(btrim(body), '') is not null
    or media_path is not null
  ),
  check (body is null or char_length(body) <= 4000),
  check (
    (media_type is null and media_path is null)
    or (media_type is not null and media_path is not null)
  ),
  check (
    media_path is null
    or media_path like
      sender_id::text || '/' || recipient_id::text || '/%'
  )
);

create index if not exists messages_sender_created_idx
on public.messages (sender_id, created_at desc);

create index if not exists messages_recipient_created_idx
on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "Members read their messages" on public.messages;
create policy "Members read their messages"
on public.messages for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

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
  )
  and exists (
    select 1
    from public.profiles recipient
    where recipient.id = recipient_id
      and recipient.verified = true
  )
);

drop policy if exists "Recipients mark messages read" on public.messages;
create policy "Recipients mark messages read"
on public.messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

revoke all on public.messages from anon;
revoke update on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'message-media',
  'message-media',
  false,
  12582912,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Message participants read media" on storage.objects;
create policy "Message participants read media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-media'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or auth.uid()::text = (storage.foldername(name))[2]
  )
);

drop policy if exists "Members upload message media" on storage.objects;
create policy "Members upload message media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Members delete sent message media" on storage.objects;
create policy "Members delete sent message media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'message-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
