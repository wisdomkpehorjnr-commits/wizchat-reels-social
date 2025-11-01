import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { Camera, Video } from "lucide-react";

interface PostType {
  id: string;
  content: string;
  media_url?: string;
  created_at: string;
}

const TopicRoom = () => {
  const { roomId } = useParams();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [newPost, setNewPost] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  // Fetch posts from Supabase
  useEffect(() => {
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from("room_posts")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching posts:", error);
      else setPosts(data || []);
    };
    loadPosts();
    
    // Real-time subscription for new posts
    const channel = supabase
      .channel(`room-posts-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_posts',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setPosts(prev => [payload.new as PostType, ...prev]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Handle new post submission
  const handlePost = async () => {
    if (!newPost.trim() && !mediaFile) return;

    let media_url = null;
    if (mediaFile) {
      const fileExt = mediaFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("room-media")
        .upload(fileName, mediaFile);

      if (error) {
        console.error("Error uploading media:", error);
      } else {
        media_url = supabase.storage.from("room-media").getPublicUrl(fileName).data.publicUrl;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("room_posts")
      .insert([{ room_id: roomId, user_id: user.id, content: newPost, media_url }])
      .select();

    if (error) console.error("Error posting:", error);
    else {
      setPosts([data[0], ...posts]);
      setNewPost("");
      setMediaFile(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Topic Room Heading */}
        <h1 className="text-3xl font-extrabold text-white mb-6">Topic Room</h1>

        {/* Facebook-style Posting Card */}
        <Card className="mb-6 border-2 border-green-500 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-green-700 dark:text-white">
              Create a Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="What's on your mind?"
              className="mb-3 text-black dark:text-white"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />

            {/* Media Upload Buttons */}
            <div className="flex gap-2 mb-3 items-center">
              <label className="cursor-pointer bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && setMediaFile(e.target.files[0])}
                />
              </label>
              <label className="cursor-pointer bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors">
                <Video className="w-5 h-5" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && setMediaFile(e.target.files[0])}
                />
              </label>
              {mediaFile && <span className="text-sm text-gray-700 dark:text-gray-300">{mediaFile.name}</span>}
            </div>

            <Button
              className="bg-green-600 text-white hover:bg-green-700 w-full"
              onClick={handlePost}
            >
              Post
            </Button>
          </CardContent>
        </Card>

        {/* Posts List */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-white dark:text-gray-300">No posts yet. Be the first!</p>
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                className="border-2 border-green-500 bg-white dark:bg-gray-800"
              >
                <CardContent>
                  <p className="text-black dark:text-white">{post.content}</p>
                  {post.media_url && (
                    <>
                      {post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={post.media_url} controls className="mt-2 w-full rounded" />
                      ) : (
                        <img src={post.media_url} alt="post media" className="mt-2 w-full rounded" />
                      )}
                    </>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TopicRoom;
