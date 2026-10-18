CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friends WHERE status = 'accepted'
    AND ((requester_id = user1_id AND addressee_id = user2_id)
      OR (requester_id = user2_id AND addressee_id = user1_id))
  );
$$;
REVOKE ALL ON FUNCTION public.are_users_friends(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_users_friends(uuid, uuid) TO authenticated, service_role;
CREATE POLICY "Chat admins can update participant roles" ON public.chat_participants
FOR UPDATE TO authenticated
USING (public.is_chat_admin(chat_id, auth.uid()))
WITH CHECK (public.is_chat_admin(chat_id, auth.uid()));
CREATE OR REPLACE FUNCTION public.delete_owned_group_chat(_chat_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chats WHERE id = _chat_id AND creator_id = auth.uid() AND is_group = true) THEN
    RAISE EXCEPTION 'Only the group owner can delete this group';
  END IF;
  DELETE FROM public.groups WHERE id = _chat_id AND created_by = auth.uid();
  DELETE FROM public.chats WHERE id = _chat_id AND creator_id = auth.uid() AND is_group = true;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_owned_group_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_owned_group_chat(uuid) TO authenticated, service_role;