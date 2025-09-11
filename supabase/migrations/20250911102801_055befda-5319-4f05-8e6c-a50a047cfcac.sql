-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add messages to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;