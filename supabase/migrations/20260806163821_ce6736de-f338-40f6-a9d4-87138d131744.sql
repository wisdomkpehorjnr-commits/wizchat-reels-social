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
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH expired AS (
    SELECT id FROM public.posts WHERE expires_at < now()
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
$$;

GRANT EXECUTE ON FUNCTION public.delete_expired_posts() TO service_role;