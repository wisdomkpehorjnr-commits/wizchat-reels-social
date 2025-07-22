
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Hash, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Hashtag, HashtagFollow } from '@/types';

const HashtagTrends: React.FC = () => {
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [followedHashtags, setFollowedHashtags] = useState<HashtagFollow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHashtags();
    loadFollowedHashtags();
  }, []);

  const loadHashtags = async () => {
    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setTrendingHashtags(data?.map(hashtag => ({
        id: hashtag.id,
        name: hashtag.name,
        postCount: hashtag.post_count,
        createdAt: new Date(hashtag.created_at),
        updatedAt: new Date(hashtag.updated_at)
      })) || []);
    } catch (error) {
      console.error('Error loading hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowedHashtags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('hashtag_follows')
        .select(`
          *,
          hashtag:hashtags(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setFollowedHashtags(data?.map(follow => ({
        id: follow.id,
        userId: follow.user_id,
        hashtagId: follow.hashtag_id,
        hashtag: {
          id: follow.hashtag.id,
          name: follow.hashtag.name,
          postCount: follow.hashtag.post_count,
          createdAt: new Date(follow.hashtag.created_at),
          updatedAt: new Date(follow.hashtag.updated_at)
        },
        createdAt: new Date(follow.created_at)
      })) || []);
    } catch (error) {
      console.error('Error loading followed hashtags:', error);
    }
  };

  const toggleHashtagFollow = async (hashtagId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isFollowing = followedHashtags.some(follow => follow.hashtagId === hashtagId);

      if (isFollowing) {
        const { error } = await supabase
          .from('hashtag_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('hashtag_id', hashtagId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hashtag_follows')
          .insert({
            user_id: user.id,
            hashtag_id: hashtagId
          });

        if (error) throw error;
      }

      loadFollowedHashtags();
    } catch (error) {
      console.error('Error toggling hashtag follow:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trendingHashtags.map((hashtag) => {
          const isFollowing = followedHashtags.some(follow => follow.hashtagId === hashtag.id);
          
          return (
            <div key={hashtag.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">#{hashtag.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {hashtag.postCount} posts
                </Badge>
              </div>
              <Button
                size="sm"
                variant={isFollowing ? "default" : "outline"}
                onClick={() => toggleHashtagFollow(hashtag.id)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </div>
          );
        })}
        
        {trendingHashtags.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No trending hashtags yet. Start using hashtags in your posts!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HashtagTrends;
