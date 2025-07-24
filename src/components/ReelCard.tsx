
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Music, MoreHorizontal, Play, Pause } from 'lucide-react';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export interface ReelCardProps {
  post?: Post;
  reel?: Post;
  isActive?: boolean;
  onLike?: (postId: string) => Promise<void>;
  onUserClick?: (userId: string) => void;
  onShare?: (post: Post) => void;
}

const ReelCard: React.FC<ReelCardProps> = ({ 
  post, 
  reel, 
  isActive = false, 
  onLike,
  onUserClick,
  onShare
}) => {
  const { user } = useAuth();
  const reelData = post || reel;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (reelData && user) {
      setIsLiked(reelData.likes?.includes(user.id) || false);
      setLikesCount(reelData.likes?.length || 0);
    }
  }, [reelData, user]);

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

  if (!reelData) {
    return null;
  }

  const handleLike = async () => {
    if (!onLike) return;
    
    try {
      await onLike(reelData.id);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  const handleVideoClick = () => {
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

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(reelData.user.id);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(reelData);
    }
  };

  return (
    <Card 
      className="relative w-full h-full bg-black overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video/Image Content */}
      <div className="absolute inset-0" onClick={handleVideoClick}>
        {reelData.videoUrl ? (
          <video
            ref={videoRef}
            src={reelData.videoUrl}
            className="w-full h-full object-cover cursor-pointer"
            muted
            loop
            playsInline
            controls={false}
          />
        ) : reelData.imageUrl ? (
          <img
            src={reelData.imageUrl}
            alt="Reel content"
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center cursor-pointer">
            <p className="text-white text-lg px-4 text-center">{reelData.content}</p>
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        {reelData.videoUrl && showControls && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay Content */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30">
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold">Reels</span>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-4 left-4 right-16">
          {/* User Info */}
          <div className="flex items-center space-x-3 mb-4">
            <Avatar 
              className="w-10 h-10 cursor-pointer"
              onClick={handleUserClick}
            >
              <AvatarImage src={reelData.user.avatar} />
              <AvatarFallback>{reelData.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p 
                className="text-white font-semibold cursor-pointer hover:underline"
                onClick={handleUserClick}
              >
                {reelData.user.name}
              </p>
              <p className="text-white/80 text-sm">@{reelData.user.username}</p>
            </div>
            <Button size="sm" variant="outline" className="text-white border-white hover:bg-white/10">
              Follow
            </Button>
          </div>

          {/* Caption */}
          {reelData.content && (
            <p className="text-white text-sm mb-2">{reelData.content}</p>
          )}

          {/* Music Info */}
          {reelData.music && (
            <div className="flex items-center space-x-2 text-white/80">
              <Music className="w-4 h-4" />
              <p className="text-sm">{reelData.music.title}</p>
            </div>
          )}
        </div>

        {/* Side Actions */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className="flex flex-col items-center text-white hover:bg-white/10"
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-xs">{likesCount}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center text-white hover:bg-white/10"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">{reelData.comments?.length || 0}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center text-white hover:bg-white/10"
            onClick={handleShare}
          >
            <Share className="w-6 h-6" />
            <span className="text-xs">Share</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ReelCard;
