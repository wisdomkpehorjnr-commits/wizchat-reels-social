import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-token",
};

const CLEANUP_TOKEN = "wizchat-storage-cleanup-20260701-4d7e4a9b";
const FILE_BUCKETS = ["posts", "room-media", "chat-media", "avatars", "covers"];

type StorageObject = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.headers.get("x-cleanup-token") !== CLEANUP_TOKEN) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase service configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const listAllObjects = async (bucket: string, prefix = ""): Promise<Array<{ path: string; size: number }>> => {
    const files: Array<{ path: string; size: number }> = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
      const objects = (data ?? []) as StorageObject[];
      if (objects.length === 0) break;

      for (const object of objects) {
        const path = prefix ? `${prefix}/${object.name}` : object.name;
        const size = Number(object.metadata?.size ?? 0);
        const isFolder = !object.id && !object.metadata;

        if (isFolder) {
          files.push(...await listAllObjects(bucket, path));
        } else {
          files.push({ path, size });
        }
      }

      if (objects.length < 1000) break;
      offset += 1000;
    }

    return files;
  };

  const collectReferences = async () => {
    const refs: string[] = [];
    const addRefs = (rows: Array<Record<string, unknown>> | null, fields: string[]) => {
      rows?.forEach((row) => {
        fields.forEach((field) => {
          const value = row[field];
          if (typeof value === "string" && value.length > 0) refs.push(value);
        });
      });
    };

    const [{ data: posts }, { data: roomPosts }, { data: messages }, { data: profiles }] = await Promise.all([
      supabase.from("posts").select("image_url, video_url"),
      supabase.from("room_posts").select("image_url, video_url"),
      supabase.from("messages").select("media_url"),
      supabase.from("profiles").select("avatar, cover_image"),
    ]);

    addRefs(posts as Array<Record<string, unknown>> | null, ["image_url", "video_url"]);
    addRefs(roomPosts as Array<Record<string, unknown>> | null, ["image_url", "video_url"]);
    addRefs(messages as Array<Record<string, unknown>> | null, ["media_url"]);
    addRefs(profiles as Array<Record<string, unknown>> | null, ["avatar", "cover_image"]);

    return refs;
  };

  const removeObjects = async (bucket: string, paths: string[]) => {
    let removed = 0;
    const errors: string[] = [];

    for (const pathsChunk of chunk(paths, 100)) {
      const { data, error } = await supabase.storage.from(bucket).remove(pathsChunk);
      if (error) {
        errors.push(`${bucket}: ${error.message}`);
      } else {
        removed += data?.length ?? pathsChunk.length;
      }
    }

    return { removed, errors };
  };

  try {
    const references = await collectReferences();
    const referenced = (bucket: string, path: string) => {
      const encodedPath = encodeURI(path);
      return references.some((ref) =>
        ref.includes(`${bucket}/${path}`) ||
        ref.includes(`${bucket}/${encodedPath}`) ||
        ref.includes(`/object/public/${bucket}/${path}`) ||
        ref.includes(`/object/public/${bucket}/${encodedPath}`)
      );
    };

    const allStoryFiles = await listAllObjects("stories");
    const storyRemoval = await removeObjects("stories", allStoryFiles.map((file) => file.path));

    const { data: storyRows } = await supabase.from("stories").select("id");
    const storyIds = (storyRows ?? []).map((row: { id: string }) => row.id);

    let removedStoryViews = 0;
    let removedStoryLikes = 0;
    let removedStories = 0;
    if (storyIds.length > 0) {
      const { data: views } = await supabase.from("story_views").delete().in("story_id", storyIds).select("id");
      const { data: likes } = await supabase.from("story_likes").delete().in("story_id", storyIds).select("id");
      const { data: stories } = await supabase.from("stories").delete().in("id", storyIds).select("id");
      removedStoryViews = views?.length ?? 0;
      removedStoryLikes = likes?.length ?? 0;
      removedStories = stories?.length ?? 0;
    }

    const bucketResults: Record<string, { removed: number; bytes: number; errors: string[] }> = {};
    for (const bucket of FILE_BUCKETS) {
      const files = await listAllObjects(bucket);
      const unreferenced = files.filter((file) => !referenced(bucket, file.path));
      const result = await removeObjects(bucket, unreferenced.map((file) => file.path));
      bucketResults[bucket] = {
        removed: result.removed,
        bytes: unreferenced.reduce((sum, file) => sum + file.size, 0),
        errors: result.errors,
      };
    }

    return new Response(JSON.stringify({
      success: true,
      stories: {
        removedFiles: storyRemoval.removed,
        removedBytes: allStoryFiles.reduce((sum, file) => sum + file.size, 0),
        removedRows: removedStories,
        removedViews: removedStoryViews,
        removedLikes: removedStoryLikes,
        errors: storyRemoval.errors,
      },
      unreferencedCache: bucketResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown cleanup error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});