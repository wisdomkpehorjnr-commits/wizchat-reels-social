
-- Fix infinite recursion in group_members RLS policies
-- Drop all existing policies on group_members first
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can insert group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can delete group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can update group members" ON public.group_members;
DROP POLICY IF EXISTS "Group members are viewable by group members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can insert group members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view their groups" ON public.group_members;
DROP POLICY IF EXISTS "Allow insert group members" ON public.group_members;
DROP POLICY IF EXISTS "Allow select group members" ON public.group_members;
DROP POLICY IF EXISTS "Allow delete group members" ON public.group_members;
DROP POLICY IF EXISTS "Allow update group members" ON public.group_members;

-- Create a security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Create a security definer function to check group admin status
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

-- Simple non-recursive policies
CREATE POLICY "select_group_members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "insert_group_members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "update_group_members"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "delete_group_members"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (public.is_group_admin(auth.uid(), group_id) OR user_id = auth.uid());
