CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their chats" ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions" ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;
CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);

CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, message_id)
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pinned messages" ON public.pinned_messages;
CREATE POLICY "Users can view pinned messages" ON public.pinned_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = pinned_messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can pin messages" ON public.pinned_messages;
CREATE POLICY "Users can pin messages" ON public.pinned_messages
FOR INSERT
WITH CHECK (
  auth.uid() = pinned_by AND
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = pinned_messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can unpin messages" ON public.pinned_messages;
CREATE POLICY "Users can unpin messages" ON public.pinned_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = pinned_messages.chat_id
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE INDEX idx_pinned_messages_chat_id ON public.pinned_messages(chat_id);

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    UPDATE public.profiles
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    UPDATE public.profiles
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_follower_counts_trigger ON public.follows;
CREATE TRIGGER update_follower_counts_trigger
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.update_follower_counts();

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS pinned_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view pinned posts" ON pinned_posts;
CREATE POLICY "Anyone can view pinned posts" ON pinned_posts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can pin their own posts" ON pinned_posts;
CREATE POLICY "Users can pin their own posts" ON pinned_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unpin their own posts" ON pinned_posts;
CREATE POLICY "Users can unpin their own posts" ON pinned_posts FOR DELETE
USING (auth.uid() = user_id);

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

ALTER FUNCTION public.is_user_in_group(uuid, uuid) SET search_path = '';

DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;
CREATE POLICY "Group members can view membership" ON public.group_members FOR SELECT
USING (
  user_id = auth.uid() OR public.is_user_in_group(group_id, auth.uid())
);

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

DROP POLICY IF EXISTS "select_group_members" ON public.group_members;
CREATE POLICY "select_group_members" ON public.group_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_group_members" ON public.group_members;
CREATE POLICY "insert_group_members" ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_group_members" ON public.group_members;
CREATE POLICY "update_group_members" ON public.group_members FOR UPDATE
  TO authenticated
  USING (public.is_group_admin(auth.uid(), group_id));

DROP POLICY IF EXISTS "delete_group_members" ON public.group_members;
CREATE POLICY "delete_group_members" ON public.group_members FOR DELETE
  TO authenticated
  USING (public.is_group_admin(auth.uid(), group_id) OR user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.room_post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '👎')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.room_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.room_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room participants can view reactions" ON public.room_post_reactions;
CREATE POLICY "Room participants can view reactions" ON public.room_post_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_reactions.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room participants can add reactions" ON public.room_post_reactions;
CREATE POLICY "Room participants can add reactions" ON public.room_post_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_reactions.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.room_post_reactions;
CREATE POLICY "Users can delete their own reactions" ON public.room_post_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Room participants can view comments" ON public.room_post_comments;
CREATE POLICY "Room participants can view comments" ON public.room_post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_comments.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room participants can create comments" ON public.room_post_comments;
CREATE POLICY "Room participants can create comments" ON public.room_post_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = (
        SELECT room_id FROM room_posts WHERE id = room_post_comments.post_id
      )
      AND room_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.room_post_comments;
CREATE POLICY "Users can update their own comments" ON public.room_post_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.room_post_comments;
CREATE POLICY "Users can delete their own comments" ON public.room_post_comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_room_post_reactions_post_id ON public.room_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_room_post_reactions_user_id ON public.room_post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_room_post_comments_post_id ON public.room_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_room_post_comments_user_id ON public.room_post_comments(user_id);

DROP POLICY IF EXISTS "Users can view all room post reactions" ON public.room_post_reactions;
CREATE POLICY "Users can view all room post reactions" ON public.room_post_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON public.room_post_reactions;
CREATE POLICY "Users can add reactions" ON public.room_post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.room_post_reactions;
CREATE POLICY "Users can delete own reactions" ON public.room_post_reactions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all room post comments" ON public.room_post_comments;
CREATE POLICY "Users can view all room post comments" ON public.room_post_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.room_post_comments;
CREATE POLICY "Authenticated users can add comments" ON public.room_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.room_post_comments;
CREATE POLICY "Users can delete own comments" ON public.room_post_comments FOR DELETE
  USING (auth.uid() = user_id);

alter table public.group_members enable row level security;

drop policy if exists "Group members can view membership" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
drop policy if exists "Users can leave groups" on public.group_members;
drop policy if exists "delete_group_members" on public.group_members;
drop policy if exists "insert_group_members" on public.group_members;
drop policy if exists "select_group_members" on public.group_members;
drop policy if exists "update_group_members" on public.group_members;

DROP POLICY IF EXISTS "Group members can view memberships" ON public.group_members;
CREATE POLICY "Group members can view memberships" ON public.group_members
for select
to authenticated
using (
  public.is_group_member(auth.uid(), group_id)
);

DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
CREATE POLICY "Group admins can add members" ON public.group_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  or public.is_group_admin(auth.uid(), group_id)
  or auth.uid() = (select g.created_by from public.groups g where g.id = group_id)
);

DROP POLICY IF EXISTS "Group admins can update memberships" ON public.group_members;
CREATE POLICY "Group admins can update memberships" ON public.group_members
for update
to authenticated
using (
  public.is_group_admin(auth.uid(), group_id)
)
with check (
  public.is_group_admin(auth.uid(), group_id)
);

DROP POLICY IF EXISTS "Group admins or self can remove memberships" ON public.group_members;
CREATE POLICY "Group admins or self can remove memberships" ON public.group_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_group_admin(auth.uid(), group_id)
);

ALTER TABLE public.chats 
  ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS message_permission text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_muted_all boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS announcement_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_rules text DEFAULT '';

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

DROP POLICY IF EXISTS "Users can view their own join requests" ON public.group_join_requests;
CREATE POLICY "Users can view their own join requests" ON public.group_join_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Chat admins can view join requests" ON public.group_join_requests;
CREATE POLICY "Chat admins can view join requests" ON public.group_join_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = group_join_requests.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

DROP POLICY IF EXISTS "Users can create join requests" ON public.group_join_requests;
CREATE POLICY "Users can create join requests" ON public.group_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Chat admins can update join requests" ON public.group_join_requests;
CREATE POLICY "Chat admins can update join requests" ON public.group_join_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = group_join_requests.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

DROP POLICY IF EXISTS "Chat admins can delete join requests" ON public.group_join_requests;
CREATE POLICY "Chat admins can delete join requests" ON public.group_join_requests FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = group_join_requests.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ) OR auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.blocked_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

ALTER TABLE public.blocked_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can view blocked members" ON public.blocked_group_members;
CREATE POLICY "Chat participants can view blocked members" ON public.blocked_group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = blocked_group_members.chat_id
      AND chat_participants.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Chat admins can block members" ON public.blocked_group_members;
CREATE POLICY "Chat admins can block members" ON public.blocked_group_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = blocked_group_members.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

DROP POLICY IF EXISTS "Chat admins can unblock members" ON public.blocked_group_members;
CREATE POLICY "Chat admins can unblock members" ON public.blocked_group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = blocked_group_members.chat_id
      AND chat_participants.user_id = auth.uid()
      AND chat_participants.role = 'admin'
  ));

DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;
CREATE POLICY "Users can view chat participants for their chats" ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (message_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_message_receipts_recipient_chat_read
  ON public.message_receipts(recipient_id, chat_id, read_at);

CREATE INDEX IF NOT EXISTS idx_message_receipts_recipient_chat_delivered
  ON public.message_receipts(recipient_id, chat_id, delivered_at);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_id
  ON public.message_receipts(message_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at
  ON public.messages(chat_id, created_at DESC);

ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can view message receipts" ON public.message_receipts;
CREATE POLICY "Chat participants can view message receipts" ON public.message_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can create their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can create their own receipts" ON public.message_receipts
FOR INSERT
WITH CHECK (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_receipts.message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can update their own receipts" ON public.message_receipts;
CREATE POLICY "Recipients can update their own receipts" ON public.message_receipts
FOR UPDATE
USING (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = message_receipts.chat_id
      AND cp.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_receipts.message_id
      AND m.chat_id = message_receipts.chat_id
      AND m.user_id <> auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.set_message_receipts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_receipts_updated_at ON public.message_receipts;
CREATE TRIGGER trg_message_receipts_updated_at
BEFORE UPDATE ON public.message_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_message_receipts_updated_at();

CREATE OR REPLACE FUNCTION public.create_message_receipts_for_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_receipts (message_id, chat_id, recipient_id)
  SELECT NEW.id, NEW.chat_id, cp.user_id
  FROM public.chat_participants cp
  WHERE cp.chat_id = NEW.chat_id
    AND cp.user_id <> NEW.user_id
  ON CONFLICT (message_id, recipient_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_message_receipts ON public.messages;
CREATE TRIGGER trg_create_message_receipts
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_receipts_for_new_message();

CREATE OR REPLACE FUNCTION public.touch_chat_updated_at_from_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  v_chat_id := COALESCE(NEW.chat_id, OLD.chat_id);

  UPDATE public.chats
  SET updated_at = now()
  WHERE id = v_chat_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_chat_updated_at_on_message_insert ON public.messages;
CREATE TRIGGER trg_touch_chat_updated_at_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_updated_at_from_message();

DROP TRIGGER IF EXISTS trg_touch_chat_updated_at_on_message_delete ON public.messages;
CREATE TRIGGER trg_touch_chat_updated_at_on_message_delete
AFTER DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_updated_at_from_message();

CREATE OR REPLACE FUNCTION public.mark_chat_messages_delivered(_chat_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this chat';
  END IF;

  WITH updated AS (
    UPDATE public.message_receipts mr
    SET delivered_at = COALESCE(mr.delivered_at, now()),
        updated_at = now()
    FROM public.messages m
    WHERE mr.message_id = m.id
      AND mr.chat_id = _chat_id
      AND mr.recipient_id = auth.uid()
      AND m.user_id <> auth.uid()
      AND mr.delivered_at IS NULL
    RETURNING mr.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_messages_read(_chat_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.chat_id = _chat_id
      AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant in this chat';
  END IF;

  WITH updated AS (
    UPDATE public.message_receipts mr
    SET delivered_at = COALESCE(mr.delivered_at, now()),
        read_at = COALESCE(mr.read_at, now()),
        updated_at = now()
    FROM public.messages m
    WHERE mr.message_id = m.id
      AND mr.chat_id = _chat_id
      AND mr.recipient_id = auth.uid()
      AND m.user_id <> auth.uid()
      AND mr.read_at IS NULL
    RETURNING mr.message_id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  UPDATE public.messages m
  SET seen = true
  WHERE m.chat_id = _chat_id
    AND m.user_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.message_receipts mr
      WHERE mr.message_id = m.id
        AND mr.recipient_id = auth.uid()
        AND mr.read_at IS NOT NULL
    );

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_chat_summaries()
RETURNS TABLE (
  chat_id UUID,
  is_group BOOLEAN,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  creator_id UUID,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  member_count INTEGER,
  is_public BOOLEAN,
  invite_code TEXT,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_type TEXT,
  last_message_media_url TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  last_message_user_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_chats AS (
    SELECT c.*
    FROM public.chats c
    JOIN public.chat_participants cp
      ON cp.chat_id = c.id
     AND cp.user_id = auth.uid()
  )
  SELECT
    c.id AS chat_id,
    COALESCE(c.is_group, false) AS is_group,
    c.name,
    c.description,
    c.avatar_url,
    c.creator_id,
    c.updated_at,
    c.created_at,
    c.member_count,
    c.is_public,
    c.invite_code,
    lm.id AS last_message_id,
    lm.content AS last_message_content,
    lm.type AS last_message_type,
    lm.media_url AS last_message_media_url,
    lm.created_at AS last_message_created_at,
    lm.user_id AS last_message_user_id,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM my_chats c
  LEFT JOIN LATERAL (
    SELECT m.id, m.content, m.type, m.media_url, m.created_at, m.user_id
    FROM public.messages m
    WHERE m.chat_id = c.id
    ORDER BY m.created_at DESC NULLS LAST
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count
    FROM public.message_receipts mr
    WHERE mr.chat_id = c.id
      AND mr.recipient_id = auth.uid()
      AND mr.read_at IS NULL
  ) uc ON true
  ORDER BY COALESCE(lm.created_at, c.updated_at, c.created_at) DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.mark_chat_messages_delivered(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_messages_delivered(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_chat_messages_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_messages_read(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_chat_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_summaries() TO authenticated;