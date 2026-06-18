CREATE OR REPLACE FUNCTION public.auto_route_post_to_topic_rooms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_content text := lower(coalesce(NEW.content, ''));
  v_room_id uuid;
BEGIN
  -- Hard block: never auto-route videos or reels
  IF COALESCE(NEW.is_reel, false) = true
     OR NEW.video_url IS NOT NULL
     OR COALESCE(NEW.media_type, '') = 'video' THEN
    RETURN NEW;
  END IF;

  -- Images-only auto posting: require an image attached
  IF NEW.image_url IS NULL OR length(trim(NEW.image_url)) = 0 THEN
    RETURN NEW;
  END IF;

  IF v_content ~ '\m(football|soccer|goal|fifa|epl|champions|messi|ronaldo|world cup|premier league|laliga|match)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Football Today' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(news|breaking|headline|headlines|politics|world|report|reuters|bbc|cnn|election|government)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms
      WHERE (name ILIKE 'Global News' OR name ILIKE 'Trending News' OR name ILIKE '%News%')
        AND is_active
      ORDER BY (CASE WHEN name ILIKE 'Global News' THEN 0 WHEN name ILIKE 'Trending News' THEN 1 ELSE 2 END)
      LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(tech|technology|ai|gadget|iphone|android|software|coding|developer|startup|chatgpt|openai|google|apple|samsung)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Tech Talk' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(music|song|album|artist|playlist|spotify|afrobeat|hiphop|rap|edm|drake|burna|wizkid|davido)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Music Corner' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  IF v_content ~ '\m(gossip|celeb|celebrity|drama|scandal|trending|kardashian|tea|rumor|rumour)\M' THEN
    SELECT id INTO v_room_id FROM public.topic_rooms WHERE name ILIKE 'Gossip Lounge' AND is_active LIMIT 1;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.room_posts (room_id, user_id, content, image_url, video_url, media_type)
      VALUES (v_room_id, NEW.user_id, NEW.content, NEW.image_url, NULL, 'image');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;