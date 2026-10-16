-- Consolidated GRANT pass for all public tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Restore profile self-update policy (dropped by an earlier security migration)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Seed the Trending News room (default category) if missing
INSERT INTO public.topic_rooms (name, description)
SELECT 'Trending News', 'Breaking news, headlines and trending stories'
WHERE NOT EXISTS (SELECT 1 FROM public.topic_rooms WHERE name ILIKE 'Trending News');

INSERT INTO public.topic_rooms (name, description)
SELECT 'Global News', 'World news and current affairs'
WHERE NOT EXISTS (SELECT 1 FROM public.topic_rooms WHERE name ILIKE 'Global News');

-- Realtime for core chat tables
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chats; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;