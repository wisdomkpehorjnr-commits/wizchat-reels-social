-- Fix the security definer view issue by dropping it and updating application code instead
-- The RLS policies are sufficient for protection

DROP VIEW IF EXISTS public.public_profiles;

-- Update the are_users_friends function to have proper search_path
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
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