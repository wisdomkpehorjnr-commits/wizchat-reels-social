CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_reel BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.chat_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video')),
  media_url TEXT,
  seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all posts" ON public.posts;
CREATE POLICY "Users can view all posts" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
CREATE POLICY "Users can view all likes" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create likes" ON public.likes;
CREATE POLICY "Users can create likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own likes" ON public.likes;
CREATE POLICY "Users can delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
CREATE POLICY "Users can view all comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Users can view chats they participate in" ON public.chats FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = id AND user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update chats they participate in" ON public.chats;
CREATE POLICY "Users can update chats they participate in" ON public.chats FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;
CREATE POLICY "Users can view chat participants for their chats" ON public.chat_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.chat_id = chat_id AND cp.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can add themselves to chats" ON public.chat_participants;
CREATE POLICY "Users can add themselves to chats" ON public.chat_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove themselves from chats" ON public.chat_participants;
CREATE POLICY "Users can remove themselves from chats" ON public.chat_participants FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.messages;
CREATE POLICY "Users can view messages from their chats" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can create messages in their chats" ON public.messages;
CREATE POLICY "Users can create messages in their chats" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_likes_post_id ON public.likes(post_id);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);

CREATE TABLE public.friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE public.reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id, emoji)
);

CREATE TABLE public.custom_emojis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS duration INTEGER;

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('text', 'image', 'video')) DEFAULT 'text';

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view friend requests involving them" ON public.friends;
CREATE POLICY "Users can view friend requests involving them" ON public.friends 
FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
CREATE POLICY "Users can send friend requests" ON public.friends 
FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can update friend requests they're involved in" ON public.friends;
CREATE POLICY "Users can update friend requests they're involved in" ON public.friends 
FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own friend requests" ON public.friends;
CREATE POLICY "Users can delete their own friend requests" ON public.friends 
FOR DELETE USING (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can view all reactions" ON public.reactions;
CREATE POLICY "Users can view all reactions" ON public.reactions 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own reactions" ON public.reactions;
CREATE POLICY "Users can create their own reactions" ON public.reactions 
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;
CREATE POLICY "Users can delete their own reactions" ON public.reactions 
FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view public emojis" ON public.custom_emojis;
CREATE POLICY "Users can view public emojis" ON public.custom_emojis 
FOR SELECT USING (is_public = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create emojis" ON public.custom_emojis;
CREATE POLICY "Users can create emojis" ON public.custom_emojis 
FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own emojis" ON public.custom_emojis;
CREATE POLICY "Users can update their own emojis" ON public.custom_emojis 
FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own emojis" ON public.custom_emojis;
CREATE POLICY "Users can delete their own emojis" ON public.custom_emojis 
FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings" ON public.site_settings 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;
CREATE POLICY "Authenticated users can update site settings" ON public.site_settings 
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_friends_requester_id ON public.friends(requester_id);
CREATE INDEX idx_friends_addressee_id ON public.friends(addressee_id);
CREATE INDEX idx_friends_status ON public.friends(status);
CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX idx_reactions_emoji ON public.reactions(emoji);
CREATE INDEX idx_custom_emojis_public ON public.custom_emojis(is_public);
CREATE INDEX idx_posts_media_type ON public.posts(media_type);

INSERT INTO public.site_settings (setting_key, setting_value) 
VALUES ('site_logo', '/lovable-uploads/15358747-e2da-431c-a6b1-721eb6914fc8.png')
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.search_users(search_term TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  email TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.name,
    p.email,
    p.avatar,
    p.created_at
  FROM public.profiles p
  WHERE 
    p.username ILIKE '%' || search_term || '%' OR
    p.name ILIKE '%' || search_term || '%' OR
    p.email ILIKE '%' || search_term || '%'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE public.hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.hashtag_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, hashtag_id)
);

CREATE TABLE public.post_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.topic_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.topic_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.topic_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.music_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  duration INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  is_royalty_free BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image',
  viewer_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ADD COLUMN music_id UUID REFERENCES public.music_library(id);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hashtags" ON public.hashtags;
CREATE POLICY "Anyone can view hashtags" ON public.hashtags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create hashtags" ON public.hashtags;
CREATE POLICY "Authenticated users can create hashtags" ON public.hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage their hashtag follows" ON public.hashtag_follows;
CREATE POLICY "Users can manage their hashtag follows" ON public.hashtag_follows FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view post hashtags" ON public.post_hashtags;
CREATE POLICY "Anyone can view post hashtags" ON public.post_hashtags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Post owners can manage hashtags" ON public.post_hashtags;
CREATE POLICY "Post owners can manage hashtags" ON public.post_hashtags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view public groups" ON public.groups;
CREATE POLICY "Anyone can view public groups" ON public.groups FOR SELECT USING (NOT is_private OR EXISTS (
  SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()
));
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Group creators can update groups" ON public.groups;
CREATE POLICY "Group creators can update groups" ON public.groups FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;
CREATE POLICY "Group members can view membership" ON public.group_members FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active topic rooms" ON public.topic_rooms;
CREATE POLICY "Anyone can view active topic rooms" ON public.topic_rooms FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.topic_rooms;
CREATE POLICY "Authenticated users can create rooms" ON public.topic_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Participants can view room membership" ON public.room_participants;
CREATE POLICY "Participants can view room membership" ON public.room_participants FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.room_participants rp WHERE rp.room_id = room_id AND rp.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;
CREATE POLICY "Users can join rooms" ON public.room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;
CREATE POLICY "Users can leave rooms" ON public.room_participants FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Room participants can view messages" ON public.room_messages;
CREATE POLICY "Room participants can view messages" ON public.room_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_participants WHERE room_id = room_messages.room_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Room participants can send messages" ON public.room_messages;
CREATE POLICY "Room participants can send messages" ON public.room_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.room_participants WHERE room_id = room_messages.room_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view music library" ON public.music_library;
CREATE POLICY "Anyone can view music library" ON public.music_library FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can add music" ON public.music_library;
CREATE POLICY "Authenticated users can add music" ON public.music_library FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view non-expired stories" ON public.stories;
CREATE POLICY "Anyone can view non-expired stories" ON public.stories FOR SELECT USING (expires_at > now());
DROP POLICY IF EXISTS "Users can create their own stories" ON public.stories;
CREATE POLICY "Users can create their own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own stories" ON public.stories;
CREATE POLICY "Users can update their own stories" ON public.stories FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Story owners can view story views" ON public.story_views;
CREATE POLICY "Story owners can view story views" ON public.story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE stories.id = story_id AND stories.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can track their story views" ON public.story_views;
CREATE POLICY "Users can track their story views" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hashtags; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.hashtag_follows; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_hashtags; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.groups; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_rooms; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.stories; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.hashtags REPLICA IDENTITY FULL;
ALTER TABLE public.hashtag_follows REPLICA IDENTITY FULL;
ALTER TABLE public.post_hashtags REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.topic_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_participants REPLICA IDENTITY FULL;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.stories REPLICA IDENTITY FULL;
ALTER TABLE public.story_views REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.extract_and_create_hashtags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hashtag_match TEXT;
  hashtag_name TEXT;
  hashtag_record RECORD;
BEGIN
  FOR hashtag_match IN 
    SELECT DISTINCT regexp_matches(NEW.content, '#([a-zA-Z0-9_]+)', 'g') AS match
  LOOP
    hashtag_name := lower(hashtag_match);
    INSERT INTO public.hashtags (name, post_count)
    VALUES (hashtag_name, 1)
    ON CONFLICT (name) 
    DO UPDATE SET 
      post_count = hashtags.post_count + 1,
      updated_at = now();
    SELECT * INTO hashtag_record FROM public.hashtags WHERE name = hashtag_name;
    INSERT INTO public.post_hashtags (post_id, hashtag_id)
    VALUES (NEW.id, hashtag_record.id)
    ON CONFLICT (post_id, hashtag_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS extract_hashtags_trigger ON public.posts;
CREATE TRIGGER extract_hashtags_trigger
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.extract_and_create_hashtags();

INSERT INTO public.music_library (title, artist, duration, file_url, is_royalty_free) VALUES
('Happy Upbeat', 'Free Music', 120, '/sample-music/happy-upbeat.mp3', true),
('Chill Vibes', 'Free Music', 180, '/sample-music/chill-vibes.mp3', true),
('Energy Boost', 'Free Music', 150, '/sample-music/energy-boost.mp3', true);

INSERT INTO public.topic_rooms (name, description) VALUES
('Football Today', 'Discuss the latest football news and matches'),
('Gossip Lounge', 'Share the latest gossip and trending topics'),
('Reel Review Zone', 'Review and discuss the hottest reels'),
('Tech Talk', 'Discuss technology, gadgets and innovations'),
('Music Corner', 'Share and discover new music');

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
ALTER TABLE public.stories ADD CONSTRAINT stories_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.room_messages DROP CONSTRAINT IF EXISTS room_messages_user_id_fkey;
ALTER TABLE public.room_messages ADD CONSTRAINT room_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.room_participants DROP CONSTRAINT IF EXISTS room_participants_user_id_fkey;
ALTER TABLE public.room_participants ADD CONSTRAINT room_participants_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.story_views DROP CONSTRAINT IF EXISTS story_views_user_id_fkey;
ALTER TABLE public.story_views ADD CONSTRAINT story_views_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.hashtag_follows DROP CONSTRAINT IF EXISTS hashtag_follows_user_id_fkey;
ALTER TABLE public.hashtag_follows ADD CONSTRAINT hashtag_follows_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_created_by_fkey;
ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;