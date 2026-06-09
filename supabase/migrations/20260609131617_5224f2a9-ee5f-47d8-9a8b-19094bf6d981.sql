
-- 1. Comment replies
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- 2. Comment likes
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

-- 3. Auto-route trigger function (inline both new + backfill share the same matching logic via this SELECT)
CREATE OR REPLACE FUNCTION public.auto_route_post_to_topic_rooms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_content text := lower(coalesce(NEW.content, ''));
  v_room_id uuid;
BEGIN
  IF v_content ~ '\m(football|soccer|goal|fifa|epl|champions|messi|ronaldo|world cup|premier league|laliga|match)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Football Today' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NEW.video_url, NEW.media_type);
    END IF;
  END IF;

  IF v_content ~ '\m(tech|technology|ai|gadget|iphone|android|software|coding|developer|startup|chatgpt|openai|google|apple|samsung)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Tech Talk' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NEW.video_url, NEW.media_type);
    END IF;
  END IF;

  IF v_content ~ '\m(music|song|album|artist|playlist|spotify|afrobeat|hiphop|rap|edm|drake|burna|wizkid|davido)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Music Corner' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NEW.video_url, NEW.media_type);
    END IF;
  END IF;

  IF v_content ~ '\m(gossip|celeb|celebrity|drama|scandal|trending|kardashian|tea|rumor|rumour)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Gossip Lounge' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NEW.video_url, NEW.media_type);
    END IF;
  END IF;

  IF NEW.is_reel IS TRUE OR v_content ~ '\m(reel|review|short video|tiktok)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Reel Review Zone' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NEW.video_url, NEW.media_type);
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS posts_auto_route_topic_rooms ON public.posts;
CREATE TRIGGER posts_auto_route_topic_rooms
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.auto_route_post_to_topic_rooms();

-- 4. Backfill existing posts (inline, idempotent: avoid duplicates by checking content+room+user)
INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
SELECT tr.id, p.user_id, p.content, p.image_url, p.video_url, p.media_type
FROM public.posts p
JOIN public.topic_rooms tr ON tr.is_active AND (
  (tr.name ILIKE 'Football Today'   AND lower(p.content) ~ '\m(football|soccer|goal|fifa|epl|champions|messi|ronaldo|world cup|premier league|laliga|match)\M') OR
  (tr.name ILIKE 'Tech Talk'        AND lower(p.content) ~ '\m(tech|technology|ai|gadget|iphone|android|software|coding|developer|startup|chatgpt|openai|google|apple|samsung)\M') OR
  (tr.name ILIKE 'Music Corner'     AND lower(p.content) ~ '\m(music|song|album|artist|playlist|spotify|afrobeat|hiphop|rap|edm|drake|burna|wizkid|davido)\M') OR
  (tr.name ILIKE 'Gossip Lounge'    AND lower(p.content) ~ '\m(gossip|celeb|celebrity|drama|scandal|trending|kardashian|tea|rumor|rumour)\M') OR
  (tr.name ILIKE 'Reel Review Zone' AND (p.is_reel IS TRUE OR lower(p.content) ~ '\m(reel|review|short video|tiktok)\M'))
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.room_posts rp
  WHERE rp.room_id = tr.id AND rp.user_id = p.user_id AND rp.content = p.content
);
