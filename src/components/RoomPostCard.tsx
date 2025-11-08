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
import { MoreVertical, ThumbsUp, ThumbsDown, MessageSquare, Share2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ClickableUserInfo from './ClickableUserInfo';
import ConfirmationDialog from './ui/confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';

interface RoomPostCardProps {
  post: any;
  onPostUpdate: () => void;
}

const RoomPostCard = ({ post, onPostUpdate }: RoomPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

  // Load likes and dislikes
  useEffect(() => {
    loadLikes();
    loadComments();
  }, [post.id]);

  const loadLikes = async () => {
    try {
      // Use reactions table with emoji for thumbs up/down
      // 👍 for like, 👎 for dislike
      const { data: reactions, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', post.id);
      
      if (error) {
        // If reactions table doesn't work, try room_post_reactions
        try {
          const { data: roomReactions } = await supabase
            .from('room_post_reactions')
            .select('*')
            .eq('post_id', post.id);
          
          if (roomReactions) {
            const likes = roomReactions.filter((r: any) => r.emoji === '👍' || r.reaction_type === 'like');
            const dislikes = roomReactions.filter((r: any) => r.emoji === '👎' || r.reaction_type === 'dislike');
            setLikeCount(likes.length);
            setDislikeCount(dislikes.length);
            if (user) {
              setIsLiked(!!likes.find((r: any) => r.user_id === user.id));
              setIsDisliked(!!dislikes.find((r: any) => r.user_id === user.id));
            }
          }
        } catch (err) {
          // Tables don't exist yet, that's okay
          console.log('Room post reactions table not found, please run migration');
        }
        return;
      }
      
      if (reactions) {
        const likes = reactions.filter(r => r.emoji === '👍');
        const dislikes = reactions.filter(r => r.emoji === '👎');
        
        setLikeCount(likes.length);
        setDislikeCount(dislikes.length);
        
        if (user) {
          setIsLiked(!!likes.find(r => r.user_id === user.id));
          setIsDisliked(!!dislikes.find(r => r.user_id === user.id));
        }
      }
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };

  const loadComments = async () => {
    try {
      // Try room_post_comments first, fallback to comments table
      let data, error;
      ({ data, error } = await supabase
        .from('room_post_comments')
        .select('*, user:profiles(*)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true }));
      
      if (error) {
        // Fallback: try comments table
        ({ data, error } = await supabase
          .from('comments')
          .select('*, user:profiles(*)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true })
          .catch(() => ({ data: null, error: null })));
      }
      
      if (!error && data) {
        setComments(data.map((c: any) => ({
          id: c.id,
          content: c.content,
          createdAt: new Date(c.created_at),
          user: c.user
        })));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLikePost = async () => {
    if (!user) return;

    try {
      // Optimistic update
      const wasLiked = isLiked;
      const wasDisliked = isDisliked;
      
      if (isLiked) {
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        if (isDisliked) {
          setIsDisliked(false);
          setDislikeCount(prev => prev - 1);
        }
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }

      // Try reactions table first (for regular posts)
      let error;
      if (wasLiked) {
        // Remove like
        ({ error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('emoji', '👍'));
      } else {
        // Remove dislike if exists
        if (wasDisliked) {
          await supabase
            .from('reactions')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('emoji', '👎');
        }
        // Add like
        ({ error } = await supabase
          .from('reactions')
          .insert([{
            post_id: post.id,
            user_id: user.id,
            emoji: '👍'
          }]));
      }

      // If reactions table doesn't work, try room_post_reactions
      if (error) {
        if (wasLiked) {
          await supabase
            .from('room_post_reactions')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('emoji', '👍')
            .catch(() => {});
        } else {
          if (wasDisliked) {
            await supabase
              .from('room_post_reactions')
              .delete()
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .eq('emoji', '👎')
              .catch(() => {});
          }
          await supabase
            .from('room_post_reactions')
            .insert([{
              post_id: post.id,
              user_id: user.id,
              emoji: '👍'
            }])
            .catch(() => {});
        }
      }
      
      loadLikes(); // Reload to sync
      onPostUpdate();
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert optimistic update
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      loadLikes();
      toast({
        title: "Error",
        description: "Failed to like post. Please ensure database tables are set up.",
        variant: "destructive"
      });
    }
  };

  const handleDislikePost = async () => {
    if (!user) return;

    try {
      // Optimistic update
      const wasLiked = isLiked;
      const wasDisliked = isDisliked;
      
      if (isDisliked) {
        setIsDisliked(false);
        setDislikeCount(prev => prev - 1);
      } else {
        if (isLiked) {
          setIsLiked(false);
          setLikeCount(prev => prev - 1);
        }
        setIsDisliked(true);
        setDislikeCount(prev => prev + 1);
      }

      // Try reactions table first
      let error;
      if (wasDisliked) {
        ({ error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('emoji', '👎'));
      } else {
        // Remove like if exists
        if (wasLiked) {
          await supabase
            .from('reactions')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('emoji', '👍');
        }
        // Add dislike
        ({ error } = await supabase
          .from('reactions')
          .insert([{
            post_id: post.id,
            user_id: user.id,
            emoji: '👎'
          }]));
      }

      // If reactions table doesn't work, try room_post_reactions
      if (error) {
        if (wasDisliked) {
          await supabase
            .from('room_post_reactions')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('emoji', '👎')
            .catch(() => {});
        } else {
          if (wasLiked) {
            await supabase
              .from('room_post_reactions')
              .delete()
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .eq('emoji', '👍')
              .catch(() => {});
          }
          await supabase
            .from('room_post_reactions')
            .insert([{
              post_id: post.id,
              user_id: user.id,
              emoji: '👎'
            }])
            .catch(() => {});
        }
      }
      
      loadLikes(); // Reload to sync
      onPostUpdate();
    } catch (error) {
      console.error('Error disliking post:', error);
      // Revert optimistic update
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      loadLikes();
      toast({
        title: "Error",
        description: "Failed to dislike post. Please ensure database tables are set up.",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      // Try room_post_comments first, fallback to comments
      let error;
      ({ error } = await supabase
        .from('room_post_comments')
        .insert([{
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        }]));

      if (error) {
        // Fallback to comments table
        ({ error } = await supabase
          .from('comments')
          .insert([{
            post_id: post.id,
            user_id: user.id,
            content: newComment.trim()
          }]));
      }

      if (error) throw error;

      setNewComment('');
      loadComments();
      onPostUpdate();
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please ensure database tables are set up.",
        variant: "destructive"
      });
    }
  };

  const handleDeletePost = async () => {
    try {
      await supabase.from('room_posts').delete().eq('id', post.id);
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

  const handleUpdatePost = async () => {
    try {
      await supabase
        .from('room_posts')
        .update({ content: editedContent })
        .eq('id', post.id);
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
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            
            {user?.id === post.user_id && (
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
            {post.image_url && (
              <div className="mt-2 rounded-lg overflow-hidden">
                <img 
                  src={post.image_url} 
                  alt="Post content" 
                  className="w-full object-cover max-h-96 rounded-lg"
                />
              </div>
            )}
            
            {post.video_url && (
              <div className="mt-2 rounded-lg overflow-hidden relative">
                <video 
                  src={post.video_url} 
                  controls 
                  className="w-full max-h-96 rounded-lg cursor-pointer" 
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLikePost} 
              className={`hover:text-blue-500 ${isLiked ? 'text-blue-500' : ''}`}
            >
              <ThumbsUp 
                className={`mr-2 h-4 w-4 ${isLiked ? 'fill-blue-500 text-blue-500' : ''}`} 
              />
              <span className={isLiked ? 'text-blue-500' : ''}>
                {likeCount > 0 && <span>{likeCount}</span>}
              </span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDislikePost} 
              className={`hover:text-red-500 ${isDisliked ? 'text-red-500' : ''}`}
            >
              <ThumbsDown 
                className={`mr-2 h-4 w-4 ${isDisliked ? 'fill-red-500 text-red-500' : ''}`} 
              />
              <span className={isDisliked ? 'text-red-500' : ''}>
                {dislikeCount > 0 && <span>{dislikeCount}</span>}
              </span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAllComments(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Comment
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
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

        {/* Comments */}
        <div className="mt-4 space-y-3">
          {comments.slice(0, showAllComments ? comments.length : 1).map((comment) => (
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
          
          {comments.length > 1 && !showAllComments && (
            <Button variant="link" size="sm" onClick={() => setShowAllComments(true)} className="text-primary">
              Unhide {comments.length - 1} more comment{comments.length - 1 > 1 ? 's' : ''}
            </Button>
          )}
          {comments.length > 1 && showAllComments && (
            <Button variant="link" size="sm" onClick={() => setShowAllComments(false)} className="text-primary">
              Hide comments
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
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
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
    </Card>
  );
};

export default RoomPostCard;

