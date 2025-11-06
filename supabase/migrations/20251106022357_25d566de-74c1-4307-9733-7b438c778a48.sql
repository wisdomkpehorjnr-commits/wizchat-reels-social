-- Add pinned posts tracking
CREATE TABLE IF NOT EXISTS pinned_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS for pinned_posts
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

-- Policy for viewing pinned posts
CREATE POLICY "Anyone can view pinned posts"
ON pinned_posts FOR SELECT
USING (true);

-- Policy for creating pinned posts
CREATE POLICY "Users can pin their own posts"
ON pinned_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for deleting pinned posts
CREATE POLICY "Users can unpin their own posts"
ON pinned_posts FOR DELETE
USING (auth.uid() = user_id);