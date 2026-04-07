CREATE TABLE IF NOT EXISTS public.message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (message_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_message_receipts_recipient_chat_read
  ON public.message_receipts(recipient_id, chat_id, read_at);

CREATE INDEX IF NOT EXISTS idx_message_receipts_recipient_chat_delivered
  ON public.message_receipts(recipient_id, chat_id, delivered_at);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_id
  ON public.message_receipts(message_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at
  ON public.messages(chat_id, created_at DESC);

ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can view message receipts" ON public.message_receipts;
CREATE POLICY "Chat participants can view message receipts"
ON public.message_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can create their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can create their own receipts"
ON public.message_receipts
FOR INSERT
WITH CHECK (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_receipts.message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can update their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can update their own receipts"
ON public.message_receipts
FOR UPDATE
USING (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_receipts.message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.set_message_receipts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_receipts_updated_at ON public.message_receipts;
CREATE TRIGGER trg_message_receipts_updated_at
BEFORE UPDATE ON public.message_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_message_receipts_updated_at();

CREATE OR REPLACE FUNCTION public.create_message_receipts_for_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_receipts (message_id, chat_id, recipient_id)
  SELECT NEW.id, NEW.chat_id, cp.user_id
  FROM public.chat_participants cp
  WHERE cp.chat_id = NEW.chat_id
    AND cp.user_id <> NEW.user_id
  ON CONFLICT (message_id, recipient_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_message_receipts ON public.messages;
CREATE TRIGGER trg_create_message_receipts
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_receipts_for_new_message();

CREATE OR REPLACE FUNCTION public.touch_chat_updated_at_from_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  v_chat_id := COALESCE(NEW.chat_id, OLD.chat_id);

  UPDATE public.chats
  SET updated_at = now()
  WHERE id = v_chat_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_chat_updated_at_on_message_insert ON public.messages;
CREATE TRIGGER trg_touch_chat_updated_at_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_updated_at_from_message();

DROP TRIGGER IF EXISTS trg_touch_chat_updated_at_on_message_delete ON public.messages;
CREATE TRIGGER trg_touch_chat_updated_at_on_message_delete
AFTER DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_updated_at_from_message();

CREATE OR REPLACE FUNCTION public.mark_chat_messages_delivered(_chat_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this chat';
  END IF;

  WITH updated AS (
    UPDATE public.message_receipts mr
    SET delivered_at = COALESCE(mr.delivered_at, now()),
        updated_at = now()
    FROM public.messages m
    WHERE mr.message_id = m.id
      AND mr.chat_id = _chat_id
      AND mr.recipient_id = auth.uid()
      AND m.user_id <> auth.uid()
      AND mr.delivered_at IS NULL
    RETURNING mr.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_messages_read(_chat_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this chat';
  END IF;

  WITH updated AS (
    UPDATE public.message_receipts mr
    SET delivered_at = COALESCE(mr.delivered_at, now()),
        read_at = COALESCE(mr.read_at, now()),
        updated_at = now()
    FROM public.messages m
    WHERE mr.message_id = m.id
      AND mr.chat_id = _chat_id
      AND mr.recipient_id = auth.uid()
      AND m.user_id <> auth.uid()
      AND mr.read_at IS NULL
    RETURNING mr.message_id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  UPDATE public.messages m
  SET seen = true
  WHERE m.chat_id = _chat_id
    AND m.user_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.message_receipts mr
      WHERE mr.message_id = m.id
        AND mr.recipient_id = auth.uid()
        AND mr.read_at IS NOT NULL
    );

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_chat_summaries()
RETURNS TABLE (
  chat_id UUID,
  is_group BOOLEAN,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  creator_id UUID,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  member_count INTEGER,
  is_public BOOLEAN,
  invite_code TEXT,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_type TEXT,
  last_message_media_url TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  last_message_user_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_chats AS (
    SELECT c.*
    FROM public.chats c
    JOIN public.chat_participants cp
      ON cp.chat_id = c.id
     AND cp.user_id = auth.uid()
  )
  SELECT
    c.id AS chat_id,
    COALESCE(c.is_group, false) AS is_group,
    c.name,
    c.description,
    c.avatar_url,
    c.creator_id,
    c.updated_at,
    c.created_at,
    c.member_count,
    c.is_public,
    c.invite_code,
    lm.id AS last_message_id,
    lm.content AS last_message_content,
    lm.type AS last_message_type,
    lm.media_url AS last_message_media_url,
    lm.created_at AS last_message_created_at,
    lm.user_id AS last_message_user_id,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM my_chats c
  LEFT JOIN LATERAL (
    SELECT m.id, m.content, m.type, m.media_url, m.created_at, m.user_id
    FROM public.messages m
    WHERE m.chat_id = c.id
    ORDER BY m.created_at DESC NULLS LAST
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count
    FROM public.message_receipts mr
    WHERE mr.chat_id = c.id
      AND mr.recipient_id = auth.uid()
      AND mr.read_at IS NULL
  ) uc ON true
  ORDER BY COALESCE(lm.created_at, c.updated_at, c.created_at) DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.mark_chat_messages_delivered(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_messages_delivered(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_chat_messages_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_messages_read(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_chat_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_summaries() TO authenticated;

INSERT INTO public.message_receipts (
  message_id,
  chat_id,
  recipient_id,
  delivered_at,
  read_at,
  created_at,
  updated_at
)
SELECT
  m.id,
  m.chat_id,
  cp.user_id,
  COALESCE(m.created_at, now()),
  CASE WHEN COALESCE(m.seen, false) THEN COALESCE(m.created_at, now()) ELSE NULL END,
  COALESCE(m.created_at, now()),
  now()
FROM public.messages m
JOIN public.chat_participants cp
  ON cp.chat_id = m.chat_id
 AND cp.user_id <> m.user_id
ON CONFLICT (message_id, recipient_id) DO NOTHING;