
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from 'lucide-react';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/components/ui/use-toast';

export interface PostCardProps {
  post: Post;
  onSave?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onSave }) => {
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.likes.includes(post.userId));
  const [likeCount, setLikeCount] = useState(post.likes.length);

  const handleLike = async () => {
    try {
      await dataService.likePost(post.id);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="backdrop-blur-md bg-white/10 border-white/20">
      <CardContent className="p-4">
        {/* User Header */}
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-white">{post.user.name}</p>
            <p className="text-sm text-white/60">@{post.user.username}</p>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-white">{post.content}</p>
        </div>

        {/* Media */}
        {post.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img src={post.imageUrl} alt="Post content" className="w-full h-auto" />
          </div>
        )}

        {post.videoUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <video src={post.videoUrl} controls className="w-full h-auto" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className={liked ? 'text-red-500' : 'text-white/60'}
            >
              <Heart className="w-4 h-4 mr-1" fill={liked ? 'currentColor' : 'none'} />
              {likeCount}
            </Button>
            <Button variant="ghost" size="sm" className="text-white/60">
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.comments.length}
            </Button>
            <Button variant="ghost" size="sm" className="text-white/60">
              <Share className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onSave} className="text-white/60">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
