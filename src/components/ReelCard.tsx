import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Send, Volume2, VolumeX, X, Download, Trash2, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDownload } from '@/hooks/useDownload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReelCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onUserClick: (user: any) => void;
  onShare: (post: Post) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  isOwnProfile?: boolean;
  onDelete?: (id: string) => void;
}

const ReelCard = ({ post, onLike, onUserClick, onShare, isMuted, onMuteToggle, isOwnProfile, onDelete }: ReelCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDislikeAnimating, setIsDislikeAnimating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { downloadMedia } = useDownload();

  // Load initial like/dislike/save state
  useEffect(() => {
    if (user) {
      // Check likes
      if (post.likes) {
        setIsLiked(post.likes.includes(user.id));
        setLikeCount(post.likes.length);
      }
      
      // Check dislikes (from reactions table)
      loadDislikes();
      
      // Check if saved
      checkIfSaved();
    }
  }, [user, post.likes, post.id]);

  const loadDislikes = async () => {
    if (!user) return;
    try {
      const { data: reactions } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', post.id)
        .eq('emoji', '👎');
      
      if (reactions) {
        setDislikeCount(reactions.length);
        setIsDisliked(reactions.some(r => r.user_id === user.id));
      }
    } catch (error) {
      console.error('Error loading dislikes:', error);
    }
  };

  const checkIfSaved = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsSaved(!!data);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

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
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${post.id}`
        },
        async () => {
          // Reload likes count
          const likes = await dataService.getLikes(post.id);
          setLikeCount(likes.length);
          if (user) {
            setIsLiked(likes.some(l => l.userId === user.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `post_id=eq.${post.id}`
        },
        async (payload) => {
          // Only reload if it's a dislike emoji
          if (payload.new?.emoji === '👎' || payload.old?.emoji === '👎') {
            loadDislikes();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, user?.id]);

  // Initialize comments from post data
  useEffect(() => {
    setComments(post.comments || []);
  }, [post.comments]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Format numbers like 1.2K, 3.4M for compact display
  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
  };

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
      setShowDownloadConfirm(true);
    }, 4000); // Extended to 4 seconds
    setLongPressTimer(timer);
  };

  const handleDownloadConfirm = () => {
    if (post.videoUrl) {
      downloadMedia(post.videoUrl, `reel_${post.id}.mp4`);
    }
    setShowDownloadConfirm(false);
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
            preload="metadata"
            onClick={onMuteToggle}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            poster={post.imageUrl || `${post.videoUrl}#t=0.5`}
            style={{
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
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

        {/* Modern Shorts-like vertical action bar */}
        <div className="absolute right-4 top-1/3 z-20 flex flex-col items-center space-y-4 transform -translate-y-1/6">
          {/* Creator avatar + follow */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUserClick(post.user); }}
              className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg"
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.user.avatar} />
                <AvatarFallback>{post.user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* future: follow action */ }}
              className="px-2 py-1 text-xs font-semibold rounded-full bg-green-600 text-white shadow-sm"
            >
              + Follow
            </button>
          </div>

          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) return;

                const wasLiked = isLiked;
                const wasDisliked = isDisliked;

                setIsLiked(!wasLiked);
                setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
                setIsAnimating(true);

                if (wasDisliked) {
                  setIsDisliked(false);
                  setDislikeCount(prev => Math.max(0, prev - 1));
                }

                try {
                  await onLike(post.id);
                  const likes = await dataService.getLikes(post.id);
                  setLikeCount(likes.length);
                  setIsLiked(likes.some(l => l.userId === user.id));
                } catch (error) {
                  setIsLiked(wasLiked);
                  setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
                  setIsDisliked(wasDisliked);
                  setDislikeCount(prev => wasDisliked ? prev + 1 : Math.max(0, prev - 1));
                  console.error('Error liking reel:', error);
                } finally {
                  setTimeout(() => setIsAnimating(false), 300);
                }
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-lg transition-transform ${isLiked ? 'scale-110 ring-2 ring-green-400' : ''}`}
            >
              <ThumbsUp className={`w-6 h-6 ${isLiked ? 'text-green-600' : 'text-gray-800'}`} />
            </button>
            <span className="text-xs text-white mt-1 font-semibold drop-shadow-md">{formatCount(likeCount)}</span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowComments(true); }}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-lg"
            >
              <MessageSquare className="w-6 h-6 text-gray-800" />
            </button>
            <span className="text-xs text-white mt-1 font-semibold drop-shadow-md">{formatCount(comments.length)}</span>
          </div>

          {/* Save */}
          <div className="flex flex-col items-center">
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) return;

                const wasSaved = isSaved;
                setIsSaved(!wasSaved);

                try {
                  await ProfileService.savePost(post.id);
                  toast({ title: wasSaved ? 'Unsaved' : 'Saved' });
                } catch (error) {
                  setIsSaved(wasSaved);
                  console.error('Error saving reel:', error);
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg ${isSaved ? 'ring-2 ring-green-400' : ''}`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'text-green-600' : 'text-gray-800'}`} />
            </button>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShare(post); }}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg border-2 border-green-500"
            >
              <Share2 className="w-5 h-5 text-gray-800" />
            </button>
            <span className="text-xs text-white mt-1 font-semibold drop-shadow-md">Share</span>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <button
          onClick={e => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-600/80 backdrop-blur-sm rounded-full p-1.5 z-10"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      )}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-green-500 rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center justify-between">
              <span>Delete Reel?</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(false)}
                className="h-6 w-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete this reel? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (onDelete) {
                  await onDelete(post.id);
                  setShowDeleteDialog(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Download Confirmation Dialog */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-sm mx-4 border">
            <h3 className="text-lg font-semibold mb-2">Download Video</h3>
            <p className="text-muted-foreground mb-4">
              Do you want to download this video to your device?
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDownloadConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDownloadConfirm}
                className="flex-1"
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelCard;
