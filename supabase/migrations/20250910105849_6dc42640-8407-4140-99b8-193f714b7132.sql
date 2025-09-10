-- Fix infinite recursion issue in chat_participants policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can view chat participants for their chats" 
ON public.chat_participants 
FOR SELECT 
USING (user_id = auth.uid());

-- Also improve the chats table policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;

-- Create a more efficient policy for viewing chats
CREATE POLICY "Users can view chats they participate in" 
ON public.chats 
FOR SELECT 
USING (creator_id = auth.uid() OR id IN (
  SELECT DISTINCT chat_id 
  FROM public.chat_participants 
  WHERE user_id = auth.uid()
));