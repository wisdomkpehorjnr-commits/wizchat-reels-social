
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bold, Camera, Italic, Palette, Plus, Send, Type, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MediaService } from '@/services/mediaService';
import type { PostTextStyle } from '@/types';
import { POST_TEXT_FONT_FAMILIES } from '@/lib/postTextStyle';
import './social-glass.css';

interface CreatePostProps {
  onPostCreated?: (postData: any) => void;
  placeholder?: string;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated, placeholder = "What's on your mind?" }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [textStyle, setTextStyle] = useState<PostTextStyle>({});
  const [showFormatting, setShowFormatting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length) {
      const video = files.find(file => file.type?.startsWith('video/'));
      if (video) {
        if (video.size > MediaService.MAX_VIDEO_BYTES) {
          toast({ title: 'Video too large', description: 'Reels must be under 25MB.', variant: 'destructive' });
          event.target.value = '';
          return;
        }
        setSelectedFiles([]);
        setPreviewUrls([]);
        setVideoFile(video);
        setVideoPreview(URL.createObjectURL(video));
        event.target.value = '';
        return;
      }
      // Append instead of replace. Prevent duplicates by name + size.
      const imageFiles = files.filter(f => f.type?.startsWith('image/'));
      const newFiles = imageFiles.filter(f => !selectedFiles.some(sel => sel.name === f.name && sel.size === f.size));
      let allFiles = [...selectedFiles, ...newFiles];
      if (allFiles.length > 15) {
        allFiles = allFiles.slice(0, 15);
        toast({ title: 'Up to 15 photos', description: 'Only the first 15 photos were added.' });
      }
      setSelectedFiles(allFiles);
      setPreviewUrls(allFiles.map(f => URL.createObjectURL(f)));
      if (imageFiles.length) { setVideoFile(null); setVideoPreview(null); }
      event.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedFiles.length === 0 && !videoFile) {
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
      let mediaType: 'text' | 'image' | 'video' = 'text';
      let videoUrl: string | undefined;

      // Reel / video upload
      if (videoFile) {
        setUploadProgress(20);
        videoUrl = await MediaService.uploadPostVideo(videoFile);
        mediaType = 'video';
        setUploadProgress(80);
      }

      // Upload files in parallel for faster processing
      if (selectedFiles.length > 0) {
        setUploadProgress(10);
        const uploadPromises = selectedFiles.map(async (file, index) => {
          try {
            let url: string;
            if (file.type && file.type.startsWith('image/')) {
              url = await MediaService.uploadPostImage(file);
              return { type: 'image', url };
            } else {
              throw new Error('Only image uploads are allowed right now.');
            }
          } catch (error) {
            console.error(`Failed to upload file ${index + 1}:`, error);
            throw new Error(`Failed to upload ${file.name}`);
          }
        });

        setUploadProgress(30);
        const uploadResults = await Promise.all(uploadPromises);
        setUploadProgress(70);

        for (const result of uploadResults) {
          if (result.type === 'image') {
            imageUrls.push(result.url);
            mediaType = 'image';
          }
        }
      }

      setUploadProgress(90);
      const postData = {
        content: content.trim(),
        imageUrls: mediaType === 'image' ? imageUrls : undefined,
        videoUrl,
        mediaType,
        isReel: mediaType === 'video',
        textStyle: mediaType === 'text' ? textStyle : undefined,
      };
      setUploadProgress(95);

      if (onPostCreated) {
        await onPostCreated(postData);
      }

      setUploadProgress(100);
      setContent('');
      setTextStyle({});
      setShowFormatting(false);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setVideoFile(null);
      setVideoPreview(null);

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
    <Card className="create-post-glass">
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.photoURL} />
              <AvatarFallback className="text-foreground">{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="create-post-text-surface rounded-2xl p-3 transition-colors">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setShowFormatting(true)}
                  placeholder={placeholder}
                  className="min-h-[100px] resize-none border-none focus:ring-0 placeholder:text-muted-foreground bg-transparent"
                  style={{
                    color: textStyle.textColor,
                    backgroundColor: textStyle.backgroundColor || 'transparent',
                    fontFamily: textStyle.fontFamily ? POST_TEXT_FONT_FAMILIES[textStyle.fontFamily] : undefined,
                    fontWeight: textStyle.bold ? 700 : 400,
                    fontStyle: textStyle.italic ? 'italic' : 'normal',
                  }}
                  disabled={isSubmitting}
                />
              </div>
              {showFormatting && (
                <div className="create-post-format-toolbar mt-2 flex flex-wrap items-center gap-1.5 rounded-2xl p-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="create-post-action h-9 gap-2 rounded-xl px-2.5" aria-label="Choose font style">
                        <Type className="h-4 w-4" />
                        <span className="text-xs">Font</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="create-post-picker-glass w-56 p-2">
                      <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Font style</p>
                      {([
                        ['system', 'System'],
                        ['serif', 'Serif'],
                        ['rounded', 'Rounded'],
                        ['mono', 'Monospace'],
                        ['cursive', 'Handwritten'],
                      ] as const).map(([font, label]) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setTextStyle(previous => ({ ...previous, fontFamily: font }))}
                          className="w-full rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-accent"
                          style={{ fontFamily: POST_TEXT_FONT_FAMILIES[font] }}
                        >
                          {label}{textStyle.fontFamily === font ? ' ✓' : ''}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="create-post-action h-9 gap-2 rounded-xl px-2.5" aria-label="Choose text color">
                        <Palette className="h-4 w-4" />
                        <span className="text-xs">Text</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="create-post-picker-glass w-64 space-y-3">
                      <label className="flex items-center justify-between text-sm font-medium text-foreground">
                        Text color
                        <input
                          type="color"
                          aria-label="Choose text color"
                          value={textStyle.textColor || '#111827'}
                          onChange={event => setTextStyle(previous => ({ ...previous, textColor: event.target.value }))}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                        />
                      </label>
                      <div className="grid grid-cols-8 gap-1.5">
                        {['#111827', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#78716c', '#64748b'].map(color => (
                          <button key={color} type="button" aria-label={`Set text color ${color}`} onClick={() => setTextStyle(previous => ({ ...previous, textColor: color }))} className="h-6 w-6 rounded-full border border-foreground/20" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <button type="button" onClick={() => setTextStyle(previous => ({ ...previous, textColor: undefined }))} className="text-xs font-medium text-primary">Use theme text color</button>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="create-post-action h-9 gap-2 rounded-xl px-2.5" aria-label="Choose background color">
                        <span className="h-4 w-4 rounded border border-foreground/30" style={{ backgroundColor: textStyle.backgroundColor || 'hsl(var(--card) / 0.6)' }} />
                        <span className="text-xs">Background</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="create-post-picker-glass w-64 space-y-3">
                      <label className="flex items-center justify-between text-sm font-medium text-foreground">
                        Background color
                        <input
                          type="color"
                          aria-label="Choose background color"
                          value={textStyle.backgroundColor || '#d1fae5'}
                          onChange={event => setTextStyle(previous => ({ ...previous, backgroundColor: event.target.value }))}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                        />
                      </label>
                      <div className="grid grid-cols-8 gap-1.5">
                        {['#ffffff', '#fef3c7', '#ffedd5', '#fee2e2', '#fce7f3', '#ede9fe', '#dbeafe', '#cffafe', '#ccfbf1', '#d1fae5', '#ecfccb', '#f1f5f9', '#1f2937', '#7f1d1d', '#312e81', '#064e3b'].map(color => (
                          <button key={color} type="button" aria-label={`Set background color ${color}`} onClick={() => setTextStyle(previous => ({ ...previous, backgroundColor: color }))} className="h-6 w-6 rounded-full border border-foreground/20" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <button type="button" onClick={() => setTextStyle(previous => ({ ...previous, backgroundColor: undefined }))} className="text-xs font-medium text-primary">Use blurred glass</button>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Bold"
                    aria-pressed={Boolean(textStyle.bold)}
                    onClick={() => setTextStyle(previous => ({ ...previous, bold: !previous.bold }))}
                    className={`create-post-action h-9 w-9 rounded-xl p-0 ${textStyle.bold ? 'bg-primary/15 text-primary' : ''}`}
                  ><Bold className="h-4 w-4" /></Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Italic"
                    aria-pressed={Boolean(textStyle.italic)}
                    onClick={() => setTextStyle(previous => ({ ...previous, italic: !previous.italic }))}
                    className={`create-post-action h-9 w-9 rounded-xl p-0 ${textStyle.italic ? 'bg-primary/15 text-primary' : ''}`}
                  ><Italic className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>

          {/* Preview media grid */}
          {selectedFiles.length > 0 && previewUrls.length > 0 && (
            <div className="mt-3 p-3 border border-border rounded-2xl grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="object-cover w-full md:w-32 md:h-32 h-24 rounded-xl"
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
                    className="absolute top-1 right-1 rounded-full text-xs bg-background/80"
                  >Remove</Button>
                </div>
              ))}
            </div>
          )}

          {/* Video preview (reel) */}
          {videoPreview && (
            <div className="mt-3 p-3 border border-border rounded-2xl">
              <div className="relative w-40 aspect-[9/16] rounded-2xl overflow-hidden bg-muted">
                <video src={videoPreview} className="w-full h-full object-cover" muted playsInline controls />
                <button
                  type="button"
                  aria-label="Remove video"
                  onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-background/80 border border-border flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">This will be posted to Reels.</p>
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
              <input
                id="camera-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Add media"
                onClick={() => document.getElementById('file-input')?.click()}
                className="create-post-action h-10 w-10 p-0 text-primary"
                disabled={isSubmitting}
              >
                <Plus className="h-6 w-6 stroke-[3]" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Add photo"
                onClick={() => document.getElementById('camera-input')?.click()}
                className="create-post-action h-10 w-10 p-0"
                disabled={isSubmitting}
              >
                <Camera className="w-5 h-5 text-emerald-500" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={(!content.trim() && selectedFiles.length === 0 && !videoFile) || isSubmitting}
              className="create-post-submit rounded-full px-5 font-semibold"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Posting... {uploadProgress > 0 && `${uploadProgress}%`}</span>
                </div>
              ) : <><Send className="mr-2 h-4 w-4" />Post</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
