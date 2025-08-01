import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Send, Volume2, VolumeX, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

interface ReelCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onUserClick: (user: any) => void;
  onShare: (post: Post) => void;
}

const ReelCard = ({ post, onLike, onUserClick, onShare }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play video when in view
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(console.error);
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(video);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black snap-start">
      {/* Video Content */}
      <div className="relative w-full h-full bg-black">
        {post.videoUrl && (
          <video
            ref={videoRef}
            src={post.videoUrl}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            controls={false}
            onClick={() => setIsMuted(!isMuted)}
          />
        )}
        
        {/* Mute/Unmute Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* User Info Overlay */}
        <div className="absolute bottom-16 left-4 right-16 text-white">
          <button 
            onClick={() => onUserClick(post.user)}
            className="flex items-center space-x-2 mb-2 hover:opacity-80 transition-opacity"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.user.avatar} />
              <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{post.user.name}</span>
          </button>
          
          <p className="text-sm mb-2">{post.content}</p>
          
          {/* Hashtags */}
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map((hashtag) => (
              <span key={hashtag.id} className="text-xs text-blue-300">
                #{hashtag.name}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              onLike(post.id);
            }}
            className="flex flex-col items-center text-white"
          >
            <div className={`p-3 rounded-full ${isLiked ? 'bg-red-500' : 'bg-black bg-opacity-50'}`}>
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-xs mt-1">{post.likes?.length || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center text-white"
          >
            <div className="p-3 rounded-full bg-black bg-opacity-50">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-xs mt-1">{post.comments?.length || 0}</span>
          </button>

          <button
            onClick={() => onShare(post)}
            className="flex flex-col items-center text-white"
          >
            <div className="p-3 rounded-full bg-black bg-opacity-50">
              <Share className="w-6 h-6" />
            </div>
            <span className="text-xs mt-1">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-background/95 backdrop-blur border-t-2 green-border rounded-t-lg p-6 w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Comments</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowComments(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 mb-4">
              {post.comments?.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <button onClick={() => onUserClick(comment.user)}>
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1">
                    <button 
                      onClick={() => onUserClick(comment.user)}
                      className="font-medium text-sm hover:text-primary"
                    >
                      {comment.user.name}
                    </button>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
              />
              <Button 
                onClick={async () => {
                  if (!newComment.trim() || !user) return;
                  try {
                    await dataService.addComment(post.id, newComment);
                    setNewComment('');
                    toast({
                      title: "Comment added",
                      description: "Your comment has been posted"
                    });
                  } catch (error) {
                    console.error('Error adding comment:', error);
                    toast({
                      title: "Error",
                      description: "Failed to add comment",
                      variant: "destructive"
                    });
                  }
                }}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelCard;
