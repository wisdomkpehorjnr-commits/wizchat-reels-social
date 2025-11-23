-- Add reply_to_id column to messages so messages can reference other messages as replies
ALTER TABLE IF EXISTS public.messages
ADD COLUMN IF NOT EXISTS reply_to_id uuid;

-- Add foreign key constraint referencing messages(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'messages' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_reply_to_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages (reply_to_id);
