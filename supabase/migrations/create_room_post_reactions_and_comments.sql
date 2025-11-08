-- Create room_post_reactions table for thumbs up/down
CREATE TABLE IF NOT EXISTS public.room_post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '👎')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, emoji)
);

-- Create room_post_comments table
CREATE TABLE IF NOT EXISTS public.room_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_post_comments ENABLE ROW LEVEL SECURITY;

-- Policies for room_post_reactions
CREATE POLICY "Room participants can view reactions"
  ON public.room_post_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_reactions.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Room participants can add reactions"
  ON public.room_post_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_reactions.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON public.room_post_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for room_post_comments
CREATE POLICY "Room participants can view comments"
  ON public.room_post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_comments.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Room participants can create comments"
  ON public.room_post_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_comments.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.room_post_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.room_post_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_post_reactions_post_id ON public.room_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_room_post_reactions_user_id ON public.room_post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_room_post_comments_post_id ON public.room_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_room_post_comments_user_id ON public.room_post_comments(user_id);

