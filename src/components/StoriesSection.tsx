import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Eye, Camera, Video, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Story } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { MediaService } from '@/services/mediaService';
import { useToast } from '@/components/ui/use-toast';

const StoriesSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [storyMedia, setStoryMedia] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  useEffect(() => {
    loadStories();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('stories-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories'
      }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStories = async () => {
    try {
      console.log('Loading stories...');
      
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles!stories_user_id_fkey (
            id,
            name,
            username,
            email,
            avatar,
            created_at
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) {
        console.error('Error loading stories:', storiesError);
        setStories([]);
        return;
      }

      if (!storiesData || storiesData.length === 0) {
        console.log('No stories found');
        setStories([]);
        return;
      }

      const storiesWithProfiles = storiesData.map(story => {
        const profile = story.profiles;
        
        if (!profile) {
          console.warn('Profile not found for story:', story.id);
          return null;
        }

        return {
          id: story.id,
          userId: story.user_id,
          user: {
            id: profile.id,
            name: profile.name || 'Unknown User',
            username: profile.username || 'unknown',
            email: profile.email || '',
            photoURL: profile.avatar || '',
            avatar: profile.avatar || '',
            bio: '',
            followerCount: 0,
            followingCount: 0,
            profileViews: 0,
            createdAt: new Date(profile.created_at || new Date())
          },
          content: story.content || '',
          mediaUrl: story.media_url,
          mediaType: story.media_type as 'image' | 'video',
          viewerCount: story.viewer_count || 0,
          expiresAt: new Date(story.expires_at),
          createdAt: new Date(story.created_at)
        };
      }).filter(Boolean) as Story[];

      console.log('Stories loaded:', storiesWithProfiles.length);
      setStories(storiesWithProfiles);
    } catch (error) {
      console.error('Error loading stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const viewStory = async (story: Story) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Record the view
      await supabase
        .from('story_views')
        .insert({
          story_id: story.id,
          user_id: currentUser.id
        });

      // Update viewer count
      const { error } = await supabase
        .from('stories')
        .update({ viewer_count: (story.viewerCount || 0) + 1 })
        .eq('id', story.id);

      if (error) console.error('Error updating story view count:', error);
      
      // Show story viewer
      setViewingStory(story);
    } catch (error) {
      console.error('Error recording story view:', error);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const detectedMediaType = MediaService.getMediaType(file);
      
      // Only allow image and video for stories, not audio
      if (detectedMediaType === 'audio') {
        toast({
          title: "Invalid file type",
          description: "Stories only support images and videos",
          variant: "destructive",
        });
        return;
      }
      
      setStoryMedia(file);
      setMediaType(detectedMediaType as 'image' | 'video');
      
      const reader = new FileReader();
      reader.onload = () => setStoryPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setStoryMedia(null);
    setStoryPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createStory = async () => {
    if (!storyContent.trim() && !storyMedia) return;
    
    setIsUploading(true);
    
    try {
      let mediaUrl = '';
      let finalMediaType: 'image' | 'video' = 'image';
      
      if (storyMedia) {
        const detectedType = MediaService.getMediaType(storyMedia);
        
        // Ensure we only process image/video for stories
        if (detectedType === 'audio') {
          throw new Error('Audio files are not supported for stories');
        }
        
        mediaUrl = await MediaService.uploadStoryMedia(storyMedia);
        finalMediaType = detectedType as 'image' | 'video';
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          content: storyContent.trim(),
          media_url: mediaUrl,
          media_type: finalMediaType
        });

      if (error) throw error;

      // Reset form
      setStoryContent('');
      setStoryMedia(null);
      setStoryPreview(null);
      setShowCreateDialog(false);

      toast({
        title: "Story Created!",
        description: "Your story has been shared successfully.",
      });

      // Reload stories
      loadStories();
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 p-4 overflow-x-auto bg-background/50 backdrop-blur-sm border-b border-green-500/30">
        {/* Add Story Button */}
        <div className="flex-shrink-0 text-center">
          <Button
            variant="outline"
            size="lg"
            className="w-16 h-16 rounded-full p-0 backdrop-blur-sm bg-card border-green-500/50 hover:bg-muted/50"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-6 h-6 text-foreground" />
          </Button>
          <p className="text-xs mt-1 text-foreground">Your Story</p>
        </div>

        {/* Stories */}
        {stories.map((story) => (
          <div
            key={story.id}
            className="flex-shrink-0 text-center cursor-pointer"
            onClick={() => viewStory(story)}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-green-500 to-emerald-500">
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={story.user.avatar} />
                  <AvatarFallback className="text-foreground">
                    {story.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              {story.viewerCount > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full text-xs px-1 flex items-center gap-1">
                  <Eye className="w-2 h-2" />
                  {story.viewerCount}
                </div>
              )}
            </div>
            <p className="text-xs mt-1 truncate w-16 text-foreground">
              {story.user.username}
            </p>
          </div>
        ))}

        {stories.length === 0 && (
          <div className="flex-1 text-center py-8">
            <p className="text-muted-foreground">No stories yet. Be the first to share!</p>
          </div>
        )}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!viewingStory} onOpenChange={() => setViewingStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black/90 border-green-500/30">
          {viewingStory && (
            <div className="relative w-full h-96">
              {/* Story Header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={viewingStory.user.avatar} />
                    <AvatarFallback className="text-foreground">
                      {viewingStory.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{viewingStory.user.name}</p>
                    <p className="text-xs text-white/70">
                      {new Date(viewingStory.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Story Content */}
              <div className="w-full h-full flex items-center justify-center">
                {viewingStory.mediaUrl ? (
                  viewingStory.mediaType === 'image' ? (
                    <img 
                      src={viewingStory.mediaUrl} 
                      alt="Story" 
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <video 
                      src={viewingStory.mediaUrl} 
                      controls 
                      className="max-w-full max-h-full object-contain"
                    />
                  )
                ) : (
                  <div className="text-center p-8">
                    <p className="text-white text-lg">{viewingStory.content}</p>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setViewingStory(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Story Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md backdrop-blur-md bg-card border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Story</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Media Preview */}
            {storyPreview && (
              <div className="relative">
                {mediaType === 'image' ? (
                  <img
                    src={storyPreview}
                    alt="Story preview"
                    className="w-full h-60 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={storyPreview}
                    controls
                    className="w-full h-60 rounded-lg"
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

            <Textarea
              placeholder="Add text to your story..."
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
              className="min-h-[80px] text-foreground"
            />

            {/* Media Buttons */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-foreground"
              >
                <Camera className="w-4 h-4 mr-2" />
                Photo/Video
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={createStory}
                disabled={isUploading || (!storyContent.trim() && !storyMedia)}
                className="text-foreground"
              >
                {isUploading ? 'Sharing...' : 'Share Story'}
              </Button>
            </div>

            {/* Hidden File Input - Only accept images and videos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoriesSection;
