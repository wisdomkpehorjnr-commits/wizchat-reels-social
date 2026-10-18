CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = _room_id AND rp.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_room_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_participant(uuid) TO authenticated, service_role;
DROP POLICY IF EXISTS "Participants can view room membership" ON public.room_participants;
CREATE POLICY "Participants can view room membership" ON public.room_participants
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_room_participant(room_id));
DROP POLICY IF EXISTS "Room participants can view posts" ON public.room_posts;
CREATE POLICY "Room participants can view posts" ON public.room_posts
FOR SELECT TO authenticated USING (public.is_room_participant(room_id));
DROP POLICY IF EXISTS "Room participants can create posts" ON public.room_posts;
CREATE POLICY "Room participants can create posts" ON public.room_posts
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_room_participant(room_id));