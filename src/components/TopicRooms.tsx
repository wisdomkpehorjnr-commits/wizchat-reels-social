import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TopicRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [posts, setPosts] = useState<any[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const {  { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      loadPosts();
    };
    init();
  }, [roomId]);

  const loadPosts = async () => {
    const {  data } = await supabase
      .from('room_posts')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  };

  const handlePost = async () => {
    if (!mediaFile) {
      toast({ title: "Select image/video", variant: "destructive" });
      return;
    }

    try {
      const filePath = `${Date.now()}_${mediaFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('room-media')
        .upload(filePath, mediaFile);
      if (uploadError) throw uploadError;

      const {  { publicUrl } } = supabase.storage
        .from('room-media')
        .getPublicUrl(filePath);

      const {  { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from('room_posts')
        .insert({
          room_id: roomId,
          user_id: user!.id,
          content: content || null,
          media_url: publicUrl,
        });
      if (insertError) throw insertError;

      toast({ title: "Posted!" });
      setContent('');
      setMediaFile(null);
      (document.getElementById('file') as HTMLInputElement).value = '';
      loadPosts();
    } catch (err) {
      console.error(err);
      toast({ title: "Post failed", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Button onClick={() => navigate('/topics')} className="mb-4">← Back</Button>

      {/* Facebook-style composer */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="border-none focus:ring-0 p-0 min-h-[40px]"
          />
          {mediaFile && <p className="text-sm mt-1">📎 {mediaFile.name}</p>}
          <div className="flex justify-between items-center mt-2">
            <label className="text-sm cursor-pointer">
              📎 Photo/Video
              <Input
                id="file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => e.target.files?.[0] && setMediaFile(e.target.files[0])}
                className="hidden"
              />
            </label>
            <Button onClick={handlePost} disabled={!mediaFile}>
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <p className="font-medium">User</p>
              {post.content && <p className="my-2">{post.content}</p>}
              {post.media_url && (
                <img src={post.media_url} alt="Post" className="w-full mt-2 rounded" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TopicRoom;