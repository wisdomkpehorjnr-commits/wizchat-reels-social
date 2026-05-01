-- Fix chat participant policy recursion by moving membership checks into SECURITY DEFINER helpers
CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin(_chat_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = _user_id
      AND cp.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated;

-- Replace recursive chat_participants policies
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;
CREATE POLICY "Users can view chat participants for their chats"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can add participants to chats" ON public.chat_participants;
CREATE POLICY "Users can add participants to chats"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.chats c
    WHERE c.id = chat_id
      AND c.creator_id = auth.uid()
  )
  OR public.is_chat_admin(chat_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can remove themselves from chats" ON public.chat_participants;
CREATE POLICY "Users can remove themselves from chats"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_chat_admin(chat_id, auth.uid()));

-- Replace chat policies that indirectly depended on recursive participant checks
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Users can view chats they participate in"
ON public.chats
FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.is_chat_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Users can view public groups" ON public.chats;
CREATE POLICY "Users can view public groups"
ON public.chats
FOR SELECT
TO authenticated
USING (COALESCE(is_public, false) = true OR public.is_chat_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update chats they participate in" ON public.chats;
CREATE POLICY "Users can update chats they participate in"
ON public.chats
FOR UPDATE
TO authenticated
USING (public.is_chat_admin(id, auth.uid()) OR creator_id = auth.uid())
WITH CHECK (public.is_chat_admin(id, auth.uid()) OR creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

-- Replace message policies with non-recursive helpers
DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.messages;
CREATE POLICY "Users can view messages from their chats"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create messages in their chats" ON public.messages;
CREATE POLICY "Users can create messages in their chats"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

-- Replace receipt policies with non-recursive helpers
DROP POLICY IF EXISTS "Chat participants can view message receipts" ON public.message_receipts;
CREATE POLICY "Chat participants can view message receipts"
ON public.message_receipts
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Recipients can create their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can create their own receipts"
ON public.message_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = recipient_id
  AND public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can update their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can update their own receipts"
ON public.message_receipts
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id AND public.is_chat_participant(chat_id, auth.uid()))
WITH CHECK (
  auth.uid() = recipient_id
  AND public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

-- Helpful indexes for chat membership, message loading, receipts, and inbox summaries
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_user ON public.chat_participants(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_chat ON public.chat_participants(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON public.messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_chat ON public.messages(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_chat_recipient_read ON public.message_receipts(chat_id, recipient_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_receipts_message_recipient_unique ON public.message_receipts(message_id, recipient_id);

-- Restore/ensure triggers required by realtime inbox sorting and receipt creation
DROP TRIGGER IF EXISTS trg_create_message_receipts ON public.messages;
CREATE TRIGGER trg_create_message_receipts
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_receipts_for_new_message();

DROP TRIGGER IF EXISTS trg_touch_chat_updated_at ON public.messages;
CREATE TRIGGER trg_touch_chat_updated_at
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_updated_at_from_message();

DROP TRIGGER IF EXISTS trg_message_receipts_updated_at ON public.message_receipts;
CREATE TRIGGER trg_message_receipts_updated_at
BEFORE UPDATE ON public.message_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_message_receipts_updated_at();

-- Backfill any missing receipt rows for existing message history
INSERT INTO public.message_receipts (message_id, chat_id, recipient_id, delivered_at, read_at)
SELECT
  m.id,
  m.chat_id,
  cp.user_id,
  CASE WHEN COALESCE(m.seen, false) THEN m.created_at ELSE NULL END,
  CASE WHEN COALESCE(m.seen, false) THEN m.created_at ELSE NULL END
FROM public.messages m
JOIN public.chat_participants cp
  ON cp.chat_id = m.chat_id
 AND cp.user_id <> m.user_id
ON CONFLICT (message_id, recipient_id) DO NOTHING;