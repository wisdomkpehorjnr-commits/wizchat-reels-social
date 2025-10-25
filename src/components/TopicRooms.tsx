// src/pages/TopicRoom.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function TopicRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePost = async () => {
    if (!mediaFile) {
      toast({ title: "Please select an image or video", variant: "destructive" });
      return;
    }

    try {
      const {  { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Upload to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${mediaFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('room-media')
        .upload(filePath, mediaFile);
      if (uploadErr) throw uploadErr;

      const {  { publicUrl } } = supabase.storage
        .from('room-media')
        .getPublicUrl(filePath);

      // Save to DB
      const { error: dbErr } = await supabase
        .from('room_posts')
        .insert({ room_id: roomId, user_id: user.id, content: content || null, media_url: publicUrl });
      if (dbErr) throw dbErr;

      toast({ title: "Posted!" });
      setContent('');
      setMediaFile(null);
      (document.getElementById('file') as HTMLInputElement).value = '';
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to post", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Button onClick={() => navigate('/topics')} className="mb-4">← Back to Topics</Button>

      <Card>
        <CardContent className="p-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="mb-3"
          />
          <Input
            id="file"
            type="file"
            accept="image/*,video/*"
            onChange={(e) => e.target.files?.[0] && setMediaFile(e.target.files[0])}
            className="mb-3"
          />
          <Button onClick={handlePost} disabled={!mediaFile}>Post</Button>
        </CardContent>
      </Card>
    </div>
  );
}