-- Create or replace a helper to reliably fetch or create a direct chat between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  -- Try to find an existing direct chat (exactly 2 participants: auth.uid() and p_other_user_id)
  SELECT c.id
  INTO v_chat_id
  FROM public.chats c
  WHERE COALESCE(c.is_group, false) = false
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id AND cp.user_id = p_other_user_id
    )
    AND (
      SELECT COUNT(*) FROM public.chat_participants cp
      WHERE cp.chat_id = c.id
    ) = 2
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  -- Otherwise create a new chat using existing helper
  v_chat_id := public.create_chat_with_participants(ARRAY[p_other_user_id], false, NULL, NULL);
  RETURN v_chat_id;
END;
$$;