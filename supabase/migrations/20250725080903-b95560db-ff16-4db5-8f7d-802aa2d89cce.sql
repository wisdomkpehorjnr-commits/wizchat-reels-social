
-- Add foreign key relationship between room_posts and profiles
ALTER TABLE public.room_posts 
ADD CONSTRAINT room_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update the existing foreign key to reference profiles instead of auth.users
ALTER TABLE public.room_posts 
DROP CONSTRAINT IF EXISTS room_posts_user_id_fkey1;

-- Make sure we have the correct foreign key
ALTER TABLE public.room_posts 
DROP CONSTRAINT IF EXISTS room_posts_user_id_fkey;

ALTER TABLE public.room_posts 
ADD CONSTRAINT room_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
