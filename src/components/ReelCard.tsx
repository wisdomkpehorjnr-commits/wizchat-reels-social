
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Bookmark, Play, Pause, VolumeX, Volume2, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import UserLink from './UserLink';

interface ReelCardProps {
  post: Post;
  onSave?: () => void;
  onPostUpdate?: () => void;
  onPostDelete?: () => void;
}

const ReelCard: React.FC<ReelCardProps> = ({ post, onSave, onPostUpdate, onPostDelete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.likes.includes(user?.id || ''));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const handleLike = async () => {
    try {
      await dataService.likePost(post.id);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
      
      if (!liked) {
        toast({
          title: "Liked!",
          description: "You liked this reel",
        });
      }
    } catch (error) {
      console.error('Error liking reel:', error);
      toast({
        title: "Error",
        description: "Failed to like reel",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await dataService.deletePost(post.id);
      if (onPostDelete) onPostDelete();
      
      toast({
        title: "Reel deleted",
        description: "Your reel has been deleted",
      });
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast({
        title: "Error",
        description: "Failed to delete reel",
        variant: "destructive",
      });
    }
  };

  const togglePlayPause = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoRef = (ref: HTMLVideoElement) => {
    setVideoRef(ref);
    if (ref) {
      ref.addEventListener('play', () => setIsPlaying(true));
      ref.addEventListener('pause', () => setIsPlaying(false));
    }
  };

  return (
    <Card className="relative aspect-[9/16] overflow-hidden group">
      <CardContent className="p-0 h-full">
        {/* Video Background */}
        {post.videoUrl && (
          <div className="relative w-full h-full">
            <video
              ref={handleVideoRef}
              src={post.videoUrl}
              className="w-full h-full object-cover"
              loop
              muted={isMuted}
              playsInline
            />
            
            {/* Play/Pause overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlayPause}
            >
              {!isPlaying && (
                <div className="bg-black/50 rounded-full p-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
              )}
            </div>

            {/* Volume control */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {/* Image fallback */}
        {post.imageUrl && !post.videoUrl && (
          <img src={post.imageUrl} alt="Reel content" className="w-full h-full object-cover" />
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-auto">
            {/* User Info */}
            <div className="flex items-center space-x-3 mb-3">
              <UserLink user={post.user}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </UserLink>
              <div className="flex-1">
                <UserLink user={post.user}>
                  <p className="font-semibold text-sm hover:underline">{post.user.name}</p>
                </UserLink>
                <UserLink user={post.user}>
                  <p className="text-xs text-white/80 hover:underline">@{post.user.username}</p>
                </UserLink>
              </div>
              {user?.id === post.user.id && (
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Reel</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this reel? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {/* Content */}
            <p className="text-sm mb-3 line-clamp-2">{post.content}</p>
          </div>
        </div>

        {/* Side Actions */}
        <div className="absolute right-4 bottom-20 flex flex-col space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`text-white hover:bg-white/20 ${liked ? 'text-red-400' : ''}`}
          >
            <div className="flex flex-col items-center">
              <Heart className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} />
              <span className="text-xs mt-1">{likeCount}</span>
            </div>
          </Button>

          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <div className="flex flex-col items-center">
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs mt-1">{post.comments.length}</span>
            </div>
          </Button>

          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <Share className="w-6 h-6" />
          </Button>

          <Button variant="ghost" size="sm" onClick={onSave} className="text-white hover:bg-white/20">
            <Bookmark className="w-6 h-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReelCard;
