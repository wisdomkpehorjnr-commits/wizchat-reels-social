
-- Add foreign key constraints to ensure proper relationships
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for chat participants
ALTER TABLE public.chat_participants 
DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;

ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for chats creator
ALTER TABLE public.chats 
DROP CONSTRAINT IF EXISTS chats_creator_id_fkey;

ALTER TABLE public.chats 
ADD CONSTRAINT chats_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key for comments
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for likes
ALTER TABLE public.likes 
DROP CONSTRAINT IF EXISTS likes_user_id_fkey;

ALTER TABLE public.likes 
ADD CONSTRAINT likes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for posts
ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for stories
ALTER TABLE public.stories 
DROP CONSTRAINT IF EXISTS stories_user_id_fkey;

ALTER TABLE public.stories 
ADD CONSTRAINT stories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update notification policies to allow system notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create function to create notifications
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

-- Create trigger for like notifications
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_owner_id UUID;
  liker_name TEXT;
BEGIN
  -- Get post owner and liker info
  SELECT p.user_id, pr.name 
  INTO post_owner_id, liker_name
  FROM posts p
  JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  
  -- Don't notify if user likes their own post
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

-- Create trigger for comment notifications
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_owner_id UUID;
  commenter_name TEXT;
BEGIN
  -- Get post owner and commenter info
  SELECT p.user_id, pr.name 
  INTO post_owner_id, commenter_name
  FROM posts p
  JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
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

-- Create trigger for friend request notifications
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Get requester info
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS like_notification_trigger ON likes;
DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
DROP TRIGGER IF EXISTS friend_request_notification_trigger ON friends;

-- Create triggers
CREATE TRIGGER like_notification_trigger
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

CREATE TRIGGER friend_request_notification_trigger
AFTER INSERT ON friends
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();
