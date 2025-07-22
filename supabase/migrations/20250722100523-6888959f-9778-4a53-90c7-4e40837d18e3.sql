
-- Create friends table for friend relationships
CREATE TABLE public.friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Create reactions table for custom emoji reactions
CREATE TABLE public.reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id, emoji)
);

-- Create custom_emojis table for uploadable emojis
CREATE TABLE public.custom_emojis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create site_settings table for custom logo and other settings
CREATE TABLE public.site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update messages table to support voice messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS duration INTEGER; -- duration in seconds for voice messages

-- Update posts table to support video posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('text', 'image', 'video')) DEFAULT 'text';

-- Enable RLS on new tables
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for friends table
CREATE POLICY "Users can view friend requests involving them" ON public.friends 
FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can send friend requests" ON public.friends 
FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update friend requests they're involved in" ON public.friends 
FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can delete their own friend requests" ON public.friends 
FOR DELETE USING (requester_id = auth.uid());

-- Create policies for reactions table
CREATE POLICY "Users can view all reactions" ON public.reactions 
FOR SELECT USING (true);

CREATE POLICY "Users can create their own reactions" ON public.reactions 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON public.reactions 
FOR DELETE USING (user_id = auth.uid());

-- Create policies for custom_emojis table
CREATE POLICY "Users can view public emojis" ON public.custom_emojis 
FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create emojis" ON public.custom_emojis 
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own emojis" ON public.custom_emojis 
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own emojis" ON public.custom_emojis 
FOR DELETE USING (created_by = auth.uid());

-- Create policies for site_settings table (admin only for now, will need admin role system)
CREATE POLICY "Anyone can view site settings" ON public.site_settings 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update site settings" ON public.site_settings 
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_friends_requester_id ON public.friends(requester_id);
CREATE INDEX idx_friends_addressee_id ON public.friends(addressee_id);
CREATE INDEX idx_friends_status ON public.friends(status);
CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX idx_reactions_emoji ON public.reactions(emoji);
CREATE INDEX idx_custom_emojis_public ON public.custom_emojis(is_public);
CREATE INDEX idx_posts_media_type ON public.posts(media_type);

-- Insert default site logo setting
INSERT INTO public.site_settings (setting_key, setting_value) 
VALUES ('site_logo', '/lovable-uploads/15358747-e2da-431c-a6b1-721eb6914fc8.png')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to search users
CREATE OR REPLACE FUNCTION public.search_users(search_term TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  email TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.name,
    p.email,
    p.avatar,
    p.created_at
  FROM public.profiles p
  WHERE 
    p.username ILIKE '%' || search_term || '%' OR
    p.name ILIKE '%' || search_term || '%' OR
    p.email ILIKE '%' || search_term || '%'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
