DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
CREATE POLICY "Authenticated users can upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can upload posts" ON storage.objects;
CREATE POLICY "Authenticated users can upload posts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
CREATE POLICY "Authenticated users can upload stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files" ON storage.objects FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
CREATE POLICY "Users can view follows" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their saved posts" ON public.saved_posts;
CREATE POLICY "Users can view their saved posts" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;
CREATE POLICY "Users can unsave posts" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'calling',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0
);

ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their calls" ON public.voice_calls;
CREATE POLICY "Users can view their calls" ON public.voice_calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can create calls" ON public.voice_calls;
CREATE POLICY "Users can create calls" ON public.voice_calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
DROP POLICY IF EXISTS "Users can update their calls" ON public.voice_calls;
CREATE POLICY "Users can update their calls" ON public.voice_calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    UPDATE public.profiles 
    SET follower_count = follower_count + 1 
    WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET following_count = following_count - 1 
    WHERE id = OLD.follower_id;
    UPDATE public.profiles 
    SET follower_count = follower_count - 1 
    WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follower_counts ON public.follows;
CREATE TRIGGER trigger_update_follower_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.follows REPLICA IDENTITY FULL;
ALTER TABLE public.saved_posts REPLICA IDENTITY FULL;
ALTER TABLE public.voice_calls REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.stories REPLICA IDENTITY FULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follows; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_posts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stories; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON public.saved_posts(post_id);
CREATE INDEX idx_voice_calls_caller_id ON public.voice_calls(caller_id);
CREATE INDEX idx_voice_calls_receiver_id ON public.voice_calls(receiver_id);
CREATE INDEX idx_voice_calls_status ON public.voice_calls(status);

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload avatar images" ON storage.objects;
CREATE POLICY "Users can upload avatar images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update their avatar images" ON storage.objects;
CREATE POLICY "Users can update their avatar images" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their avatar images" ON storage.objects;
CREATE POLICY "Users can delete their avatar images" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
CREATE POLICY "Cover images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'covers');
DROP POLICY IF EXISTS "Users can upload cover images" ON storage.objects;
CREATE POLICY "Users can upload cover images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update their cover images" ON storage.objects;
CREATE POLICY "Users can update their cover images" ON storage.objects
FOR UPDATE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their cover images" ON storage.objects;
CREATE POLICY "Users can delete their cover images" ON storage.objects
FOR DELETE USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Post media are publicly accessible" ON storage.objects;
CREATE POLICY "Post media are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'posts');
DROP POLICY IF EXISTS "Users can upload post media" ON storage.objects;
CREATE POLICY "Users can upload post media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update their post media" ON storage.objects;
CREATE POLICY "Users can update their post media" ON storage.objects
FOR UPDATE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their post media" ON storage.objects;
CREATE POLICY "Users can delete their post media" ON storage.objects
FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Story media are publicly accessible" ON storage.objects;
CREATE POLICY "Story media are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'stories');
DROP POLICY IF EXISTS "Users can upload story media" ON storage.objects;
CREATE POLICY "Users can upload story media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update their story media" ON storage.objects;
CREATE POLICY "Users can update their story media" ON storage.objects
FOR UPDATE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their story media" ON storage.objects;
CREATE POLICY "Users can delete their story media" ON storage.objects
FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Chat media are accessible to participants" ON storage.objects;
CREATE POLICY "Chat media are accessible to participants" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete their chat media" ON storage.objects;
CREATE POLICY "Users can delete their chat media" ON storage.objects
FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member';

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

DROP POLICY IF EXISTS "Users can view public groups" ON public.chats;
CREATE POLICY "Users can view public groups" ON public.chats
FOR SELECT USING (
  is_public = true OR 
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = chats.id 
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_chats_creator_id ON public.chats(creator_id);
CREATE INDEX IF NOT EXISTS idx_chats_invite_code ON public.chats(invite_code);
CREATE INDEX IF NOT EXISTS idx_chats_is_public ON public.chats(is_public);
CREATE INDEX IF NOT EXISTS idx_chat_participants_role ON public.chat_participants(role);

CREATE TABLE public.room_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES topic_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  media_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room participants can view posts" ON public.room_posts;
CREATE POLICY "Room participants can view posts" ON public.room_posts 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = room_posts.room_id 
    AND room_participants.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Room participants can create posts" ON public.room_posts;
CREATE POLICY "Room participants can create posts" ON public.room_posts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = room_posts.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own room posts" ON public.room_posts;
CREATE POLICY "Users can update their own room posts" ON public.room_posts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own room posts" ON public.room_posts;
CREATE POLICY "Users can delete their own room posts" ON public.room_posts 
  FOR DELETE 
  USING (auth.uid() = user_id);

ALTER TABLE public.room_posts REPLICA IDENTITY FULL;

ALTER TABLE public.room_posts 
DROP CONSTRAINT IF EXISTS room_posts_user_id_fkey1;
ALTER TABLE public.room_posts 
DROP CONSTRAINT IF EXISTS room_posts_user_id_fkey;
ALTER TABLE public.room_posts 
ADD CONSTRAINT room_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE public.messages 
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_participants 
DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chats 
DROP CONSTRAINT IF EXISTS chats_creator_id_fkey;
ALTER TABLE public.chats 
ADD CONSTRAINT chats_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments 
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.likes 
DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE public.likes 
ADD CONSTRAINT likes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.stories 
DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
ALTER TABLE public.stories 
ADD CONSTRAINT stories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_owner_id UUID;
  liker_name TEXT;
BEGIN
  SELECT p.user_id, pr.name 
  INTO post_owner_id, liker_name
  FROM posts p
  JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      post_owner_id,
      'like',
      'New Like',
      liker_name || ' liked your post',
      jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_owner_id UUID;
  commenter_name TEXT;
BEGIN
  SELECT p.user_id, pr.name 
  INTO post_owner_id, commenter_name
  FROM posts p
  JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      post_owner_id,
      'comment',
      'New Comment',
      commenter_name || ' commented on your post',
      jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  SELECT name INTO requester_name
  FROM profiles
  WHERE id = NEW.requester_id;
  PERFORM create_notification(
    NEW.addressee_id,
    'friend_request',
    'New Friend Request',
    requester_name || ' sent you a friend request',
    jsonb_build_object('friend_id', NEW.id, 'user_id', NEW.requester_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS like_notification_trigger ON likes;
CREATE TRIGGER like_notification_trigger
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

DROP TRIGGER IF EXISTS friend_request_notification_trigger ON friends;
CREATE TRIGGER friend_request_notification_trigger
AFTER INSERT ON friends
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();

ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_message_id uuid;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now();
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS last_read_at timestamp with time zone DEFAULT now();

UPDATE topic_rooms SET participant_count = 1 WHERE participant_count = 0;

ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;
ALTER TABLE topic_rooms REPLICA IDENTITY FULL;
ALTER TABLE room_participants REPLICA IDENTITY FULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE chats; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE topic_rooms; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE room_participants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

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

DROP TRIGGER IF EXISTS update_chat_last_activity_trigger ON messages;
CREATE TRIGGER update_chat_last_activity_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_activity();

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

DROP TRIGGER IF EXISTS update_room_participant_count_trigger ON room_participants;
CREATE TRIGGER update_room_participant_count_trigger
  AFTER INSERT OR DELETE ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_room_participant_count();

DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;
CREATE POLICY "Users can view chat participants for their chats" ON chat_participants 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Users can view chats they participate in" ON public.chats 
FOR SELECT 
USING (creator_id = auth.uid() OR id IN (
  SELECT DISTINCT chat_id 
  FROM public.chat_participants 
  WHERE user_id = auth.uid()
));

ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  SELECT c.id
  INTO v_chat_id
  FROM public.chats c
  WHERE COALESCE(c.is_group, false) = false
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = c.id AND cp.user_id = p_other_user_id
    )
    AND (
      SELECT COUNT(*) FROM public.chat_participants cp
      WHERE cp.chat_id = c.id
    ) = 2
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  v_chat_id := public.create_chat_with_participants(ARRAY[p_other_user_id], false, NULL, NULL);
  RETURN v_chat_id;
END;
$$;