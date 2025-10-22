
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length) {
      // Append instead of replace. Prevent duplicates by name + size.
      const newFiles = files.filter(f => !selectedFiles.some(sel => sel.name === f.name && sel.size === f.size));
      const allFiles = [...selectedFiles, ...newFiles];
      setSelectedFiles(allFiles);
      setPreviewUrls(allFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please add some content or select a file",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrls: string[] = [];
      let videoUrl = '';
      let mediaType: 'text' | 'image' | 'video' = 'text';
      // Only handle images as multiple. Videos remain single upload.
      for (const file of selectedFiles) {
        if (file.type && file.type.startsWith('video/')) {
          videoUrl = await MediaService.uploadPostVideo(file);
          mediaType = 'video';
        } else if (file.type && file.type.startsWith('image/')) {
          const url = await MediaService.uploadPostImage(file);
          imageUrls.push(url);
          mediaType = 'image';
        } else {
          // fallback for any other (should normally not happen)
          const url = await MediaService.uploadPostMedia(file);
          if (file.type.startsWith('image/')) imageUrls.push(url);
          if (file.type.startsWith('video/')) videoUrl = url;
        }
      }
      const postData = {
        content: content.trim(),
        imageUrls: mediaType === 'image' ? imageUrls : undefined,
        videoUrl: mediaType === 'video' ? videoUrl : undefined,
        mediaType,
        isReel: mediaType === 'video',
      };
      console.log('Creating post with data:', postData);
      console.log('Selected files:', selectedFiles);
      console.log('Image URLs:', imageUrls);
      if (onPostCreated) {
        await onPostCreated(postData);
      }
      setContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      toast({ title: "Success", description: "Post created successfully!" });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
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
          
          {/* Preview images grid */}
          {selectedFiles.length > 0 && previewUrls.length > 0 && (
            <div className="mt-3 p-3 border border-border rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img 
                    src={url} 
                    alt={`Preview ${idx+1}`}
                    className="object-cover w-full md:w-32 md:h-32 h-24 rounded"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newFiles = selectedFiles.filter((_, i) => i !== idx);
                      const newUrls = previewUrls.filter((_, i) => i !== idx);
                      setSelectedFiles(newFiles);
                      setPreviewUrls(newUrls);
                    }}
                    className="absolute top-1 right-1 text-xs bg-white/80"
                  >Remove</Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="file-input"
                type="file"
                accept="image/*,video/*"
                multiple
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
              disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
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
