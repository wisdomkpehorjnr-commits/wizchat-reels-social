CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view story likes" ON public.story_likes;
CREATE POLICY "Anyone can view story likes" ON public.story_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like stories" ON public.story_likes;
CREATE POLICY "Users can like stories" ON public.story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike stories" ON public.story_likes;
CREATE POLICY "Users can unlike stories" ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON public.story_likes(story_id);

GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT SELECT ON public.story_likes TO anon;
GRANT ALL ON public.story_likes TO service_role;