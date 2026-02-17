import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import reelsPreview from '@/assets/reels-preview.jpg';
import { useEffect, useState } from 'react';
import { cacheService } from '@/services/cacheService';

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
          <WatchPreviewImage src={reelsPreview} alt="Watch exciting reels on WizChat" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center text-white drop-shadow-lg">
              <Play className="w-16 h-16 mx-auto mb-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WatchReelsCard;

// Module-level cache so the image URL persists across remounts (tab switches)
let cachedReelsPreviewUrl: string | null = null;

const WatchPreviewImage: React.FC<{ src: string; alt?: string }> = ({ src, alt }) => {
  // If we already resolved a cached URL in this session, use it instantly
  const [preview, setPreview] = useState<string>(cachedReelsPreviewUrl || src);

  useEffect(() => {
    // If already cached in memory, nothing to do
    if (cachedReelsPreviewUrl) return;

    let mounted = true;
    const key = `media-poster-${encodeURIComponent(src)}`;

    (async () => {
      try {
        const cached = await cacheService.get<string>(key);
        if (cached) {
          cachedReelsPreviewUrl = cached;
          if (mounted) setPreview(cached);
          return;
        }

        // Fetch and cache (this will work for bundled assets served by Vite)
        const res = await fetch(src);
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          cachedReelsPreviewUrl = dataUrl;
          try { await cacheService.set(key, dataUrl, 365 * 24 * 60 * 60 * 1000); } catch {}
          if (mounted) setPreview(dataUrl);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, [src]);

  return <img src={preview} alt="" className="w-full h-full object-cover" />;
};