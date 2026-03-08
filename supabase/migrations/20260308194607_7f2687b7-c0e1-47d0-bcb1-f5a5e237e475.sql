
-- Create room_post_reactions table for likes/dislikes on room posts
CREATE TABLE public.room_post_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);

ALTER TABLE public.room_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all room post reactions"
  ON public.room_post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.room_post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.room_post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create room_post_comments table for comments on room posts
CREATE TABLE public.room_post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.room_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all room post comments"
  ON public.room_post_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add comments"
  ON public.room_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.room_post_comments FOR DELETE
  USING (auth.uid() = user_id);
