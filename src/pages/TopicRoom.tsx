import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Image as ImageIcon, Video } from 'lucide-react';

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
    const {  { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (!user) {
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
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('room-media')
        .upload(filePath, mediaFile, {
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload media');
      }

      const {  { publicUrl } } = supabase.storage
        .from('room-media')
        .getPublicUrl(filePath);

      // Save post
      const { error: postError } = await supabase
        .from('room_posts')
        .insert({
          room_id: roomId,
          user_id: currentUser.id,
          content: postText.trim() || null,
          media_url: publicUrl,
        });

      if (postError) {
        console.error('Post insert error:', postError);
        throw new Error('Failed to save post');
      }

      toast({ title: "Post created!", duration: 2000 });
      setMediaFile(null);
      setPostText('');
      (document.getElementById('media-input') as HTMLInputElement).value = '';
      await loadPosts();
    } catch (error) {
      console.error('Full post error:', error);
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
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

  if (loading) return <div className="p-4">Loading...</div>;
  if (!room) return null;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/topics')} className="mb-4">
        ← Back to Topics
      </Button>

      {/* Facebook-style composer */}
      <Card className="mb-4 border border-input rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {currentUser?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="What's on your mind?"
                className="border-none shadow-none resize-none min-h-[40px] focus-visible:ring-0 p-0"
              />
              {mediaFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {mediaFile.name}
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <label className="flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:text-primary">
                  <ImageIcon className="w-4 h-4" />
                  Photo/Video
                  <Input
                    id="media-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!mediaFile}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{post.profiles?.username || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
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
              {post.content && <p className="my-2 text-sm">{post.content}</p>}
              {post.media_url && (
                <div className="mt-2 rounded">
                  {post.media_url.includes('video') ? (
                    <video src={post.media_url} controls className="w-full max-h-96 object-contain" />
                  ) : (
                    <img src={post.media_url} alt="Post" className="w-full max-h-96 object-contain rounded" />
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