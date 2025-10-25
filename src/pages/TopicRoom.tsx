import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2 } from 'lucide-react';

const TopicRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomName, setRoomName] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [roomId]);

  const init = async () => {
    const {  { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');
    setCurrentUser(user);

    // Load room name
    const {  room } = await supabase
      .from('topic_rooms')
      .select('name')
      .eq('id', roomId)
      .single();
    if (room) setRoomName(room.name);

    loadPosts();
  };

  const loadPosts = async () => {
    const {  posts } = await supabase
      .from('room_posts')
      .select(`
        id,
        content,
        media_url,
        created_at,
        user_id,
        profiles!inner(username)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });
    setPosts(posts || []);
  };

  const handlePost = async () => {
    if (!mediaFile) {
      toast({ title: "Please select an image or video", variant: "destructive" });
      return;
    }

    try {
      // Upload file
      const fileExt = mediaFile.name.split('.').pop();
      const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('room-media')
        .upload(filePath, mediaFile);

      if (uploadError) throw uploadError;

      const {  { publicUrl } } = supabase.storage
        .from('room-media')
        .getPublicUrl(filePath);

      // Save post
      const { error: insertError } = await supabase
        .from('room_posts')
        .insert({
          room_id: roomId,
          user_id: currentUser.id,
          content: content.trim() || null,
          media_url: publicUrl,
        });

      if (insertError) throw insertError;

      toast({ title: "Posted!", duration: 2000 });
      setContent('');
      setMediaFile(null);
      (document.getElementById('file-input') as HTMLInputElement).value = '';
      loadPosts(); // refresh
    } catch (err) {
      console.error('Post error:', err);
      toast({ title: "Failed to post", variant: "destructive" });
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase
      .from('room_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', currentUser.id);
    if (!error) {
      setPosts(posts.filter(p => p.id !== postId));
      toast({ title: "Deleted", duration: 2000 });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/topics')} className="mb-4">
        ← Back to Topics
      </Button>

      {/* Facebook-style composer */}
      <Card className="mb-4 border rounded-lg shadow-none">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {currentUser?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full border-none shadow-none resize-none p-0 focus:ring-0 min-h-[40px]"
              />
              {mediaFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  📎 {mediaFile.name}
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center text-sm text-muted-foreground cursor-pointer">
                  <Upload className="w-4 h-4 mr-1" />
                  Photo/Video
                  <Input
                    id="file-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => e.target.files?.[0] && setMediaFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={!mediaFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{post.profiles?.username || 'User'}</p>
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
                <div className="mt-2">
                  {post.media_url.includes('video') ? (
                    <video src={post.media_url} controls className="w-full rounded" />
                  ) : (
                    <img src={post.media_url} alt="Post" className="w-full rounded" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No posts yet.</p>
        )}
      </div>
    </div>
  );
};

export default TopicRoom;