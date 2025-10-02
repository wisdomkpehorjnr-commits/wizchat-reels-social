-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions in their chats
CREATE POLICY "Users can view reactions in their chats"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can add reactions to messages in their chats
CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Add pinned_messages table for pinning functionality
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, message_id)
);

-- Enable RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Users can view pinned messages in their chats
CREATE POLICY "Users can view pinned messages"
ON public.pinned_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = pinned_messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

-- Users can pin messages in their chats
CREATE POLICY "Users can pin messages"
ON public.pinned_messages
FOR INSERT
WITH CHECK (
  auth.uid() = pinned_by AND
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = pinned_messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

-- Users can unpin messages
CREATE POLICY "Users can unpin messages"
ON public.pinned_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = pinned_messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

-- Add index
CREATE INDEX idx_pinned_messages_chat_id ON public.pinned_messages(chat_id);