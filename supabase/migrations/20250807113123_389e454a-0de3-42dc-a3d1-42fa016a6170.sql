-- Fix the broken RLS policy for chats SELECT
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;

-- Create correct RLS policy for viewing chats
CREATE POLICY "Users can view chats they participate in" 
ON public.chats FOR SELECT
USING (EXISTS (
  SELECT 1 FROM chat_participants 
  WHERE chat_participants.chat_id = chats.id 
  AND chat_participants.user_id = auth.uid()
));

-- Ensure chat_participants has proper RLS policies for INSERT
DROP POLICY IF EXISTS "Users can add themselves to chats" ON public.chat_participants;

CREATE POLICY "Users can add participants to chats" 
ON public.chat_participants FOR INSERT
WITH CHECK (
  -- Users can add themselves to any chat
  auth.uid() = user_id 
  OR 
  -- Chat creators can add others to their chats
  EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = chat_id 
    AND chats.creator_id = auth.uid()
  )
  OR
  -- Admins can add others to chats they admin
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND cp.user_id = auth.uid()
    AND cp.role = 'admin'
  )
);

-- Ensure we have proper function to handle chat creation with participants
CREATE OR REPLACE FUNCTION public.create_chat_with_participants(
  p_participant_ids uuid[],
  p_is_group boolean DEFAULT false,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chat_id uuid;
  participant_id uuid;
BEGIN
  -- Create the chat
  INSERT INTO public.chats (creator_id, is_group, name, description)
  VALUES (auth.uid(), p_is_group, p_name, p_description)
  RETURNING id INTO chat_id;
  
  -- Add creator as admin
  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (chat_id, auth.uid(), 'admin');
  
  -- Add other participants
  FOREACH participant_id IN ARRAY p_participant_ids
  LOOP
    -- Don't add creator again
    IF participant_id != auth.uid() THEN
      INSERT INTO public.chat_participants (chat_id, user_id, role)
      VALUES (chat_id, participant_id, 'member');
    END IF;
  END LOOP;
  
  RETURN chat_id;
END;
$$;