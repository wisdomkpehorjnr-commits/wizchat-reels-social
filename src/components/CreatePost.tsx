
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Video, Smile, MapPin, Hash, AtSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MediaService } from '@/services/mediaService';

interface CreatePostProps {
  onPostCreated?: (postData: any) => void;
  placeholder?: string;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated, placeholder = "What's on your mind?" }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !selectedFile) {
      toast({
        title: "Error",
        description: "Please add some content or select a file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      let mediaUrl = '';
      let mediaType: 'text' | 'image' | 'video' = 'text';
      
      if (selectedFile) {
        const uploadResult = await MediaService.uploadPostMedia(selectedFile);
        mediaUrl = uploadResult;
        mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      }

      const postData = {
        content: content.trim(),
        imageUrl: mediaType === 'image' ? mediaUrl : undefined,
        videoUrl: mediaType === 'video' ? mediaUrl : undefined,
        mediaType,
      };

      if (onPostCreated) {
        await onPostCreated(postData);
      }

      // Reset form
      setContent('');
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="border-2 green-border bg-card">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.photoURL} />
              <AvatarFallback className="text-foreground">{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="min-h-[100px] resize-none border-none focus:ring-0 text-foreground placeholder:text-muted-foreground bg-transparent"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {selectedFile && (
            <div className="mt-3 p-3 border border-border rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {selectedFile.type.startsWith('image/') ? (
                  <Camera className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                <span>{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="file-input"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('file-input')?.click()}
                className="text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('file-input')?.click()}
                className="text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                <Video className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                <Smile className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={(!content.trim() && !selectedFile) || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
