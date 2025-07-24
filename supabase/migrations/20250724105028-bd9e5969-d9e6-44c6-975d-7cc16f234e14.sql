
-- Create storage buckets for different types of media
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('covers', 'covers', true),
  ('posts', 'posts', true),
  ('stories', 'stories', true),
  ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their avatar images" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their avatar images" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for covers bucket
CREATE POLICY "Cover images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "Users can upload cover images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their cover images" ON storage.objects
FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their cover images" ON storage.objects
FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for posts bucket
CREATE POLICY "Post media are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their post media" ON storage.objects
FOR UPDATE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their post media" ON storage.objects
FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for stories bucket
CREATE POLICY "Story media are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Users can upload story media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their story media" ON storage.objects
FOR UPDATE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their story media" ON storage.objects
FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for chat-media bucket
CREATE POLICY "Chat media are accessible to participants" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Users can upload chat media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their chat media" ON storage.objects
FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add group chat functionality to existing tables
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- Add role column to chat_participants for admin functionality
ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member';

-- Update chat policies to include group functionality
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

DROP POLICY IF EXISTS "Users can update chats they participate in" ON public.chats;
CREATE POLICY "Users can update chats they participate in" ON public.chats
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
    AND (chat_participants.role = 'admin' OR auth.uid() = creator_id)
  )
);

-- Add policy for viewing public groups
CREATE POLICY "Users can view public groups" ON public.chats
FOR SELECT USING (
  is_public = true OR 
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_creator_id ON public.chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_chats_invite_code ON public.chats(invite_code);
CREATE INDEX IF NOT EXISTS idx_chats_is_public ON public.chats(is_public);
CREATE INDEX IF NOT EXISTS idx_chat_participants_role ON public.chat_participants(role);
