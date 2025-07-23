
import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { Post } from '@/types';

export interface ReelCardProps {
  post: Post;
}

const ReelCard: React.FC<ReelCardProps> = ({ post }) => {
  return (
    <Card className="relative aspect-[9/16] overflow-hidden backdrop-blur-md bg-white/10 border-white/20">
      {/* Video/Image Background */}
      {post.videoUrl ? (
        <video 
          src={post.videoUrl} 
          className="w-full h-full object-cover" 
          muted 
          loop
        />
      ) : (
        <img 
          src={post.imageUrl || '/placeholder.svg'} 
          alt="Reel content" 
          className="w-full h-full object-cover" 
        />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      
      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Button 
          variant="ghost" 
          size="lg" 
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
        >
          <Play className="w-8 h-8 text-white" fill="white" />
        </Button>
      </div>
      
      {/* User Info */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center space-x-2 mb-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback className="text-xs">{post.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-white font-medium text-sm">{post.user.username}</span>
        </div>
        <p className="text-white text-sm line-clamp-2">{post.content}</p>
      </div>
    </Card>
  );
};

export default ReelCard;
