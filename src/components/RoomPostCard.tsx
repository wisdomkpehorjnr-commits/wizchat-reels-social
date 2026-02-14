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
import { MoreVertical, ThumbsUp, ThumbsDown, MessageSquare, Share2, Edit, Trash2, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ClickableUserInfo from './ClickableUserInfo';
import ConfirmationDialog from './ui/confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import ShareBoard from './ShareBoard';

interface RoomPostCardProps {
  post: any;
  onPostUpdate: () => void;
}

const RoomPostCard = ({ post, onPostUpdate }: RoomPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [showShareBoard, setShowShareBoard] = useState(false);

  // Load likes and dislikes
  useEffect(() => {
    loadLikes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, user?.id]);

  // Subscribe to real-time reaction updates
  useEffect(() => {
    const reactionsChannel = supabase
      .channel(`room_post_reactions:${post.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_post_reactions',
        filter: `post_id=eq.${post.id}`
      }, () => {
        // Reload reactions when they change
        loadLikes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reactionsChannel);
    };
  }, [post.id]);

  // Load comment count initially and subscribe to real-time updates
  useEffect(() => {
    // Load initial comment count
    const loadInitialCommentCount = async () => {
      try {
        const { count, error } = await (supabase as any)
          .from('room_post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (!error && count !== null) {
          setCommentCount(count);
        }
      } catch (error) {
        console.error('Error loading initial comment count:', error);
      }
    };
    
    loadInitialCommentCount();

    // Subscribe to new comments for real-time count updates
    const channel = supabase
      .channel(`room_post_comments:${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_post_comments',
        filter: `post_id=eq.${post.id}`
      }, async () => {
        if (showCommentModal) {
          loadComments();
        } else {
          // Just reload count
          const { count } = await (supabase as any)
            .from('room_post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          if (count !== null) setCommentCount(count);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'room_post_comments',
        filter: `post_id=eq.${post.id}`
      }, async () => {
        if (showCommentModal) {
          loadComments();
        } else {
          const { count } = await (supabase as any)
            .from('room_post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          if (count !== null) setCommentCount(count);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  // Load full comments when modal opens
  useEffect(() => {
    if (showCommentModal) {
      loadComments();
    }
  }, [showCommentModal]);

  const loadLikes = async () => {
    try {
      // Try room_post_reactions first (for room posts)
      const { data: roomReactions, error: roomError } = await (supabase as any)
        .from('room_post_reactions')
        .select('*')
        .eq('post_id', post.id);
      
      if (!roomError && roomReactions) {
        const likes = roomReactions.filter((r: any) => r.emoji === '👍');
        const dislikes = roomReactions.filter((r: any) => r.emoji === '👎');
        setLikeCount(likes.length);
        setDislikeCount(dislikes.length);
        if (user) {
          setIsLiked(!!likes.find((r: any) => r.user_id === user.id));
          setIsDisliked(!!dislikes.find((r: any) => r.user_id === user.id));
        }
        return;
      }

      // Fallback to reactions table
      const { data: reactions, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', post.id);
      
      if (!error && reactions) {
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
    setLoadingComments(true);
    try {
      // Fetch comments
      const { data: commentsData, error } = await (supabase as any)
        .from('room_post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading comments:', error);
        setComments([]);
        setCommentCount(0);
        return;
      }
      
      if (commentsData) {
        // Fetch profiles for each comment
        const commentsWithUsers = await Promise.all(
          commentsData.map(async (comment: any) => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', comment.user_id)
                .single();
              return {
                id: comment.id,
                content: comment.content,
                createdAt: new Date(comment.created_at),
                user: profile || null
              };
            } catch (err) {
              return {
                id: comment.id,
                content: comment.content,
                createdAt: new Date(comment.created_at),
                user: null
              };
            }
          })
        );
        setComments(commentsWithUsers);
        setCommentCount(commentsWithUsers.length);
      } else {
        setComments([]);
        setCommentCount(0);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
      setCommentCount(0);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLikePost = async () => {
    if (!user) return;

    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    
    // Optimistic update
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      if (isDisliked) {
        setIsDisliked(false);
        setDislikeCount(prev => Math.max(0, prev - 1));
      }
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    }

    try {
      // Use room_post_reactions for room posts
      if (wasLiked) {
        const { error } = await (supabase as any)
          .from('room_post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('emoji', '👍');
        
        if (error) {
          console.error('Delete like error:', error);
          throw error;
        }
      } else {
        // Delete dislike if exists
        if (wasDisliked) {
          const { error } = await (supabase as any)
            .from('room_post_reactions')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('emoji', '👎');
          
          if (error) {
            console.error('Delete dislike error:', error);
            throw error;
          }
        }
        
        // Check if reaction already exists (handle unique constraint)
        const { data: existing } = await (supabase as any)
          .from('room_post_reactions')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('emoji', '👍')
          .maybeSingle();
        
        if (!existing) {
          const { error: insertError } = await (supabase as any)
            .from('room_post_reactions')
            .insert({
              post_id: post.id,
              user_id: user.id,
              emoji: '👍'
            });
          
          if (insertError) {
            // If it's a unique constraint error, it's okay - reaction already exists
            if (insertError.code !== '23505') {
              console.error('Insert like error:', insertError);
              throw insertError;
            }
          }
        }
      }
      
      // Show success message
      toast({
        title: "Success! 👍",
        description: wasLiked ? "Like removed" : "Post liked successfully"
      });
      
      // Sync with server after a brief delay (real-time subscription will also update)
      setTimeout(() => {
        loadLikes();
      }, 300);
    } catch (error: any) {
      console.error('Error liking post:', error);
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      setDislikeCount(prev => wasDisliked ? prev + 1 : prev - 1);
      loadLikes();
      toast({
        title: "Notice",
        description: "your like count will be updated once you are connected"
      });
    }
  };

  const handleDislikePost = async () => {
    if (!user) return;

    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    
    // Optimistic update
    if (isDisliked) {
      setIsDisliked(false);
      setDislikeCount(prev => Math.max(0, prev - 1));
    } else {
      if (isLiked) {
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      }
      setIsDisliked(true);
      setDislikeCount(prev => prev + 1);
    }

    try {
      // Use room_post_reactions for room posts
      if (wasDisliked) {
        const { error } = await (supabase as any)
          .from('room_post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('emoji', '👎');
        
        if (error) {
          console.error('Delete dislike error:', error);
          throw error;
        }
      } else {
        // Delete like if exists
        if (wasLiked) {
          const { error } = await (supabase as any)
            .from('room_post_reactions')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .eq('emoji', '👍');
          
          if (error) {
            console.error('Delete like error:', error);
            throw error;
          }
        }
        
        // Check if reaction already exists (handle unique constraint)
        const { data: existing } = await (supabase as any)
          .from('room_post_reactions')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('emoji', '👎')
          .maybeSingle();
        
        if (!existing) {
          const { error: insertError } = await (supabase as any)
            .from('room_post_reactions')
            .insert({
              post_id: post.id,
              user_id: user.id,
              emoji: '👎'
            });
          
          if (insertError) {
            // If it's a unique constraint error, it's okay - reaction already exists
            if (insertError.code !== '23505') {
              console.error('Insert dislike error:', insertError);
              throw insertError;
            }
          }
        }
      }
      
      // Show success message
      toast({
        title: "Success! 👎",
        description: wasDisliked ? "Dislike removed" : "Post disliked successfully"
      });
      
      // Sync with server after a brief delay (real-time subscription will also update)
      setTimeout(() => {
        loadLikes();
      }, 300);
    } catch (error: any) {
      console.error('Error disliking post:', error);
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      setDislikeCount(prev => wasDisliked ? prev + 1 : prev - 1);
      loadLikes();
      toast({
        title: "Error",
        description: error.message || "Failed to dislike post",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    const commentContent = newComment.trim();
    setPostingComment(true);
    
    // Optimistic update - add comment immediately
    const tempComment = {
      id: `temp-${Date.now()}`,
      content: commentContent,
      createdAt: new Date(),
      user: {
        id: user.id,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || user.photoURL || '',
      }
    };
    
    setComments(prev => [...prev, tempComment]);
    setCommentCount(prev => prev + 1);
    setNewComment('');

    try {
      const { data, error } = await (supabase as any)
        .from('room_post_comments')
        .insert([{
          post_id: post.id,
          user_id: user.id,
          content: commentContent
        }])
        .select()
        .single();

      if (error) {
        console.error('Insert comment error:', error);
        throw error;
      }

      // Replace temp comment with real one
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setComments(prev => prev.map(c => 
          c.id === tempComment.id 
            ? {
                id: data.id,
                content: (data as any).content,
                createdAt: new Date((data as any).created_at),
                user: profile || tempComment.user
              }
            : c
        ));
        // Comment count already updated optimistically
      }
      
      toast({
        title: "Success! 💬",
        description: "Comment posted successfully"
      });
    } catch (error: any) {
      console.error('Error creating comment:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setCommentCount(prev => Math.max(0, prev - 1));
      setNewComment(commentContent); // Restore comment text
      toast({
        title: "Error",
        description: error.message || error.details || "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setPostingComment(false);
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
    <>
      <Card className="w-full border-2 border-green-500 bg-white dark:bg-gray-800">
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
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
              {/* Text-only posts with glass background */}
              {post.content && !post.image_url && !post.video_url && (
                <div className="backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-2xl p-6 shadow-xl mb-4">
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-lg leading-relaxed">{post.content}</p>
                </div>
              )}
              
              {/* Text with media - show text above media */}
              {post.content && (post.image_url || post.video_url) && (
                <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">{post.content}</p>
              )}
              
              {/* Media content */}
              {post.image_url && (
                <div 
                  className="mt-2 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setShowImageModal(true)}
                >
                  <img 
                    src={post.image_url} 
                    alt="Post content" 
                    className="w-full object-cover max-h-96 rounded-lg hover:opacity-90 transition-opacity"
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
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border border-black dark:border-white rounded-lg p-0.5 sm:p-1 overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLikePost} 
                className={`hover:text-blue-500 flex-1 min-w-0 ${isLiked ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'} border-0 px-1 sm:px-2`}
              >
                <ThumbsUp 
                  className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${isLiked ? 'fill-blue-500 text-blue-500' : ''}`} 
                />
                <span className="text-xs sm:text-sm truncate">Like</span>
                {likeCount > 0 && (
                  <span className="ml-0.5 sm:ml-1 text-xs sm:text-sm flex-shrink-0">({likeCount})</span>
                )}
              </Button>
              <div className="w-px h-4 sm:h-6 bg-black dark:bg-white flex-shrink-0"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDislikePost} 
                className={`hover:text-red-500 flex-1 min-w-0 ${isDisliked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'} border-0 px-1 sm:px-2`}
              >
                <ThumbsDown 
                  className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${isDisliked ? 'fill-red-500 text-red-500' : ''}`} 
                />
                <span className="text-xs sm:text-sm truncate">Dislike</span>
                {dislikeCount > 0 && (
                  <span className="ml-0.5 sm:ml-1 text-xs sm:text-sm flex-shrink-0">({dislikeCount})</span>
                )}
              </Button>
              <div className="w-px h-4 sm:h-6 bg-black dark:bg-white flex-shrink-0"></div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCommentModal(true)}
                className="text-gray-600 dark:text-gray-400 border-0 flex-1 min-w-0 px-1 sm:px-2"
              >
                <MessageSquare className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">Comment</span>
                {commentCount > 0 && <span className="ml-0.5 sm:ml-1 text-xs sm:text-sm flex-shrink-0">({commentCount})</span>}
              </Button>
              <div className="w-px h-4 sm:h-6 bg-black dark:bg-white flex-shrink-0"></div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowShareBoard(true)}
                className="text-gray-600 dark:text-gray-400 border-0 flex-1 min-w-0 px-1 sm:px-2"
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
      </Card>

      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Comments ({commentCount})
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

      {/* Image Modal */}
      {showImageModal && post.image_url && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img 
              src={post.image_url} 
              alt="Post content" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
      
      <ShareBoard
        open={showShareBoard}
        onOpenChange={setShowShareBoard}
        post={{
          id: post.id,
          content: post.content,
          imageUrl: post.image_url,
          videoUrl: post.video_url,
          user: post.user ? {
            name: post.user.name || '',
            username: post.user.username || ''
          } : undefined
        }}
      />
    </>
  );
};

export default RoomPostCard;
