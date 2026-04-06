
-- Add group management columns to chats table
ALTER TABLE public.chats 
  ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS message_permission text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_muted_all boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS announcement_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_rules text DEFAULT '';

-- Create group join requests table
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own join requests"
  ON public.group_join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chat admins can view join requests"
  ON public.group_join_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = group_join_requests.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

CREATE POLICY "Users can create join requests"
  ON public.group_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chat admins can update join requests"
  ON public.group_join_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = group_join_requests.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

CREATE POLICY "Chat admins can delete join requests"
  ON public.group_join_requests FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = group_join_requests.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ) OR auth.uid() = user_id);

-- Create blocked group members table
CREATE TABLE IF NOT EXISTS public.blocked_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

ALTER TABLE public.blocked_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view blocked members"
  ON public.blocked_group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = blocked_group_members.chat_id
      AND chat_participants.user_id = auth.uid()
  ));

CREATE POLICY "Chat admins can block members"
  ON public.blocked_group_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = blocked_group_members.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

CREATE POLICY "Chat admins can unblock members"
  ON public.blocked_group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = blocked_group_members.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

-- Allow chat_participants SELECT for all participants (fix for group member viewing)
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;
CREATE POLICY "Users can view chat participants for their chats"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND cp.user_id = auth.uid()
    )
  );
