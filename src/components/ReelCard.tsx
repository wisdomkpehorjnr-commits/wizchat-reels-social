import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Send, Volume2, VolumeX, X, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDownload } from '@/hooks/useDownload';

interface ReelCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onUserClick: (user: any) => void;
  onShare: (post: Post) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}

const ReelCard = ({ post, onLike, onUserClick, onShare, isMuted, onMuteToggle }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { downloadMedia } = useDownload();

  useEffect(() => {
    if (user && post.likes) {
      setIsLiked(post.likes.includes(user.id));
    }
  }, [user, post.likes]);

  // Real-time comments subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete comment with user data
            const { data: newComment } = await supabase
              .from('comments')
              .select(`
                *,
                user:user_id (
                  id,
                  name,
                  username,
                  email,
                  avatar
                )
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (newComment) {
              const commentWithUser = {
                id: newComment.id,
                userId: newComment.user_id,
                user: {
                  ...newComment.user,
                  photoURL: newComment.user.avatar,
                  followerCount: 0,
                  followingCount: 0,
                  profileViews: 0,
                  createdAt: new Date()
                },
                postId: newComment.post_id,
                content: newComment.content,
                createdAt: new Date(newComment.created_at)
              };
              
              setComments(prev => [commentWithUser, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  // Initialize comments from post data
  useEffect(() => {
    setComments(post.comments || []);
  }, [post.comments]);

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

  const handleLongPressStart = () => {
    const timer = setTimeout(() => {
      if (post.videoUrl) {
        downloadMedia(post.videoUrl, `reel_${post.id}.mp4`);
      }
    }, 800);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

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
            onClick={onMuteToggle}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            poster={post.imageUrl}
          />
        )}
        
        {/* Mute/Unmute Button */}
        <button
          onClick={onMuteToggle}
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
              setIsLiked(!isLiked);
              onLike(post.id);
            }}
            className="flex flex-col items-center text-white drop-shadow-lg"
          >
            <div className={`p-3 rounded-full backdrop-blur-sm ${isLiked ? 'bg-red-500/90' : 'bg-black/60 border border-white/20'}`}>
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current text-white' : 'text-white'}`} />
            </div>
            <span className="text-xs mt-1 font-semibold drop-shadow-md">{post.likes?.length || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center text-white drop-shadow-lg"
          >
            <div className="p-3 rounded-full backdrop-blur-sm bg-black/60 border border-white/20">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs mt-1 font-semibold drop-shadow-md">{comments.length}</span>
          </button>

          <button
            onClick={() => onShare(post)}
            className="flex flex-col items-center text-white drop-shadow-lg"
          >
            <div className="p-3 rounded-full backdrop-blur-sm bg-black/60 border border-white/20">
              <Share className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs mt-1 font-semibold drop-shadow-md">Share</span>
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
              {comments.map((comment) => (
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
                    // The real-time subscription will handle updating the comments
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
