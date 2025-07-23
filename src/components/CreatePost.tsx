
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Image, Video, Music, Smile } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import { useToast } from '@/components/ui/use-toast';
import { Post } from '@/types';

interface CreatePostProps {
  onPostCreated?: (newPost: Post) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isReel, setIsReel] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setVideoFile(null); // Clear video if image is selected
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setImageFile(null); // Clear image if video is selected
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile) return;

    setLoading(true);
    try {
      let imageUrl = '';
      let videoUrl = '';

      // Upload media files if present
      if (imageFile) {
        imageUrl = await MediaService.uploadPostImage(imageFile);
      }

      if (videoFile) {
        videoUrl = await MediaService.uploadPostVideo(videoFile);
      }

      // Determine media type
      let mediaType: 'text' | 'image' | 'video' = 'text';
      if (imageFile) mediaType = 'image';
      if (videoFile) mediaType = 'video';

      const newPost = await dataService.createPost({
        content,
        imageFile,
        videoFile,
        mediaType,
        isReel
      });

      // Update the post with actual URLs
      if (imageUrl || videoUrl) {
        const updatedPost = { ...newPost, imageUrl, videoUrl };
        onPostCreated?.(updatedPost);
      } else {
        onPostCreated?.(newPost);
      }

      // Reset form
      setContent('');
      setImageFile(null);
      setVideoFile(null);
      setIsReel(false);

      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="backdrop-blur-md bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Create Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Header */}
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-sm text-white/60">@{user.username}</p>
            </div>
          </div>

          {/* Content Input */}
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
            rows={3}
          />

          {/* Media Preview */}
          {imageFile && (
            <div className="relative">
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setImageFile(null)}
              >
                Remove
              </Button>
            </div>
          )}

          {videoFile && (
            <div className="relative">
              <video
                src={URL.createObjectURL(videoFile)}
                className="w-full h-48 object-cover rounded-lg"
                controls
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setVideoFile(null)}
              >
                Remove
              </Button>
            </div>
          )}

          {/* Reel Toggle */}
          {videoFile && (
            <div className="flex items-center space-x-2">
              <Switch
                id="reel"
                checked={isReel}
                onCheckedChange={setIsReel}
              />
              <Label htmlFor="reel" className="text-white">Post as Reel</Label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button type="button" variant="ghost" size="sm" className="text-white/60">
                <label htmlFor="image-upload" className="cursor-pointer flex items-center">
                  <Image className="w-4 h-4 mr-1" />
                  Photo
                </label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </Button>

              <Button type="button" variant="ghost" size="sm" className="text-white/60">
                <label htmlFor="video-upload" className="cursor-pointer flex items-center">
                  <Video className="w-4 h-4 mr-1" />
                  Video
                </label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </Button>

              <Button type="button" variant="ghost" size="sm" className="text-white/60">
                <Music className="w-4 h-4 mr-1" />
                Music
              </Button>

              <Button type="button" variant="ghost" size="sm" className="text-white/60">
                <Smile className="w-4 h-4 mr-1" />
                Emoji
              </Button>
            </div>

            <Button 
              type="submit" 
              disabled={loading || (!content.trim() && !imageFile && !videoFile)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
