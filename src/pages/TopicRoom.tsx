import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, Video, X, RefreshCw } from "lucide-react";
import RoomPostCard from '@/components/RoomPostCard';

interface PostType {
  id: string;
  content: string;
  image_url?: string;
  video_url?: string;
  media_url?: string;
  media_type?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  user?: any;
}

const TopicRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (roomId && user?.id) {
      // Ensure user is a participant when entering the room
      const ensureParticipant = async () => {
        try {
          await supabase
            .from('room_participants')
            .upsert({
              room_id: roomId,
              user_id: user.id,
              joined_at: new Date().toISOString()
            }, {
              onConflict: 'room_id,user_id'
            });
        } catch (err) {
          console.warn('Error ensuring participant status:', err);
        }
      };
      
      ensureParticipant();
      loadRoom();
      loadPosts();
      
      const channel = supabase
        .channel(`room_posts:${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'room_posts',
          filter: `room_id=eq.${roomId}`
        }, async (payload) => {
          const newPost = payload.new as PostType;
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newPost.user_id)
            .single();
          
          // Only add if it's not already in the list
          setPosts(prev => {
            const exists = prev.some(p => p.id === newPost.id);
            if (exists) return prev;
            
            // Remove any duplicate or temp posts with matching content
            const filtered = prev.filter(
              p => p.id !== newPost.id && (typeof p.id !== 'string' || !p.id.startsWith('temp-') || p.content !== newPost.content)
            );
            return [{ ...newPost, user: profile || null }, ...filtered];
          });
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    } else if (roomId) {
      loadRoom();
      loadPosts();
    }
  }, [roomId, user?.id]);

  const loadRoom = async () => {
    const { data } = await supabase.from('topic_rooms').select('name').eq('id', roomId).single();
    if (data) setRoomName(data.name);
  };

  const loadPosts = async () => {
    setRefreshing(true);
    try {
      // Fix: Use correct foreign key relationship syntax
      const { data, error } = await supabase
        .from('room_posts')
        .select(`
          *,
          profiles!room_posts_user_id_fkey (
            id,
            name,
            username,
            email,
            avatar,
            photoURL:avatar
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Fallback: Try alternative query syntax
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('room_posts')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          toast({ title: 'Refresh failed', description: fallbackError.message, variant: 'destructive' });
          return;
        }
        
        // Manually fetch profiles for each post
        const postsWithUsers = await Promise.all(
          (fallbackData || []).map(async (post: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', post.user_id)
              .single();
            return { ...post, user: profile || null };
          })
        );
        
        setPosts(postsWithUsers.filter((p:any) => !(typeof p.id === 'string' && p.id.startsWith('temp-'))));
      } else {
        // Map the data to include user properly
        const mappedPosts = (data || []).map((post: any) => ({
          ...post,
          user: post.profiles || null
        }));
        setPosts(mappedPosts.filter((p:any) => !(typeof p.id === 'string' && p.id.startsWith('temp-'))));
      }
      
      if (!error) {
        toast({ title: 'Refreshed', description: 'Room feed is up to date' });
      }
    } catch (err: any) {
      console.error('Error loading posts:', err);
      toast({ title: 'Refresh failed', description: err.message || 'Failed to load posts', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileSelect = (file: File, type: 'image' | 'video') => {
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaFile) return;
    setUploading(true);

    try {
      let mediaUrl = null;
      if (mediaFile) {
        const fileName = `${Date.now()}.${mediaFile.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("room-media").upload(fileName, mediaFile);
        if (!error) mediaUrl = supabase.storage.from("room-media").getPublicUrl(fileName).data.publicUrl;
      }

      // Optimistic update - create temporary post
      const tempPost: PostType = {
        id: `temp-${Date.now()}`,
        content,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        [mediaType === 'image' ? 'image_url' : 'video_url']: mediaUrl || undefined,
        media_type: mediaType || 'text',
        user: user ? {
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          username: user.username || '',
          avatar: user.photoURL || '',
        } : undefined
      };

      // Add optimistic post to the top of the list immediately
      setPosts(prev => [tempPost, ...prev]);
      
      // Scroll to top to show the new post immediately
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 10);
      
      // Flash effect after post appears (boom effect)
      setTimeout(() => {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);
      }, 50);

      // Ensure user is a participant (required by RLS policies)
      if (user?.id && roomId) {
        const { error: participantError } = await supabase
          .from('room_participants')
          .upsert({
            room_id: roomId,
            user_id: user.id,
            joined_at: new Date().toISOString()
          }, {
            onConflict: 'room_id,user_id'
          });
        
        if (participantError) {
          console.warn('Error ensuring participant status:', participantError);
        }
      }

      // Insert actual post
      const { data, error } = await supabase
        .from("room_posts")
        .insert([{
          room_id: roomId,
          user_id: user?.id,
          content: content.trim(),
          [mediaType === 'image' ? 'image_url' : 'video_url']: mediaUrl,
          media_type: mediaType || 'text'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      // Replace temporary post with real one
      if (data && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setPosts(prev => prev.map(p => 
            p.id === tempPost.id ? { ...data, user: profile } : p
          ));
        } else {
          // If profile fetch fails, still update with user data
          setPosts(prev => prev.map(p => 
            p.id === tempPost.id ? { ...data, user: tempPost.user } : p
          ));
        }
      }

      setContent('');
      clearMedia();
      
      // Show success toast after a brief delay
      setTimeout(() => {
        toast({ title: "Success! 🎉", description: "Post created successfully" });
      }, 500);
    } catch (error) {
      console.error('Error:', error);
      // Remove optimistic post on error
      setPosts(prev => prev.filter(p => !p.id.startsWith('temp-')));
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      {showFlash && (
        <div className="fixed inset-0 bg-white dark:bg-black pointer-events-none z-50 opacity-30 animate-in fade-in-0 duration-200" />
      )}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Topic Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{roomName || 'Topic Room'}</h1>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPosts}
                className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                aria-label="Refresh room"
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5${refreshing ? ' animate-spin' : ''}`} /> 
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/topics')}
                className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                aria-label="Exit"
              >
                <ArrowLeft className="w-5 h-5" /> 
                <span className="hidden sm:inline">Exit</span>
              </Button>
            </div>
          </div>

          {/* Create Post Card */}
          <Card className="border-2 border-green-500 bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Create a Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="What's on your mind?" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                className="min-h-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" 
              />

              {mediaPreview && (
                <div className="relative">
                  {mediaType === 'image' ? (
                    <img src={mediaPreview} alt="Preview" className="w-full max-h-[300px] object-cover rounded-lg border-2 border-green-500" />
                  ) : (
                    <video src={mediaPreview} controls className="w-full max-h-[300px] rounded-lg border-2 border-green-500" />
                  )}
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2" 
                    onClick={clearMedia}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => { 
                      const input = document.createElement('input'); 
                      input.type = 'file'; 
                      input.accept = 'image/*'; 
                      input.onchange = (e) => { 
                        const file = (e.target as HTMLInputElement).files?.[0]; 
                        if (file) handleFileSelect(file, 'image'); 
                      }; 
                      input.click(); 
                    }} 
                    title="Upload Image"
                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => { 
                      const input = document.createElement('input'); 
                      input.type = 'file'; 
                      input.accept = 'video/*'; 
                      input.onchange = (e) => { 
                        const file = (e.target as HTMLInputElement).files?.[0]; 
                        if (file) handleFileSelect(file, 'video'); 
                      }; 
                      input.click(); 
                    }} 
                    title="Upload Video"
                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={handlePost} 
                  disabled={(!content.trim() && !mediaFile) || uploading} 
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                >
                  {uploading ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card className="border-2 border-green-500 bg-white dark:bg-gray-800">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">No posts yet. Be the first to post!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <RoomPostCard 
                  key={post.id} 
                  post={{
                    id: post.id,
                    user_id: post.user_id,
                    content: post.content,
                    image_url: post.image_url || post.media_url,
                    video_url: post.video_url,
                    media_type: post.media_type || 'text',
                    created_at: post.created_at,
                    updated_at: post.updated_at || post.created_at,
                    user: post.user
                  }} 
                  onPostUpdate={loadPosts} 
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TopicRoom;
