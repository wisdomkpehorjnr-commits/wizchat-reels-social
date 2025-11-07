
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Video } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(0);
    
    try {
      let imageUrls: string[] = [];
      let videoUrl = '';
      let mediaType: 'text' | 'image' | 'video' = 'text';
      
      // Upload files in parallel for faster processing
      if (selectedFiles.length > 0) {
        setUploadProgress(10);
        
        const uploadPromises = selectedFiles.map(async (file, index) => {
          try {
            let url: string;
            if (file.type && file.type.startsWith('video/')) {
              url = await MediaService.uploadPostVideo(file);
              return { type: 'video', url };
            } else if (file.type && file.type.startsWith('image/')) {
              url = await MediaService.uploadPostImage(file);
              return { type: 'image', url };
            } else {
              // fallback for any other
              url = await MediaService.uploadPostMedia(file);
              return { type: file.type.startsWith('image/') ? 'image' : 'video', url };
            }
          } catch (error) {
            console.error(`Failed to upload file ${index + 1}:`, error);
            throw new Error(`Failed to upload ${file.name}`);
          }
        });

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 second timeout
        );

        setUploadProgress(30);
        const uploadResults = await Promise.race([
          Promise.all(uploadPromises),
          timeoutPromise
        ]) as any[];
        
        setUploadProgress(70);
        
        // Process results
        for (const result of uploadResults) {
          if (result.type === 'video') {
            videoUrl = result.url;
            mediaType = 'video';
          } else if (result.type === 'image') {
            imageUrls.push(result.url);
            mediaType = 'image';
          }
        }
      }
      
      setUploadProgress(90);
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
      setUploadProgress(95);
      
      if (onPostCreated) {
        await onPostCreated(postData);
      }
      
      setUploadProgress(100);
      setContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Success feedback
      toast({ 
        title: "Success", 
        description: "Post created successfully!",
        duration: 2000
      });
    } catch (error) {
      console.error('Error creating post:', error);
      setUploadProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to create post";
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
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
          
          {/* Preview media grid */}
          {selectedFiles.length > 0 && previewUrls.length > 0 && (
            <div className="mt-3 p-3 border border-border rounded-lg grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewUrls.map((url, idx) => {
                const file = selectedFiles[idx];
                const isVideo = file?.type?.startsWith('video/');
                return (
                  <div key={idx} className="relative">
                    {isVideo ? (
                      <video 
                        src={url} 
                        className="object-cover w-full md:w-32 md:h-32 h-24 rounded"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img 
                        src={url} 
                        alt={`Preview ${idx+1}`}
                        className="object-cover w-full md:w-32 md:h-32 h-24 rounded"
                      />
                    )}
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
                );
              })}
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
                className="text-muted-foreground hover:text-foreground border-2 border-primary rounded p-2 hover:bg-primary/10 transition-colors"
                disabled={isSubmitting}
              >
                <Camera className="w-5 h-5 text-primary" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('file-input')?.click()}
                className="text-muted-foreground hover:text-foreground border-2 border-primary rounded p-2 hover:bg-primary/10 transition-colors"
                disabled={isSubmitting}
              >
                <Video className="w-5 h-5 text-primary" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Posting... {uploadProgress > 0 && `${uploadProgress}%`}</span>
                </div>
              ) : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
