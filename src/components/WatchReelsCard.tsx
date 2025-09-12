import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WatchReelsCardProps {
  reelPosts: any[];
}

const WatchReelsCard = ({ reelPosts }: WatchReelsCardProps) => {
  const navigate = useNavigate();

  const handleWatchReels = () => {
    navigate('/reels');
  };

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 cursor-pointer" onClick={handleWatchReels}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-foreground">Watch Reels</CardTitle>
              <p className="text-sm text-muted-foreground">
                {reelPosts.length} video{reelPosts.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>Watch</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2">
          {reelPosts.slice(0, 6).map((post, index) => (
            <div key={post.id} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {post.videoUrl ? (
                <video 
                  src={post.videoUrl} 
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                  poster={post.imageUrl}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Video className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
          
          {reelPosts.length > 6 && (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-primary/30">
              <div className="text-center">
                <Video className="w-4 h-4 text-primary mx-auto mb-1" />
                <span className="text-xs text-primary font-medium">+{reelPosts.length - 6}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Tap to watch all videos in full screen
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WatchReelsCard;