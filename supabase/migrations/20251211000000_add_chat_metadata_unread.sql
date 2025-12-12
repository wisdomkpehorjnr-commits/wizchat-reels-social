-- Migration: add chat metadata and per-participant unread counts

-- Add columns to store last message preview and timestamp on chats table
ALTER TABLE IF EXISTS public.chats
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Add unread_count to chat_participants to track unread per user per chat
ALTER TABLE IF EXISTS public.chat_participants
  ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0 NOT NULL;

-- Function to handle message inserts: update chat summary and increment unread_count for other participants
CREATE OR REPLACE FUNCTION public.handle_message_insert()
RETURNS trigger AS $$
BEGIN
  -- Update chat last message summary
  UPDATE public.chats
  SET last_message = NEW.content,
      last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;

  -- Increment unread_count for all participants except the sender
  UPDATE public.chat_participants
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE chat_id = NEW.chat_id
    AND user_id IS NOT NULL
    AND user_id <> NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_messages_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_message_insert();

-- Function to handle message updates (recalculate unread counts and update last_message)
CREATE OR REPLACE FUNCTION public.handle_message_update()
RETURNS trigger AS $$
BEGIN
  -- Recalculate unread_count for each participant in the chat
  UPDATE public.chat_participants cp
  SET unread_count = (
    SELECT COUNT(*) FROM public.messages m
    WHERE m.chat_id = cp.chat_id
      AND m.seen = FALSE
      AND m.user_id <> cp.user_id
  )
  WHERE cp.chat_id = NEW.chat_id;

  -- Update chat last message if this updated row is the newest message
  PERFORM 1 FROM public.messages m WHERE m.chat_id = NEW.chat_id AND m.created_at > NEW.created_at LIMIT 1;
  IF NOT FOUND THEN
    UPDATE public.chats
    SET last_message = NEW.content,
        last_message_at = NEW.created_at
    WHERE id = NEW.chat_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_messages_after_update
AFTER UPDATE ON public.messages
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.handle_message_update();

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id_user_id ON public.chat_participants (chat_id, user_id);
