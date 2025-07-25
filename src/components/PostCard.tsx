
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Send, Smile, Edit, Trash2 } from 'lucide-react';
import { Post, Comment } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import UserLink from './UserLink';

export interface PostCardProps {
  post: Post;
  onSave?: () => void;
  onPostUpdate?: () => void;
  onPostDelete?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onSave, onPostUpdate, onPostDelete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.likes.includes(user?.id || ''));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

  const handleLike = async () => {
    try {
      await dataService.likePost(post.id);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
      
      if (!liked) {
        toast({
          title: "Liked!",
          description: "You liked this post",
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const comment = await dataService.createComment(post.id, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    try {
      await dataService.updatePost(post.id, { content: editContent });
      setIsEditing(false);
      if (onPostUpdate) onPostUpdate();
      
      toast({
        title: "Post updated",
        description: "Your post has been updated",
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await dataService.deletePost(post.id);
      if (onPostDelete) onPostDelete();
      
      toast({
        title: "Post deleted",
        description: "Your post has been deleted",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleEmojiReaction = async (emoji: string) => {
    try {
      await dataService.reactToPost(post.id, emoji);
      setShowEmojiPicker(false);
      
      toast({
        title: "Reaction added",
        description: `You reacted with ${emoji}`,
      });
      
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  const loadComments = async () => {
    try {
      const postComments = await dataService.getComments(post.id);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  return (
    <Card className="border-2 green-border bg-card text-card-foreground">
      <CardContent className="p-4">
        {/* User Header */}
        <div className="flex items-center space-x-3 mb-3">
          <UserLink user={post.user}>
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.user.avatar} />
              <AvatarFallback className="text-foreground">{post.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </UserLink>
          <div className="flex-1">
            <UserLink user={post.user}>
              <p className="font-semibold text-foreground hover:underline">{post.user.name}</p>
            </UserLink>
            <UserLink user={post.user}>
              <p className="text-sm text-muted-foreground hover:underline">@{post.user.username}</p>
            </UserLink>
          </div>
          {user?.id === post.user.id && (
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
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
          {user?.id !== post.user.id && (
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded-md bg-background text-foreground"
                rows={3}
              />
              <div className="flex space-x-2">
                <Button onClick={handleEdit} size="sm">Save</Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-foreground">{post.content}</p>
          )}
        </div>

        {/* Media */}
        {post.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img src={post.imageUrl} alt="Post content" className="w-full h-auto" />
          </div>
        )}

        {post.videoUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <video src={post.videoUrl} controls className="w-full h-auto" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className={liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}
            >
              <Heart className="w-4 h-4 mr-1" fill={liked ? 'currentColor' : 'none'} />
              <span className="text-foreground">{likeCount}</span>
            </Button>
            
            <Dialog open={showComments} onOpenChange={setShowComments}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={loadComments}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span className="text-foreground">{comments.length}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Comments</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <UserLink user={comment.user}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user.avatar} />
                          <AvatarFallback className="text-foreground">{comment.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </UserLink>
                      <div className="flex-1">
                        <UserLink user={comment.user}>
                          <p className="font-medium text-foreground hover:underline">{comment.user.name}</p>
                        </UserLink>
                        <p className="text-foreground">{comment.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2 mt-4">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 text-foreground"
                    onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  />
                  <Button onClick={handleComment} size="sm" disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="w-4 h-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEmojiReaction(emoji)}
                        className="text-lg hover:bg-muted"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Share className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSave} 
            className="text-muted-foreground hover:text-foreground"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
