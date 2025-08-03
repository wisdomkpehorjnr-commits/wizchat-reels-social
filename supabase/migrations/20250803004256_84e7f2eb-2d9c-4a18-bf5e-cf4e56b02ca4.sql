-- Fix infinite recursion in chat_participants RLS policies
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;

CREATE POLICY "Users can view chat participants for their chats" 
ON chat_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp2 
    WHERE cp2.chat_id = chat_participants.chat_id 
    AND cp2.user_id = auth.uid()
  )
);

-- Fix infinite recursion in room_participants RLS policies  
DROP POLICY IF EXISTS "Participants can view room membership" ON room_participants;

CREATE POLICY "Participants can view room membership" 
ON room_participants FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id 
    AND rp2.user_id = auth.uid()
  )
);