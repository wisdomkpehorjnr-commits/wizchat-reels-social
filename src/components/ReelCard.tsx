import { useState } from 'react';
import { Heart, MessageSquare, Share2, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Post } from '@/types';

interface ReelCardProps {
  post: Post;
  onLike: (postId: string) => Promise<void>;
  onUserClick: (userId: string) => void;
  onShare: (post: Post) => Promise<void>;
}

const ReelCard = ({ post, onLike, onUserClick, onShare }: ReelCardProps) => {
  const [liked, setLiked] = useState(false);

  const handleLikeClick = async () => {
    setLiked(!liked);
    await onLike(post.id);
  };

  return (
    <div className="relative">
      {post.videoUrl && (
        <video src={post.videoUrl} controls className="w-full aspect-video rounded-lg" />
      )}
      {post.imageUrl && (
        <img src={post.imageUrl} alt={post.content} className="w-full aspect-video rounded-lg" />
      )}
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <div className="flex items-center justify-between text-white">
          <div>
            <Link to={`/profile/${post.userId}`} onClick={() => onUserClick(post.userId)}>
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={post.user.avatar} alt={post.user.name} />
                  <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{post.user.name}</p>
                </div>
              </div>
            </Link>
            <p className="text-sm mt-1">{post.content}</p>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <button onClick={handleLikeClick}>
              <Heart className={`w-6 h-6 ${liked ? 'text-red-500' : ''}`} fill={liked ? 'red' : 'none'} />
            </button>
            <button>
              <MessageSquare className="w-6 h-6" />
            </button>
            <button onClick={() => onShare(post)}>
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;
