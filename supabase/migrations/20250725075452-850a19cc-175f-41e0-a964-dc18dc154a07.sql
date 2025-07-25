
-- Create room_posts table for topic room posts
CREATE TABLE public.room_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES topic_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  media_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on room_posts
ALTER TABLE public.room_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for room_posts
CREATE POLICY "Room participants can view posts" 
  ON public.room_posts 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = room_posts.room_id 
    AND room_participants.user_id = auth.uid()
  ));

CREATE POLICY "Room participants can create posts" 
  ON public.room_posts 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = room_posts.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own room posts" 
  ON public.room_posts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own room posts" 
  ON public.room_posts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add realtime support
ALTER TABLE public.room_posts REPLICA IDENTITY FULL;
