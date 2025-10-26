// src/pages/TopicRoom.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function TopicRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [posts, setPosts] = useState<any[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigate("/login");
          return;
        }
        setCurrentUser(data.user);
        await loadPosts();
      } catch (err) {
        console.error("Error loading user:", err);
      }
    };
    init();
  }, [roomId]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("room_posts")
        .select(`
          *,
          profiles!inner(username)
        `)
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error("Error loading posts:", err);
      toast({ title: "Failed to load posts", variant: "destructive" });
    }
  };

  const handlePost = async () => {
    if (!mediaFile) {
      toast({ title: "Select an image or video", variant: "destructive" });
      return;
    }

    try {
      const filePath = `${currentUser.id}/${Date.now()}_${mediaFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("room-media")
        .upload(filePath, mediaFile);

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from("room-media")
        .getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;

      const { error: dbErr } = await supabase.from("room_posts").insert({
        room_id: roomId,
        user_id: currentUser.id,
        content: content.trim() || null,
        media_url: publicUrl,
      });

      if (dbErr) throw dbErr;

      toast({ title: "Posted successfully!" });
      setContent("");
      setMediaFile(null);
      const fileInput = document.getElementById("file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadPosts();
    } catch (err) {
      console.error("Post creation failed:", err);
      toast({ title: "Post failed", variant: "destructive" });
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("Delete this post?")) return;

    try {
      const { error } = await supabase
        .from("room_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast({ title: "Deleted", duration: 2000 });
    } catch (err) {
      console.error("Delete failed:", err);
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Button onClick={() => navigate("/topics")} className="mb-4">
        ← Back to Topics
      </Button>

      {/* Post form */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="mb-3 min-h-[60px] border-none focus:ring-0 p-0"
          />
          <Input
            id="file"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setMediaFile(e.target.files[0]);
              }
            }}
            className="mb-3"
          />
          <Button
            onClick={handlePost}
            disabled={!mediaFile}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Post
          </Button>
        </CardContent>
      </Card>

      {/* Posts list */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {post.profiles?.username || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
                {post.user_id === currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              {post.content && <p className="my-2 text-sm">{post.content}</p>}

              {post.media_url && (
                <div className="mt-2 rounded">
                  {post.media_url.endsWith(".mp4") ||
                  post.media_url.includes("video") ? (
                    <video
                      src={post.media_url}
                      controls
                      className="w-full max-h-96 object-contain rounded"
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt="Post media"
                      className="w-full max-h-96 object-contain rounded"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {posts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No posts yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
