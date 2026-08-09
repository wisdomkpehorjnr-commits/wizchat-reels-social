CREATE OR REPLACE FUNCTION public.delete_expired_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  -- Topic room posts: expire after 2 days
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