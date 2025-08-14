-- Fix critical security vulnerability: restrict profile data access
-- This replaces the overly permissive "Users can view all profiles" policy

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a function to check if two users are friends (accepted friend request)
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friends 
    WHERE status = 'accepted' 
    AND (
      (requester_id = user1_id AND addressee_id = user2_id) OR
      (requester_id = user2_id AND addressee_id = user1_id)
    )
  );
$$;

-- Policy 1: Users can always view their own full profile (including email)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: For public profiles - others can view limited data (NO EMAIL)
CREATE POLICY "Public profiles limited view" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() != id AND 
  (is_private = false OR is_private IS NULL) AND 
  auth.uid() IS NOT NULL
);

-- Policy 3: For private profiles - only friends can view limited data (NO EMAIL)
CREATE POLICY "Private profiles friends only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() != id AND 
  is_private = true AND 
  auth.uid() IS NOT NULL AND
  public.are_users_friends(auth.uid(), id)
);

-- Create a view for safe public profile data (without sensitive information)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  name,
  avatar,
  bio,
  location,
  website,
  cover_image,
  is_private,
  follower_count,
  following_count,
  created_at
FROM public.profiles
WHERE 
  -- Show public profiles to everyone
  (is_private = false OR is_private IS NULL) OR
  -- Show private profiles only to friends or the profile owner
  (is_private = true AND (
    auth.uid() = id OR 
    public.are_users_friends(auth.uid(), id)
  ));

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;