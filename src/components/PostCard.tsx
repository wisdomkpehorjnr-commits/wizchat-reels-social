import { useState, useEffect } from 'react';
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
import { MoreVertical, Heart, MessageSquare, Share2, Edit, Trash2, Download, Pin, Send, X } from 'lucide-react';
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

interface PostCardProps {
  post: any;
  onPostUpdate: () => void;
}

const PostCard = ({ post, onPostUpdate }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const { downloadMedia } = useDownload();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Load likes when component mounts
  useEffect(() => {
    loadLikes();
  }, [post.id]);

  // Load comments when modal opens
  useEffect(() => {
    if (showCommentModal) {
      loadComments();
      
      // Subscribe to new comments
      const channel = supabase
        .channel(`post_comments:${post.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${post.id}`
        }, () => {
          loadComments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [showCommentModal, post.id]);

  const loadLikes = async () => {
    try {
      const likes = await dataService.getLikes(post.id);
      setLikeCount(likes.length);
      
      if (user) {
        const userLike = likes.find(like => like.userId === user.id);
        setIsLiked(!!userLike);
      }
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };

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

    // Optimistic UI update
    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      await dataService.likePost(post.id);
      onPostUpdate();
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
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
      onPostUpdate();
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
        className={`w-full border-2 border-green-500 bg-white dark:bg-gray-800 ${isOptimistic ? 'opacity-75 animate-pulse' : ''}`}
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
                      <img
                        src={img}
                        alt={`Post image ${idx + 1}`}
                        className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setImageModalSrc(img);
                          setImageModalOpen(true);
                        }}
                        onLoad={() => console.log('Image loaded successfully:', img)}
                        onError={(e) => {
                          console.error('Failed to load image:', img);
                          console.error('Image error details:', e);
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
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                    onLoad={() => console.log('Image loaded successfully:', post.imageUrl)}
                    onError={(e) => {
                      console.error('Failed to load image:', post.imageUrl);
                      console.error('Image error details:', e);
                    }}
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
                <div className="mt-2 rounded-lg overflow-hidden relative">
                  <video 
                    src={post.videoUrl} 
                    controls 
                    className="w-full max-h-96 rounded-lg cursor-pointer" 
                    preload="metadata"
                    poster={post.imageUrl || `${post.videoUrl}#t=0.5`}
                    onLoadedData={() => console.log('Video loaded successfully:', post.videoUrl)}
                    onError={(e) => {
                      console.error('Failed to load video:', post.videoUrl);
                    }}
                    onTouchStart={() => handleLongPressStart(post.videoUrl!, true)}
                    onTouchEnd={handleLongPressEnd}
                    onMouseDown={() => handleLongPressStart(post.videoUrl!, true)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    style={{
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div 
                    className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      backgroundImage: post.imageUrl ? `url(${post.imageUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLikePost} 
                className={`hover:text-red-500 ${isLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'} border border-green-500`}
                disabled={isOptimistic}
              >
                <Heart 
                  className={`mr-2 h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
                />
                {likeCount > 0 && <span>{likeCount}</span>}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCommentModal(true)}
                className="text-gray-600 dark:text-gray-400 border border-green-500"
                disabled={isOptimistic}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Comment
                {comments.length > 0 && <span className="ml-1">({comments.length})</span>}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              disabled={isOptimistic}
              className="text-gray-600 dark:text-gray-400 border-[1px] border-green-500"
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: 'WizChat Post',
                      text: post.content || 'Check out this post on WizChat!',
                      url: window.location.href
                    });
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    toast({
                      title: "Link Copied",
                      description: "Post link copied to clipboard"
                    });
                  }
                } catch (error) {
                  console.error('Error sharing:', error);
                }
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
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
            navigate('/premium/wizboost');
          }}
          confirmText="Get Premium"
          cancelText="Cancel"
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
