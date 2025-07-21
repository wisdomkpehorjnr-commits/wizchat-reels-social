
import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause } from 'lucide-react';
import { Post } from '@/types';
import { Button } from '@/components/ui/button';

interface ReelCardProps {
  reel: Post;
  isActive: boolean;
  onLike: (postId: string) => void;
}

const ReelCard = ({ reel, isActive, onLike }: ReelCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike(reel.id);
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={reel.videoUrl}
        loop
        playsInline
        muted
        onClick={togglePlayPause}
      />

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-20 h-20 bg-black/30 hover:bg-black/50 rounded-full"
            onClick={togglePlayPause}
          >
            <Play className="w-8 h-8 text-white" />
          </Button>
        </div>
      )}

      {/* User info and actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-end justify-between">
          {/* User info and caption */}
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={reel.user.avatar}
                alt={reel.user.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <div>
                <p className="text-white font-semibold">{reel.user.name}</p>
                <p className="text-gray-300 text-sm">{reel.user.username}</p>
              </div>
            </div>
            <p className="text-white text-sm mb-2">{reel.content}</p>
            <p className="text-gray-300 text-xs">
              {new Date(reel.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
              onClick={handleLike}
            >
              <Heart 
                className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
              />
            </Button>
            <span className="text-white text-xs">{reel.likes.length}</span>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            <span className="text-white text-xs">{reel.comments.length}</span>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <Share className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <MoreHorizontal className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;
