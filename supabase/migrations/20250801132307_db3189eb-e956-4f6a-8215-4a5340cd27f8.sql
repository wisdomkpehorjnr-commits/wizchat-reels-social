-- Fix the infinite recursion in chat_participants RLS policy
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;

CREATE POLICY "Users can view chat participants for their chats" 
ON chat_participants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM chat_participants cp2 
  WHERE cp2.chat_id = chat_participants.chat_id 
  AND cp2.user_id = auth.uid()
));