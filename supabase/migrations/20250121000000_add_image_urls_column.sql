-- Add image_urls column to posts table for multiple images support
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls JSONB;

-- Add media_type column if it doesn't exist
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video'));

-- Create index for better performance on image_urls
CREATE INDEX IF NOT EXISTS idx_posts_image_urls ON public.posts USING GIN (image_urls);


