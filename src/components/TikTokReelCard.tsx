import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX, Bookmark, Download, Flag, UserPlus, Check } from 'lucide-react';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TikTokReelCardProps {
  post: Post;
  isActive: boolean;
  onLike: (postId: string) => Promise<void>;
  onFollow: (userId: string) => Promise<void>;
  onComment: (postId: string, content: string) => Promise<void>;
  onShare: (post: Post) => Promise<void>;
  onSave?: (postId: string) => Promise<void>;
  onReport?: (postId: string) => Promise<void>;
  onDownload?: (postId: string) => Promise<void>;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onView?: (postId: string) => void;
  musicTitle?: string;
  musicArtist?: string;
}

const TikTokReelCard: React.FC<TikTokReelCardProps> = ({
  post,
  isActive,
  onLike,
  onFollow,
  onComment,
  onShare,
  onSave,
  onReport,
  onDownload,
  soundEnabled,
  onSoundToggle,
  onView,
  musicTitle,
  musicArtist
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [commentCount, setCommentCount] = useState(comments.length);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [showCaptionExpanded, setShowCaptionExpanded] = useState(false);
  
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize like state
  useEffect(() => {
    if (user && post.likes) {
      setIsLiked(post.likes.includes(user.id));
      setLikeCount(post.likes.length);
    }
  }, [user, post.likes]);

  // Video playback control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedData = () => {
      setIsLoading(false);
      setHasError(false);
    };
    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    if (isActive) {
      // Auto-play when active
      video.play().catch(console.error);
      setWatchStartTime(Date.now());
      
      // Track view after 2 seconds
      if (!viewTracked && onView) {
        setTimeout(() => {
          onView(post.id);
          setViewTracked(true);
        }, 2000);
      }
    } else {
      video.pause();
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, [isActive, onView, post.id, viewTracked]);

  // Track watch time
  useEffect(() => {
    if (!isActive || !watchStartTime) return;

    const interval = setInterval(() => {
      if (watchStartTime) {
        const watchTime = Math.floor((Date.now() - watchStartTime) / 1000);
        // Emit watch time event (can be extended to analytics service)
        console.log('Watch time:', watchTime, 'seconds for reel', post.id);
      }
    }, 5000); // Track every 5 seconds

    return () => clearInterval(interval);
  }, [isActive, watchStartTime, post.id]);

  // Handle tap (single/double)
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap
      e.preventDefault();
      e.stopPropagation();
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      // Single tap - toggle play/pause
      lastTapRef.current = now;
      doubleTapTimerRef.current = setTimeout(() => {
        handleSingleTap();
        lastTapRef.current = 0;
      }, 300);
    }
  }, []);

  const handleSingleTap = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  const handleDoubleTap = async () => {
    if (!user) return;

    // Show heart animation
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);

    // Optimistic like
    const wasLiked = isLiked;
    setIsLiked(true);
    setLikeCount(prev => wasLiked ? prev : prev + 1);

    try {
      await onLike(post.id);
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev : prev - 1);
      toast({
        title: "Error",
        description: "Failed to like reel",
        variant: "destructive"
      });
    }
  };

  // Handle long press
  const handleLongPressStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowContextMenu(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Handle like button
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      await onLike(post.id);
    } catch (error) {
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  };

  // Handle follow
  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || post.userId === user.id) return;

    const wasFollowing = isFollowing;
    setIsFollowing(true);

    try {
      await onFollow(post.userId);
      toast({
        title: "Following",
        description: `You're now following ${post.user.name}`
      });
    } catch (error) {
      setIsFollowing(wasFollowing);
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive"
      });
    }
  };

  // Handle comment
  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !user) return;

    try {
      await onComment(post.id, commentText);
      setCommentText('');
      setCommentCount(prev => prev + 1);
      toast({
        title: "Comment posted",
        description: "Your comment has been added"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    }
  };

  // Get caption preview
  const getCaptionPreview = () => {
    if (!post.content) return '';
    if (showCaptionExpanded || post.content.length <= 100) return post.content;
    return post.content.substring(0, 100) + '...';
  };

  return (
    <div className="relative w-full h-screen bg-black snap-start flex-shrink-0">
      {/* Video */}
      <div 
        className="absolute inset-0 w-full h-full"
        onClick={handleTap}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
      >
        {post.videoUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {hasError && (
              <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white p-4">
                <p className="mb-4">Failed to load video</p>
                <Button 
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  }}
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            )}
            <video
              ref={videoRef}
              src={post.videoUrl}
              className="w-full h-full object-cover"
              loop
              muted={!soundEnabled}
              playsInline
              preload="auto"
              style={{ display: hasError ? 'none' : 'block' }}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
            <p>No video available</p>
          </div>
        )}

        {/* Double-tap heart animation */}
        {showHeartAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
          </div>
        )}

        {/* Play/Pause overlay */}
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-4">
              <Play className="w-12 h-12 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Top-left: User info */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => window.location.href = `/profile/${post.userId}`}
          className="flex items-center gap-2 text-white"
          aria-label={`View ${post.user.name}'s profile`}
        >
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback className="bg-gray-600 text-white">
              {post.user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm drop-shadow-lg">
              @{post.user.username || post.user.name.toLowerCase().replace(/\s+/g, '')}
            </span>
            {!isFollowing && post.userId !== user?.id && (
              <Button
                size="sm"
                onClick={handleFollow}
                className="mt-1 h-6 px-3 text-xs bg-white text-black hover:bg-gray-200"
                aria-label={`Follow ${post.user.name}`}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Follow
              </Button>
            )}
            {isFollowing && (
              <Button
                size="sm"
                onClick={handleFollow}
                className="mt-1 h-6 px-3 text-xs bg-gray-800 text-white hover:bg-gray-700"
                aria-label={`Unfollow ${post.user.name}`}
              >
                <Check className="w-3 h-3 mr-1" />
                Following
              </Button>
            )}
          </div>
        </button>
      </div>

      {/* Bottom-left: Caption & Music */}
      <div className="absolute bottom-20 left-4 right-20 z-10 text-white">
        {/* Caption */}
        {post.content && (
          <div className="mb-2">
            <p className="text-sm drop-shadow-lg">
              <span className="font-semibold">@{post.user.username || post.user.name.toLowerCase().replace(/\s+/g, '')}</span>{' '}
              <span>{getCaptionPreview()}</span>
              {post.content.length > 100 && (
                <button
                  onClick={() => setShowCaptionExpanded(!showCaptionExpanded)}
                  className="text-gray-300 ml-1"
                >
                  {showCaptionExpanded ? 'See less' : 'See more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Music marquee */}
        {(musicTitle || musicArtist) && (
          <div className="flex items-center gap-2 mt-2 overflow-hidden max-w-[calc(100%-80px)]">
            <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-marquee whitespace-nowrap">
                <span className="text-xs text-white drop-shadow-lg">
                  {musicTitle && musicArtist ? `${musicTitle} - ${musicArtist}` : musicTitle || musicArtist}
                </span>
                <span className="text-xs text-white drop-shadow-lg ml-8">
                  {musicTitle && musicArtist ? `${musicTitle} - ${musicArtist}` : musicTitle || musicArtist}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right action column */}
      <div className="absolute bottom-20 right-4 z-10 flex flex-col items-center gap-5">
        {/* Profile avatar & follow */}
        <button
          onClick={handleFollow}
          className="flex flex-col items-center"
          aria-label={isFollowing ? `Unfollow ${post.user.name}` : `Follow ${post.user.name}`}
        >
          <Avatar className="w-14 h-14 border-2 border-white mb-1">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback className="bg-gray-600 text-white">
              {post.user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {!isFollowing && post.userId !== user?.id && (
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mt-1">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
          )}
        </button>

        {/* Like */}
        <button
          onClick={handleLikeClick}
          className="flex flex-col items-center"
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isLiked ? 'bg-red-500' : 'bg-white/20'
          }`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-white text-white' : 'text-white'}`} />
          </div>
          <span className="text-xs text-white font-semibold mt-1 drop-shadow-lg">
            {likeCount > 0 ? formatCount(likeCount) : ''}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center"
          aria-label="View comments"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-white font-semibold mt-1 drop-shadow-lg">
            {commentCount > 0 ? formatCount(commentCount) : ''}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShare(post);
          }}
          className="flex flex-col items-center"
          aria-label="Share reel"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
        </button>

        {/* More menu */}
        <DropdownMenu open={showContextMenu} onOpenChange={setShowContextMenu}>
          <DropdownMenuTrigger asChild>
            <button
              className="flex flex-col items-center"
              aria-label="More options"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MoreVertical className="w-6 h-6 text-white" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onSave && (
              <DropdownMenuItem onClick={() => onSave(post.id)}>
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </DropdownMenuItem>
            )}
            {onDownload && (
              <DropdownMenuItem onClick={() => onDownload(post.id)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            {onReport && (
              <DropdownMenuItem onClick={() => onReport(post.id)} className="text-red-600">
                <Flag className="w-4 h-4 mr-2" />
                Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sound toggle (top-right) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSoundToggle();
        }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        aria-label={soundEnabled ? 'Mute' : 'Unmute'}
      >
        {soundEnabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Comments Modal */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user.avatar} />
                  <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{comment.user.name}</p>
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
            />
            <Button onClick={handleCommentSubmit} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper to format counts (1.2K, 1.5M, etc.)
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export default TikTokReelCard;

