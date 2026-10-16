CREATE OR REPLACE FUNCTION public.create_chat_with_participants(
  p_participant_ids uuid[],
  p_is_group boolean DEFAULT false,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chat_id uuid;
  participant_id uuid;
BEGIN
  INSERT INTO public.chats (creator_id, is_group, name, description)
  VALUES (auth.uid(), p_is_group, p_name, p_description)
  RETURNING id INTO chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id, role)
  VALUES (chat_id, auth.uid(), 'admin');

  FOREACH participant_id IN ARRAY p_participant_ids
  LOOP
    IF participant_id != auth.uid() THEN
      INSERT INTO public.chat_participants (chat_id, user_id, role)
      VALUES (chat_id, participant_id, 'member');
    END IF;
  END LOOP;

  RETURN chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin(_chat_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = _user_id
      AND cp.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;
CREATE POLICY "Users can view chat participants for their chats" ON public.chat_participants
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can add participants to chats" ON public.chat_participants;
CREATE POLICY "Users can add participants to chats" ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.chats c
    WHERE c.id = chat_id
      AND c.creator_id = auth.uid()
  )
  OR public.is_chat_admin(chat_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can remove themselves from chats" ON public.chat_participants;
CREATE POLICY "Users can remove themselves from chats" ON public.chat_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_chat_admin(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Users can view chats they participate in" ON public.chats
FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.is_chat_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Users can view public groups" ON public.chats;
CREATE POLICY "Users can view public groups" ON public.chats
FOR SELECT
TO authenticated
USING (COALESCE(is_public, false) = true OR public.is_chat_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update chats they participate in" ON public.chats;
CREATE POLICY "Users can update chats they participate in" ON public.chats
FOR UPDATE
TO authenticated
USING (public.is_chat_admin(id, auth.uid()) OR creator_id = auth.uid())
WITH CHECK (public.is_chat_admin(id, auth.uid()) OR creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.messages;
CREATE POLICY "Users can view messages from their chats" ON public.messages
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create messages in their chats" ON public.messages;
CREATE POLICY "Users can create messages in their chats" ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Chat participants can view message receipts" ON public.message_receipts;
CREATE POLICY "Chat participants can view message receipts" ON public.message_receipts
FOR SELECT
TO authenticated
USING (public.is_chat_participant(chat_id, auth.uid()));

DROP POLICY IF EXISTS "Recipients can create their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can create their own receipts" ON public.message_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = recipient_id
  AND public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can update their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can update their own receipts" ON public.message_receipts
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id AND public.is_chat_participant(chat_id, auth.uid()))
WITH CHECK (
  auth.uid() = recipient_id
  AND public.is_chat_participant(chat_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_user ON public.chat_participants(chat_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_chat ON public.chat_participants(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON public.messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_chat ON public.messages(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_chat_recipient_read ON public.message_receipts(chat_id, recipient_id, read_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_receipts_message_recipient_unique ON public.message_receipts(message_id, recipient_id);

DROP TRIGGER IF EXISTS trg_create_message_receipts ON public.messages;
CREATE TRIGGER trg_create_message_receipts
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_receipts_for_new_message();

DROP TRIGGER IF EXISTS trg_touch_chat_updated_at ON public.messages;
CREATE TRIGGER trg_touch_chat_updated_at
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_updated_at_from_message();

DROP TRIGGER IF EXISTS trg_message_receipts_updated_at ON public.message_receipts;
CREATE TRIGGER trg_message_receipts_updated_at
BEFORE UPDATE ON public.message_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_message_receipts_updated_at();

INSERT INTO public.message_receipts (message_id, chat_id, recipient_id, delivered_at, read_at)
SELECT
  m.id,
  m.chat_id,
  cp.user_id,
  CASE WHEN COALESCE(m.seen, false) THEN m.created_at ELSE NULL END,
  CASE WHEN COALESCE(m.seen, false) THEN m.created_at ELSE NULL END
FROM public.messages m
JOIN public.chat_participants cp
  ON cp.chat_id = m.chat_id
 AND cp.user_id <> m.user_id
ON CONFLICT (message_id, recipient_id) DO NOTHING;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted) WHERE is_deleted = true;

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;

DROP POLICY IF EXISTS "Chat media are accessible to participants" ON storage.objects;
CREATE POLICY "Chat media are accessible to participants" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Give anon users access to JPG images in folder 1w9dbhu_0" ON storage.objects;

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

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

GRANT SELECT ON public.comment_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike own comment likes" ON public.comment_likes;
CREATE POLICY "Users can unlike own comment likes" ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes(comment_id);

CREATE OR REPLACE FUNCTION public.auto_route_post_to_topic_rooms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_content text := lower(coalesce(NEW.content, ''));
  v_room_id uuid;
BEGIN
  IF COALESCE(NEW.is_reel, false) = true
     OR NEW.video_url IS NOT NULL
     OR COALESCE(NEW.media_type, '') = 'video' THEN
    RETURN NEW;
  END IF;

  IF NEW.image_url IS NULL OR length(trim(NEW.image_url)) = 0 THEN
    RETURN NEW;
  END IF;

  IF v_content ~ '\m(football|soccer|goal|fifa|epl|champions|messi|ronaldo|world cup|premier league|laliga|match)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Football Today' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(news|breaking|headline|headlines|politics|world|report|reuters|bbc|cnn|election|government)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms
      WHERE (name ILIKE 'Global News' OR name ILIKE 'Trending News' OR name ILIKE '%News%')
        AND is_active
      ORDER BY (CASE WHEN name ILIKE 'Global News' THEN 0 WHEN name ILIKE 'Trending News' THEN 1 ELSE 2 END)
      LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(tech|technology|ai|gadget|iphone|android|software|coding|developer|startup|chatgpt|openai|google|apple|samsung)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Tech Talk' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(music|song|album|artist|playlist|spotify|afrobeat|hiphop|rap|edm|drake|burna|wizkid|davido)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Music Corner' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(gossip|celeb|celebrity|drama|scandal|trending|kardashian|tea|rumor|rumour)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Gossip Lounge' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS posts_auto_route_topic_rooms ON public.posts;
CREATE TRIGGER posts_auto_route_topic_rooms
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.auto_route_post_to_topic_rooms();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 days');

CREATE INDEX IF NOT EXISTS posts_expires_at_idx ON public.posts (expires_at);

CREATE OR REPLACE FUNCTION public.extend_post_expiry(p_post_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.posts
  SET expires_at = GREATEST(expires_at, now()) + interval '15 days',
      updated_at = now()
  WHERE id = p_post_id
    AND user_id = auth.uid()
  RETURNING expires_at INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Post not found or not owned by current user';
  END IF;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_post_expiry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_expired_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  DELETE FROM public.room_post_reactions
    WHERE post_id IN (SELECT id FROM public.room_posts WHERE created_at < now() - interval '2 days');
  DELETE FROM public.room_post_comments
    WHERE post_id IN (SELECT id FROM public.room_posts WHERE created_at < now() - interval '2 days');
  DELETE FROM public.room_posts WHERE created_at < now() - interval '2 days';

  WITH expired AS (
    SELECT id FROM public.posts
    WHERE expires_at < now()
       OR (
         (COALESCE(is_reel, false) = true OR video_url IS NOT NULL OR COALESCE(media_type,'') = 'video')
         AND created_at < now() - interval '3 days'
       )
  ), d1 AS (
    DELETE FROM public.likes WHERE post_id IN (SELECT id FROM expired) RETURNING 1
  ), d2 AS (
    DELETE FROM public.comments WHERE post_id IN (SELECT id FROM expired) RETURNING 1
  ), d3 AS (
    DELETE FROM public.saved_posts WHERE post_id IN (SELECT id FROM expired) RETURNING 1
  ), d4 AS (
    DELETE FROM public.reactions WHERE post_id IN (SELECT id FROM expired) RETURNING 1
  ), d5 AS (
    DELETE FROM public.post_hashtags WHERE post_id IN (SELECT id FROM expired) RETURNING 1
  ), d6 AS (
    DELETE FROM public.pinned_posts WHERE post_id IN (SELECT id FROM expired) RETURNING 1
  ), dp AS (
    DELETE FROM public.posts WHERE id IN (SELECT id FROM expired) RETURNING 1
  )
  SELECT count(*) INTO v_count FROM dp;

  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_expired_posts() TO service_role;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls JSONB;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video'));
CREATE INDEX IF NOT EXISTS idx_posts_image_urls ON public.posts USING GIN (image_urls);