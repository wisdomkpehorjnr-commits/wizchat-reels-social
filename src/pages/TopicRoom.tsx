import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

interface PostType {
  id: string;
  content: string;
  created_at: string;
}

const TopicRoom = () => {
  const { roomId } = useParams();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [newPost, setNewPost] = useState("");

  // Fetch posts from Supabase
  useEffect(() => {
    const loadPosts = async () => {
      const { data, error } = await supabase
        .from("topic_posts")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching posts:", error);
      else setPosts(data || []);
    };
    loadPosts();
  }, [roomId]);

  // Handle new post submission
  const handlePost = async () => {
    if (!newPost.trim()) return;
    const { data, error } = await supabase
      .from("topic_posts")
      .insert([{ room_id: roomId, content: newPost }])
      .select();
    if (error) console.error("Error posting:", error);
    else {
      setPosts([data[0], ...posts]);
      setNewPost("");
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
