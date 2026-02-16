-- create_group_with_members.sql
-- Creates a group, inserts group members (including creator), and creates a chat for the group.
-- Run this in Supabase SQL editor or via psql/supabase CLI.

create or replace function public.create_group_with_members(
  p_name text,
  p_member_ids text[]
)
returns table(group_id uuid, chat_id uuid)
language plpgsql
security definer
as $$
declare
  v_group record;
  v_chat_id uuid;
  v_all_member_ids text[];
  uid text;
begin
  -- Create group row
  insert into groups (name, description, is_private, created_by, invite_code, member_count, created_at)
  values (p_name, '', false, auth.uid(), substring(md5(random()::text) from 1 for 12), coalesce(array_length(p_member_ids,1),0) + 1, now())
  returning * into v_group;

  -- Build member list (include creator)
  v_all_member_ids := array_append(p_member_ids, auth.uid());

  -- Insert members
  insert into group_members (group_id, user_id, role, joined_at)
  select v_group.id, uid::uuid, case when uid = auth.uid() then 'admin' else 'member' end, now()
  from unnest(v_all_member_ids) as uid;

  -- Try to create a chat via existing RPC if available
  begin
    -- Attempt to call create_chat_with_participants RPC if it exists
    -- The RPC in your code expects parameters like p_participant_ids, p_is_group, p_name
    perform create_chat_with_participants(p_participant_ids := v_all_member_ids, p_is_group := true, p_name := p_name);

    -- If the RPC returns something useful, try to fetch created chat id
    -- This is best-effort; if the RPC returns nothing, we'll fall back to inserting chat below
    select id into v_chat_id from chats where name = p_name and creator_id = auth.uid() order by created_at desc limit 1;
  exception when others then
    -- Ignore errors here and fallback
    v_chat_id := null;
  end;

  if v_chat_id is null then
    -- Fallback: create chat row and participants
    insert into chats (name, is_group, creator_id, created_at)
    values (p_name, true, auth.uid(), now())
    returning id into v_chat_id;

    insert into chat_participants (chat_id, user_id, role, joined_at)
    select v_chat_id, uid::uuid, case when uid = auth.uid() then 'admin' else 'member' end, now()
    from unnest(v_all_member_ids) as uid;
  end if;

  return query select v_group.id::uuid, v_chat_id::uuid;
end;
$$;
