import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2 } from 'lucide-react';

const TopicRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [postText, setPostText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [roomId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (!user) {
      toast({ title: "Please log in", variant: "destructive" });
      navigate('/login');
      return;
    }
    await loadRoom();
    await loadPosts();
    setLoading(false);
  };

  const loadRoom = async () => {
    const { data, error } = await supabase
      .from('topic_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    if (error || !data) {
      toast({ title: "Room not found", variant: "destructive" });
      navigate('/topics');
      return;
    }
    setRoom(data);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('room_posts')
      .select(`
        *,
        profiles!inner(username)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (!error) setPosts(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setMediaFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) {
      toast({ title: "Please select an image or video", variant: "destructive" });
      return;
    }

    try {
      // Upload to Supabase Storage
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('room-media')
        .upload(filePath, mediaFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('room-media')
        .getPublicUrl(filePath);

      // Insert post
      const { error: postError } = await supabase
        .from('room_posts')
        .insert({
          room_id: roomId,
          user_id: currentUser.id,
          content: postText,
          media_url: publicUrl,
        });

      if (postError) throw postError;

      toast({ title: "Post created!", duration: 2000 });
      setMediaFile(null);
      setPostText('');
      (document.getElementById('media-input') as HTMLInputElement).value = '';
      await loadPosts(); // refresh feed
    } catch (error) {
      console.error('Post error:', error);
      toast({ title: "Failed to create post", variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: number) => {
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

  if (loading) return <div className="p-4">Loading room...</div>;
  if (!room) return null;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/topics')} className="mb-4">
        ← Back to Topics
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{room.name}</CardTitle>
          <p className="text-muted-foreground">{room.description}</p>
        </CardHeader>
      </Card>

      {/* Post Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Share Media</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Add a caption..."
            />
            <Input
              id="media-input"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <Button type="submit" className="w-full">
              <Upload className="w-4 h-4 mr-2" /> Post
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{post.profiles?.username || 'User'}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
                {post.user_id === currentUser.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              {post.content && <p className="my-2">{post.content}</p>}
              {post.media_url && (
                <div className="mt-2">
                  {post.media_url.includes('video') ? (
                    <video src={post.media_url} controls className="w-full rounded" />
                  ) : (
                    <img src={post.media_url} alt="Post media" className="w-full rounded" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No posts yet. Be the first!</p>
        )}
      </div>
    </div>
  );
};

export default TopicRoom;