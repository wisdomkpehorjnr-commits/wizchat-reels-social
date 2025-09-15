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
      
      <CardContent className="pt-0 p-0">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          {reelPosts.length > 0 && reelPosts[0].imageUrl ? (
            <img 
              src={reelPosts[0].imageUrl} 
              alt="Featured reel"
              className="w-full h-full object-cover"
            />
          ) : reelPosts.length > 0 && reelPosts[0].videoUrl ? (
            <video 
              src={reelPosts[0].videoUrl} 
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <Video className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="text-center text-white">
              <Play className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm font-medium">Watch {reelPosts.length} Reel{reelPosts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WatchReelsCard;