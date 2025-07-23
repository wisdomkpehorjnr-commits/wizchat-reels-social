
-- Update foreign key relationships to use profiles table instead of auth.users
-- First, we need to drop existing foreign key constraints and add new ones

-- Update stories table to reference profiles
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
ALTER TABLE public.stories ADD CONSTRAINT stories_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update room_messages table to reference profiles  
ALTER TABLE public.room_messages DROP CONSTRAINT IF EXISTS room_messages_user_id_fkey;
ALTER TABLE public.room_messages ADD CONSTRAINT room_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update room_participants table to reference profiles
ALTER TABLE public.room_participants DROP CONSTRAINT IF EXISTS room_participants_user_id_fkey;
ALTER TABLE public.room_participants ADD CONSTRAINT room_participants_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update story_views table to reference profiles
ALTER TABLE public.story_views DROP CONSTRAINT IF EXISTS story_views_user_id_fkey;
ALTER TABLE public.story_views ADD CONSTRAINT story_views_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update notifications table to reference profiles
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update hashtag_follows table to reference profiles
ALTER TABLE public.hashtag_follows DROP CONSTRAINT IF EXISTS hashtag_follows_user_id_fkey;
ALTER TABLE public.hashtag_follows ADD CONSTRAINT hashtag_follows_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update group_members table to reference profiles
ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update groups table to reference profiles
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_created_by_fkey;
ALTER TABLE public.groups ADD CONSTRAINT groups_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
