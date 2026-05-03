
-- Part B: Add is_deleted flag to messages for soft delete
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted) WHERE is_deleted = true;
