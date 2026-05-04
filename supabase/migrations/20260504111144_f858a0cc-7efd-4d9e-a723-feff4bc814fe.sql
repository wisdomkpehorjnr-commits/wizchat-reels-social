
-- 1. Fix notifications INSERT: restrict to authenticated users only (not anon with true)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix site_settings: remove overly permissive ALL policy, keep read-only for everyone
DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;
-- Site settings should only be modifiable via service role / admin. No public write policy.

-- 3. Fix chat-media storage: restrict SELECT to authenticated users only (not public/anon)
DROP POLICY IF EXISTS "Chat media are accessible to participants" ON storage.objects;
CREATE POLICY "Chat media are accessible to participants" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

-- 4. Remove anonymous upload policy on room-media bucket
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1w9dbhu_0" ON storage.objects;

-- 5. Fix function search_path on functions missing it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  liker_name TEXT;
BEGIN
  SELECT p.user_id, pr.name INTO post_owner_id, liker_name
  FROM posts p JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(post_owner_id, 'like', 'New Like', liker_name || ' liked your post', jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  commenter_name TEXT;
BEGIN
  SELECT p.user_id, pr.name INTO post_owner_id, commenter_name
  FROM posts p JOIN profiles pr ON pr.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  IF post_owner_id != NEW.user_id THEN
    PERFORM create_notification(post_owner_id, 'comment', 'New Comment', commenter_name || ' commented on your post', jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  SELECT name INTO requester_name FROM profiles WHERE id = NEW.requester_id;
  PERFORM create_notification(NEW.addressee_id, 'friend_request', 'New Friend Request', requester_name || ' sent you a friend request', jsonb_build_object('friend_id', NEW.id, 'user_id', NEW.requester_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.extract_and_create_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashtag_match TEXT;
  hashtag_name TEXT;
  hashtag_record RECORD;
BEGIN
  FOR hashtag_match IN SELECT DISTINCT regexp_matches(NEW.content, '#([a-zA-Z0-9_]+)', 'g') AS match
  LOOP
    hashtag_name := lower(hashtag_match);
    INSERT INTO public.hashtags (name, post_count) VALUES (hashtag_name, 1)
    ON CONFLICT (name) DO UPDATE SET post_count = hashtags.post_count + 1, updated_at = now();
    SELECT * INTO hashtag_record FROM public.hashtags WHERE name = hashtag_name;
    INSERT INTO public.post_hashtags (post_id, hashtag_id) VALUES (NEW.id, hashtag_record.id) ON CONFLICT (post_id, hashtag_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_message_receipts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Revoke EXECUTE on security definer functions from anon role where not needed
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_post_like() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_post_comment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_friend_request() FROM anon;
REVOKE EXECUTE ON FUNCTION public.extract_and_create_hashtags() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_follower_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_chat_with_participants(uuid[], boolean, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_chat_summaries() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_chat_messages_delivered(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_chat_messages_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_chat_updated_at_from_message() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_message_receipts_for_new_message() FROM anon;
