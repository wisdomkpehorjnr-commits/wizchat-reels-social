
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import { Image, Video, Music, X, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CreatePost: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isReel, setIsReel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;
    
    setIsSubmitting(true);
    
    try {
      let mediaUrl = '';
      let finalMediaType: 'text' | 'image' | 'video' = 'text';
      
      if (mediaFile) {
        mediaUrl = await MediaService.uploadPostMedia(mediaFile);
        finalMediaType = MediaService.getMediaType(mediaFile);
      }

      const postData = {
        content: content.trim(),
        mediaType: finalMediaType,
        isReel: isReel && finalMediaType === 'video'
      };

      // Create post in database
      await dataService.createPost(postData);

      // Update the post with media URL if we have one
      if (mediaUrl) {
        // We'll need to update the dataService to handle media URLs
        console.log('Media uploaded:', mediaUrl);
      }

      // Reset form
      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      setIsReel(false);
      setIsOpen(false);

      toast({
        title: "Post created!",
        description: "Your post has been shared successfully.",
      });

      // Refresh the page to show new post
      window.location.reload();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaSelect = (file: File) => {
    setMediaFile(file);
    setMediaType(MediaService.getMediaType(file));
    
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMediaSelect(file);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMediaSelect(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setIsReel(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  if (!user) return null;

  return (
    <>
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="flex space-x-3">
            <Avatar>
              <AvatarImage src={user.photoURL} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Button
                variant="outline"
                className="w-full justify-start text-left backdrop-blur-sm bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
                onClick={() => setIsOpen(true)}
              >
                What's on your mind, {user.name}?
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl backdrop-blur-md bg-white/90 dark:bg-black/90">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start space-x-3">
              <Avatar>
                <AvatarImage src={user.photoURL} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none border-none bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0"
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative">
                {mediaType === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full max-h-80 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-80 rounded-lg"
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeMedia}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Reel Option */}
            {mediaType === 'video' && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="reel-toggle">Share as Reel</Label>
                  <p className="text-sm text-muted-foreground">
                    Reels are short, engaging videos that appear in the Reels feed
                  </p>
                </div>
                <Switch
                  id="reel-toggle"
                  checked={isReel}
                  onCheckedChange={setIsReel}
                />
              </div>
            )}

            {/* Media Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled>
                  <Music className="w-4 h-4 mr-2" />
                  Music
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || (!content.trim() && !mediaFile)}
                >
                  {isSubmitting ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
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
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreatePost;
