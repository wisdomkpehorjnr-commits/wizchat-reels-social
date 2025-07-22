
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Post } from '@/types';
import { Heart, MessageCircle, Share } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onReaction: (postId: string, emoji: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onReaction }) => {
  const isLiked = post.likes.includes('1');

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={post.user.photoURL} />
            <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{post.user.name}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p>{post.content}</p>
        
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post content"
            className="w-full rounded-lg object-cover max-h-96"
          />
        )}
        
        {post.videoUrl && (
          <video
            src={post.videoUrl}
            controls
            className="w-full rounded-lg max-h-96"
            autoPlay={post.isReel}
            loop={post.isReel}
            muted={post.isReel}
          />
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(post.id)}
              className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{post.likes.length}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments.length}</span>
            </Button>

            {post.reactions.length > 0 && (
              <div className="flex items-center space-x-1">
                {post.reactions.slice(0, 3).map((reaction, index) => (
                  <span key={index} className="text-sm">
                    {reaction.emoji}
                  </span>
                ))}
                {post.reactions.length > 3 && (
                  <span className="text-sm text-muted-foreground">
                    +{post.reactions.length - 3}
                  </span>
                )}
              </div>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onReaction(post.id, '👍')}
            >
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
