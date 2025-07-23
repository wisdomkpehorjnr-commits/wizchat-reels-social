
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Music, MoreHorizontal } from 'lucide-react';
import { Post } from '@/types';

export interface ReelCardProps {
  post?: Post;
  reel?: Post;
  isActive?: boolean;
  onLike?: (postId: string) => Promise<void>;
}

const ReelCard: React.FC<ReelCardProps> = ({ post, reel, isActive = false, onLike }) => {
  const reelData = post || reel;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reelData?.likes?.length || 0);

  if (!reelData) {
    return null;
  }

  const handleLike = async () => {
    try {
      if (onLike) {
        await onLike(reelData.id);
      }
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  return (
    <Card className="relative w-full h-screen bg-black overflow-hidden">
      {/* Video */}
      <div className="absolute inset-0">
        {reelData.videoUrl ? (
          <video
            src={reelData.videoUrl}
            className="w-full h-full object-cover"
            autoPlay={isActive}
            muted
            loop
            playsInline
          />
        ) : reelData.imageUrl ? (
          <img
            src={reelData.imageUrl}
            alt="Reel content"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
            <p className="text-white text-lg">{reelData.content}</p>
          </div>
        )}
      </div>

      {/* Overlay Content */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
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
            <Avatar className="w-10 h-10">
              <AvatarImage src={reelData.user.avatar} />
              <AvatarFallback>{reelData.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold">{reelData.user.name}</p>
              <p className="text-white/80 text-sm">@{reelData.user.username}</p>
            </div>
            <Button size="sm" variant="outline" className="text-white border-white">
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
            className="flex flex-col items-center text-white"
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-xs">{likesCount}</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex flex-col items-center text-white">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">{reelData.comments?.length || 0}</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex flex-col items-center text-white">
            <Share className="w-6 h-6" />
            <span className="text-xs">Share</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ReelCard;
