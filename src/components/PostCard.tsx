import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Heart, MessageSquare, Share, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import ClickableUserInfo from './ClickableUserInfo';
import ConfirmationDialog from './ui/confirmation-dialog';
import { useDownload } from '@/hooks/useDownload';
import ImageModal from './ImageModal';

interface PostCardProps {
  post: any;
  onPostUpdate: () => void;
}

const PostCard = ({ post, onPostUpdate }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const { downloadMedia } = useDownload();

  // Load likes when component mounts
  useEffect(() => {
    loadLikes();
  }, [post.id]);

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
    if (!newComment.trim()) return;

    try {
      await dataService.createComment(post.id, newComment);
      setNewComment('');
      onPostUpdate();
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
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
    const timer = setTimeout(() => {
      setDownloadUrl(mediaUrl);
      setIsVideoDownload(isVideo);
      setShowDownloadConfirm(true);
    }, 4000); // Extended to 4 seconds
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

  return (
    <Card className="w-full border-2 green-border">
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
            <span className="text-sm text-muted-foreground">
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
            <Input
              type="text"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="border-2 green-border"
            />
            <div className="flex justify-end mt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdatePost}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            {post.content && <p className="text-foreground mb-4">{post.content}</p>}
            
            {/* Media content */}
            {post.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden">
                <img 
                  src={post.imageUrl} 
                  alt="Post content" 
                  className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                  onLoad={() => console.log('Image loaded successfully:', post.imageUrl)}
                  onError={(e) => {
                    console.error('Failed to load image:', post.imageUrl);
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
                {/* Fallback preview for APK compatibility */}
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
        <div className="flex justify-between items-center text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={handleLikePost} className="hover:text-red-500">
            <Heart 
              className={`mr-2 h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
            />
            <span className={isLiked ? 'text-red-500' : ''}>
              Like {likeCount > 0 && <span className="ml-1">({likeCount})</span>}
            </span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAllComments(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Comment
          </Button>
          <Button variant="ghost" size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Comments */}
        <div className="mt-4 space-y-3">
          {post.comments.slice(0, showAllComments ? post.comments.length : 2).map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <ClickableUserInfo 
                user={comment.user}
                showAvatar={true}
                showName={false}
                avatarSize="w-6 h-6"
              />
              <div className="flex-1">
                <ClickableUserInfo 
                  user={comment.user}
                  showAvatar={false}
                  showName={true}
                  className="inline"
                />
                <span className="text-sm text-muted-foreground ml-2">{comment.content}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          
          {post.comments.length > 2 && !showAllComments && (
            <Button variant="link" size="sm" onClick={() => setShowAllComments(true)}>
              Show All Comments
            </Button>
          )}
        </div>

        {/* Add Comment */}
        <div className="mt-4 flex space-x-2">
          <Input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="border-2 green-border"
          />
          <Button onClick={handleAddComment} size="sm">
            Post
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
    </Card>
  );
};

export default PostCard;
