
-- Fix the chat system by ensuring proper relationships and data structure
-- Add missing columns and fix foreign key relationships

-- Update chats table to ensure proper structure
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_message_id uuid;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now();

-- Update chat_participants table to ensure proper user tracking
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS last_read_at timestamp with time zone DEFAULT now();

-- Fix topic rooms to allow user participation
UPDATE topic_rooms SET participant_count = 1 WHERE participant_count = 0;

-- Enable realtime for chat tables
ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;
ALTER TABLE topic_rooms REPLICA IDENTITY FULL;
ALTER TABLE room_participants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE chats;
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE chat_participants;
ALTER publication supabase_realtime ADD TABLE topic_rooms;
ALTER publication supabase_realtime ADD TABLE room_participants;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

-- Add trigger to update last_activity on chats when new message is sent
CREATE OR REPLACE FUNCTION update_chat_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET last_activity = NEW.created_at,
      last_message_id = NEW.id
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_last_activity_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_activity();

-- Add trigger to update participant count in topic rooms
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE topic_rooms 
    SET participant_count = participant_count + 1
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE topic_rooms 
    SET participant_count = participant_count - 1
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_participant_count_trigger
  AFTER INSERT OR DELETE ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_room_participant_count();
