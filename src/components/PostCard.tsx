import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoreVertical, ThumbsUp, MessageSquare, Share2, Edit, Trash2, Download, Pin, Send, X, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import ClickableUserInfo from './ClickableUserInfo';
import ConfirmationDialog from './ui/confirmation-dialog';
import { useDownload } from '@/hooks/useDownload';
import ImageModal from './ImageModal';
import ThemeAwareDialog from './ThemeAwareDialog';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import ShareBoard from './ShareBoard';
import PremiumCodeVerification from './PremiumCodeVerification';

interface PostCardProps {
  post: any;
  onPostUpdate: () => void;
}

// Offline-aware image component with glass placeholder
interface OfflineAwareImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

const IMAGE_CACHE_NAME = 'wizchat-post-images-v1';

// Cache an image locally so it never re-downloads
async function getCachedImageUrl(originalSrc: string): Promise<string> {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cached = await cache.match(originalSrc);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
    // Not cached yet — fetch, store, and return blob URL
    const response = await fetch(originalSrc);
    if (response.ok) {
      const cloned = response.clone();
      await cache.put(originalSrc, cloned);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch {}
  return originalSrc; // fallback to original
}

function OfflineAwareImage({ src, alt, className, ...props }: OfflineAwareImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(src);

  // On mount / src change, try to load from local cache first
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
    let revoke: string | null = null;

    getCachedImageUrl(src).then(url => {
      setDisplaySrc(url);
      if (url !== src) revoke = url;
    });

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);

  if (hasError) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-muted/30 backdrop-blur-xl border border-border/50 rounded-lg ${className}`}
        style={{ minHeight: '200px', aspectRatio: '16/9' }}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 backdrop-blur-sm flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground/70" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Image not available offline
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Connect to view this content
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div 
          className={`flex items-center justify-center bg-muted/20 backdrop-blur-sm animate-pulse rounded-lg ${className}`}
          style={{ minHeight: '200px', aspectRatio: '16/9' }}
        >
          <div className="w-12 h-12 rounded-full bg-muted/30 backdrop-blur-sm" />
        </div>
      )}
      <img
        src={displaySrc}
        alt={alt}
        className={`${className} ${isLoaded ? '' : 'hidden'}`}
        loading="eager"
        decoding="sync"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
    </>
  );
}

type LazyVideoProps = {
  videoUrl: string;
  posterUrl?: string;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
};

function LazyVideo({ videoUrl, posterUrl, onLongPressStart, onLongPressEnd }: LazyVideoProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  return (
    <div className="mt-2 rounded-lg overflow-hidden relative">
      {!shouldLoad ? (
        <button
          type="button"
          onClick={() => setShouldLoad(true)}
          className="group relative block w-full"
          aria-label="Tap to load video"
          onTouchStart={onLongPressStart}
          onTouchEnd={onLongPressEnd}
          onMouseDown={onLongPressStart}
          onMouseUp={onLongPressEnd}
          onMouseLeave={onLongPressEnd}
        >
          {/* Poster only (no video request until user taps) */}
          <div
            className="w-full max-h-96 aspect-video bg-muted flex items-center justify-center"
            style={posterUrl ? { backgroundImage: `url(${posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          />
          <div className="absolute inset-0 bg-background/40 group-hover:bg-background/50 transition-colors flex items-center justify-center">
            <div className="rounded-full bg-background/80 text-foreground px-4 py-2 text-sm font-medium border">
              Tap to play
            </div>
          </div>
        </button>
      ) : (
        <video
          src={videoUrl}
          controls
          className="w-full max-h-96 rounded-lg"
          preload="none"
          poster={posterUrl}
          style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}

const PostCard = ({ post, onPostUpdate }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const initialLikes = useMemo(() => (Array.isArray(post.likes) ? post.likes : []), [post.likes]);
  const initialLikeCount = useMemo(() => (typeof post.likeCount === 'number' ? post.likeCount : initialLikes.length), [post.likeCount, initialLikes.length]);
  const initialIsLiked = useMemo(() => !!post.isLiked, [post.isLiked]);

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const { downloadMedia } = useDownload();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showShareBoard, setShowShareBoard] = useState(false);
  const [showPinPremium, setShowPinPremium] = useState(false);

  // Keep like UI in sync with incoming post props without triggering network calls
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, initialIsLiked, initialLikeCount]);

  // Initialize comments from post data (no auto-fetch on feed mount)
  useEffect(() => {
    if (post.comments && Array.isArray(post.comments)) {
      setComments(post.comments);
    }
  }, [post.id, post.comments]);

  // Load + subscribe to comments only when user opens the modal (saves data on Home feed)
  useEffect(() => {
    if (!showCommentModal) return;

    loadComments();
    const channel = supabase
      .channel(`post_comments:${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${post.id}`,
      }, () => {
        loadComments();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${post.id}`,
      }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCommentModal, post.id]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const commentsData = await dataService.getComments(post.id);
      
      // Fetch user profiles for each comment
      const commentsWithUsers = await Promise.all(
        commentsData.map(async (comment: any) => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', comment.userId)
              .single();
            
            return {
              id: comment.id,
              content: comment.content,
              createdAt: comment.createdAt,
              user: profile ? {
                id: profile.id,
                name: profile.name,
                username: profile.username,
                email: profile.email,
                avatar: profile.avatar,
                photoURL: profile.avatar
              } : comment.user
            };
          } catch (err) {
            return {
              id: comment.id,
              content: comment.content,
              createdAt: comment.createdAt,
              user: comment.user || null
            };
          }
        })
      );
      
      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLikePost = async () => {
    if (!user) return;

    // Play sound effect
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = isLiked ? 200 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Fallback: silent if audio fails
      console.log('Audio not available');
    }

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    // Optimistic UI update
    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      await dataService.likePost(post.id);
      // Important: do NOT trigger full Home feed reload (saves data)
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      
      console.error('Error liking post:', error);
        toast({
          title: "Notice",
          description: "your like count will be updated once you are connected"
        });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setPostingComment(true);
    try {
      await dataService.createComment(post.id, newComment.trim());
      setNewComment('');
      await loadComments();
      toast({
        title: "Success",
        description: "Comment posted successfully"
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      await dataService.deletePost(post.id);
      onPostUpdate();
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isVideoDownload, setIsVideoDownload] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');

  const handleLongPressStart = (mediaUrl: string, isVideo: boolean) => {
    setLongPressProgress(0);
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 4000) * 100, 100);
      setLongPressProgress(progress);
      
      if (elapsed >= 4000) {
        clearInterval(progressInterval);
      }
    }, 50);
    
    const timer = setTimeout(() => {
      setDownloadUrl(mediaUrl);
      setIsVideoDownload(isVideo);
      setShowDownloadConfirm(true);
      clearInterval(progressInterval);
      setLongPressProgress(100);
    }, 4000);
    setLongPressTimer(timer);
  };

  const handleDownloadConfirm = () => {
    const extension = isVideoDownload ? '.mp4' : '.jpg';
    downloadMedia(downloadUrl, `wizchat_media_${post.id}${extension}`);
    setShowDownloadConfirm(false);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setLongPressProgress(0);
  };

  const handleUpdatePost = async () => {
    try {
      await dataService.updatePost(post.id, { content: editedContent });
      setIsEditing(false);
      onPostUpdate();
      toast({
        title: "Success",
        description: "Post updated successfully"
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Check if this is an optimistic post (temporary ID)
  const isOptimistic = post.id.startsWith('temp-');

  return (
    <>
      <Card 
        className={`w-full border-2 border-green-500 bg-background ${isOptimistic ? 'opacity-75 animate-pulse' : ''}`}
        data-post-id={post.id}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <ClickableUserInfo 
              user={post.user}
              showAvatar={true}
              showName={true}
              avatarSize="w-10 h-10"
            />
            
            <div className="flex items-center space-x-2">
              {isOptimistic && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span>Posting...</span>
                </div>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatDistanceToNow(post.createdAt, { addSuffix: true })}
              </span>
              
              {user?.id === post.userId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowPinDialog(true)}>
                      <Pin className="mr-2 h-4 w-4" /> Pin Post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mb-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="border-2 border-green-500 bg-white dark:bg-gray-700"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdatePost} className="bg-green-600 hover:bg-green-700">
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              {post.content && <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">{post.content}</p>}
              
              {/* Media content */}
              {Array.isArray(post.imageUrls) && post.imageUrls.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {post.imageUrls.map((img, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden">
                      <OfflineAwareImage
                        src={img}
                        alt={`Post image ${idx + 1}`}
                        className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setImageModalSrc(img);
                          setImageModalOpen(true);
                        }}
                        onTouchStart={() => handleLongPressStart(img, false)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={() => handleLongPressStart(img, false)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                      />
                    </div>
                  ))}
                </div>
              ) : post.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden">
                  <OfflineAwareImage 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setImageModalSrc(post.imageUrl!);
                      setImageModalOpen(true);
                    }}
                    onTouchStart={() => handleLongPressStart(post.imageUrl!, false)}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={() => handleLongPressStart(post.imageUrl!, false)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                  />
                </div>
              )}
              
               {post.videoUrl && (
                 <LazyVideo
                   videoUrl={post.videoUrl}
                   posterUrl={post.imageUrl || `${post.videoUrl}#t=0.5`}
                   onLongPressStart={() => handleLongPressStart(post.videoUrl!, true)}
                   onLongPressEnd={handleLongPressEnd}
                 />
               )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border border-black dark:border-white rounded-lg p-0.5 sm:p-1 overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLikePost} 
                className={`relative hover:text-green-500 transition-colors flex-1 min-w-0 ${isLiked ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'} border-0 px-1 sm:px-2`}
                disabled={isOptimistic}
              >
                <ThumbsUp 
                  className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 transition-all duration-300 ${isLiked ? 'fill-green-500 text-green-500' : ''} ${isAnimating ? 'scale-150 rotate-12' : 'scale-100 rotate-0'}`} 
                />
                <span className="text-xs sm:text-sm truncate">Like</span>
                {likeCount > 0 && (
                  <span className={`ml-0.5 sm:ml-1 text-xs sm:text-sm flex-shrink-0 transition-all duration-300 ${isAnimating ? 'scale-125 font-bold' : ''}`}>
                    ({likeCount})
                  </span>
                )}
                {isAnimating && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                )}
              </Button>
              <div className="w-px h-4 sm:h-6 bg-black dark:bg-white flex-shrink-0"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCommentModal(true)}
                className="text-gray-600 dark:text-gray-400 border-0 flex-1 min-w-0 px-1 sm:px-2"
                disabled={isOptimistic}
              >
                <MessageSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">Comment</span>
                {comments.length > 0 && <span className="ml-0.5 sm:ml-1 text-xs sm:text-sm flex-shrink-0">({comments.length})</span>}
              </Button>
              <div className="w-px h-4 sm:h-6 bg-black dark:bg-white flex-shrink-0"></div>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={isOptimistic}
                className="text-gray-600 dark:text-gray-400 border-0 flex-1 min-w-0 px-1 sm:px-2"
                onClick={() => setShowShareBoard(true)}
              >
                <Share2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">Share</span>
              </Button>
            </div>
          </div>
        </CardContent>
        
        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Post"
          description="Are you sure you want to delete this post? This action cannot be undone."
          onConfirm={handleDeletePost}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
        
        <ConfirmationDialog
          open={showDownloadConfirm}
          onOpenChange={setShowDownloadConfirm}
          title="Download Media"
          description="Do you want to download this media to your device?"
          onConfirm={handleDownloadConfirm}
          confirmText="Download"
          cancelText="Cancel"
        />
        
        <ImageModal
          src={imageModalSrc}
          alt="Post image"
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
        />
        
        <ThemeAwareDialog
          open={showPinDialog}
          onOpenChange={setShowPinDialog}
          title="Pin Post"
          description="Get premium to pin this post to the top of your feed!"
          onConfirm={() => {
            setShowPinDialog(false);
            setShowPinPremium(true);
          }}
          confirmText="Get Premium"
          cancelText="Cancel"
        />
        
        <PremiumCodeVerification 
          open={showPinPremium}
          onOpenChange={setShowPinPremium}
          featureName="Pin Post"
          onVerified={async () => {
            await dataService.pinPost(post.id);
            toast({ title: 'Success 🎉', description: 'Post pinned for 24 hours!' });
            onPostUpdate();
          }}
        />
        
        <ShareBoard
          open={showShareBoard}
          onOpenChange={setShowShareBoard}
          post={post}
        />
      </Card>

      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Comments ({comments.length})
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 mt-4">
            {loadingComments ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <ClickableUserInfo 
                      user={comment.user}
                      showAvatar={true}
                      showName={false}
                      avatarSize="w-8 h-8"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ClickableUserInfo 
                          user={comment.user}
                          showAvatar={false}
                          showName={true}
                          className="font-semibold text-sm"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add Comment */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                rows={2}
              />
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim() || postingComment}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {postingComment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostCard;
