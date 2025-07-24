
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Image, Video, Mic, Music, MapPin, Hash, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { MediaService } from '@/services/mediaService';

const CreatePost = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReel, setIsReel] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() && !selectedImage && !selectedVideo) {
      toast({
        title: "Error",
        description: "Please add some content to your post",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let mediaType: 'text' | 'image' | 'video' = 'text';
      
      if (selectedVideo) {
        mediaType = 'video';
      } else if (selectedImage) {
        mediaType = 'image';
      }

      await dataService.createPost({
        content,
        imageFile: selectedImage,
        videoFile: selectedVideo,
        mediaType,
        isReel
      });

      setContent('');
      setSelectedImage(null);
      setSelectedVideo(null);
      setIsReel(false);
      
      toast({
        title: "Success",
        description: "Post created successfully!"
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setSelectedVideo(null);
    }
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedVideo(file);
      setSelectedImage(null);
    }
  };

  if (!user) return null;

  return (
    <Card className="border-2 green-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">Create Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-muted text-foreground">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="border-2 green-border bg-background text-foreground resize-none min-h-[100px]"
            />
          </div>
        </div>

        {selectedImage && (
          <div className="relative">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="Selected" 
              className="w-full h-48 object-cover rounded-lg border-2 green-border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {selectedVideo && (
          <div className="relative">
            <video 
              src={URL.createObjectURL(selectedVideo)} 
              controls 
              className="w-full h-48 object-cover rounded-lg border-2 green-border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setSelectedVideo(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="border-2 green-border text-foreground"
            >
              <Image className="w-4 h-4 mr-1" />
              Photo
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              className="border-2 green-border text-foreground"
            >
              <Video className="w-4 h-4 mr-1" />
              Video
            </Button>
            
            {selectedVideo && (
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={isReel ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setIsReel(!isReel)}
                >
                  Reel
                </Badge>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || (!content.trim() && !selectedImage && !selectedVideo)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? 'Posting...' : 'Post'}
          </Button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};

export default CreatePost;
