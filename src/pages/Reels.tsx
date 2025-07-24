
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ReelCard from '@/components/ReelCard';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Video } from 'lucide-react';

const Reels = () => {
  const [reels, setReels] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      const allPosts = await dataService.getPosts();
      // Filter for video posts and reels
      const videoReels = allPosts.filter(post => post.videoUrl || post.isReel);
      setReels(videoReels);
    } catch (error) {
      console.error('Error loading reels:', error);
      toast({
        title: "Error",
        description: "Failed to load reels",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-2 green-border rounded-lg aspect-[9/16] bg-card animate-pulse">
                <div className="w-full h-full bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : reels.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reels available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a video post to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reels.map((reel) => (
              <ReelCard key={reel.id} post={reel} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reels;
