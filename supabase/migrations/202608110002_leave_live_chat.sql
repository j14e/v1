create or replace function public.leave_live_session()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to leave a live chat.'; end if;

  select member.session_id into current_session_id
  from public.live_session_members member
  join public.live_sessions session on session.id = member.session_id
  join public.live_session_members peer on peer.session_id = member.session_id
    and peer.member_id <> member.member_id
  where member.member_id = auth.uid()
  order by session.created_at desc
  limit 1;

  if current_session_id is not null then
    delete from public.live_session_members
    where session_id = current_session_id and member_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.leave_live_session() from public;
revoke all on function public.leave_live_session() from anon;
grant execute on function public.leave_live_session() to authenticated;
