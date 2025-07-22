
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Story, User } from '@/types';

const StoriesSection: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles(*)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStories(data?.map(story => ({
        id: story.id,
        userId: story.user_id,
        user: {
          id: story.user.id,
          name: story.user.name,
          username: story.user.username,
          email: story.user.email,
          photoURL: story.user.avatar || '',
          avatar: story.user.avatar || '',
          createdAt: new Date(story.user.created_at)
        },
        content: story.content,
        mediaUrl: story.media_url,
        mediaType: story.media_type as 'image' | 'video',
        viewerCount: story.viewer_count,
        expiresAt: new Date(story.expires_at),
        createdAt: new Date(story.created_at)
      })) || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewStory = async (storyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Record the view
      await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          user_id: user.id
        });

      // Update viewer count
      const { error } = await supabase.rpc('increment_story_viewers', {
        story_id: storyId
      });

      if (error) console.error('Error updating story view count:', error);
    } catch (error) {
      console.error('Error recording story view:', error);
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
    <div className="flex gap-4 p-4 overflow-x-auto bg-background border-b">
      {/* Add Story Button */}
      <div className="flex-shrink-0 text-center">
        <Button
          variant="outline"
          size="lg"
          className="w-16 h-16 rounded-full p-0"
        >
          <Plus className="w-6 h-6" />
        </Button>
        <p className="text-xs mt-1">Your Story</p>
      </div>

      {/* Stories */}
      {stories.map((story) => (
        <div
          key={story.id}
          className="flex-shrink-0 text-center cursor-pointer"
          onClick={() => viewStory(story.id)}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-r from-pink-500 to-orange-500">
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={story.user.avatar} />
                <AvatarFallback>
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
          <p className="text-xs mt-1 truncate w-16">
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
  );
};

export default StoriesSection;
