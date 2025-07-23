
-- Create saved_posts table for users to save posts
CREATE TABLE public.saved_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create voice_calls table for voice call functionality
CREATE TABLE public.voice_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('calling', 'active', 'ended', 'missed')) DEFAULT 'calling',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0
);

-- Add missing profile fields to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS pronouns TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_posts table
CREATE POLICY "Users can manage their saved posts" ON public.saved_posts 
FOR ALL USING (auth.uid() = user_id);

-- Create policies for voice_calls table
CREATE POLICY "Users can view calls they're involved in" ON public.voice_calls 
FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls" ON public.voice_calls 
FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update calls they're involved in" ON public.voice_calls 
FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create indexes for better performance
CREATE INDEX idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON public.saved_posts(post_id);
CREATE INDEX idx_voice_calls_caller_id ON public.voice_calls(caller_id);
CREATE INDEX idx_voice_calls_receiver_id ON public.voice_calls(receiver_id);
CREATE INDEX idx_voice_calls_status ON public.voice_calls(status);
