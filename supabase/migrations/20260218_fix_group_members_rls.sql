-- Fix RLS recursion on group_members by using a security-definer helper
-- This migration adds a helper function that checks membership and updates
-- the existing RLS policy to call the helper instead of querying the same
-- relation from within the policy (which caused infinite recursion).

-- Helper function to check if a user is a member of a given group.
CREATE OR REPLACE FUNCTION public.is_user_in_group(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id
  );
$$;

-- Ensure function has minimal search_path to avoid privilege escalation
ALTER FUNCTION public.is_user_in_group(uuid, uuid) SET search_path = '';

-- Replace the group_members SELECT policy to call the helper function.
-- Drop the old policy if it exists, then recreate it using the helper.
DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;

CREATE POLICY "Group members can view membership" ON public.group_members FOR SELECT
USING (
  user_id = auth.uid() OR public.is_user_in_group(group_id, auth.uid())
);

-- Note: this migration updates only the policy; other RLS policies remain unchanged.
