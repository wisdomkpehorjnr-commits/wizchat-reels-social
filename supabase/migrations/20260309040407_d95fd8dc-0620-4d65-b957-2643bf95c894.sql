-- Fix infinite recursion on group_members RLS by removing self-referential policies

alter table public.group_members enable row level security;

-- Drop problematic/legacy policies (names seen in schema dump)
drop policy if exists "Group members can view membership" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Users can leave groups" on public.group_members;
drop policy if exists "delete_group_members" on public.group_members;
drop policy if exists "insert_group_members" on public.group_members;
drop policy if exists "select_group_members" on public.group_members;
drop policy if exists "update_group_members" on public.group_members;

-- Recreate minimal safe policies using SECURITY DEFINER helpers to avoid recursion

-- Members can view memberships for groups they belong to
create policy "Group members can view memberships"
on public.group_members
for select
to authenticated
using (
  public.is_group_member(auth.uid(), group_id)
);

-- Group creator/admin can add members; users may also add themselves (e.g., via invite)
create policy "Group admins can add members"
on public.group_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  or public.is_group_admin(auth.uid(), group_id)
  or auth.uid() = (select g.created_by from public.groups g where g.id = group_id)
);

-- Only group admins can change roles, etc.
create policy "Group admins can update memberships"
on public.group_members
for update
to authenticated
using (
  public.is_group_admin(auth.uid(), group_id)
)
with check (
  public.is_group_admin(auth.uid(), group_id)
);

-- Admins can remove anyone; users can remove themselves
create policy "Group admins or self can remove memberships"
on public.group_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_group_admin(auth.uid(), group_id)
);
