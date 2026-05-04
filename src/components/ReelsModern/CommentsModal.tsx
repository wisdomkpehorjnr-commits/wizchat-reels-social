import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, ChevronDown, ChevronUp, CornerDownRight, Trash2, Pencil } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CommentData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  parentId?: string;
  likes: number;
  isLiked: boolean;
  replies?: CommentData[];
}

interface CommentsModalProps {
  reelId: string;
  open: boolean;
  onClose: () => void;
}

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return `${weeks}w`;
};

export const CommentsModal: React.FC<CommentsModalProps> = ({ reelId, open, onClose }) => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    loadComments();
  }, [open, reelId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetched = await dataService.getComments(reelId);
      const mapped: CommentData[] = fetched.map((c: any) => ({
        id: c.id,
        userId: c.userId || c.user?.id || '',
        userName: c.user?.name || 'User',
        userAvatar: c.user?.avatar || c.user?.photoURL,
        content: c.content,
        createdAt: c.createdAt?.toISOString?.() || new Date().toISOString(),
        likes: 0,
        isLiked: false,
        replies: [],
      }));
      setComments(mapped);
    } catch {
      try {
        const raw = localStorage.getItem(`reel_comments_${reelId}`) || '[]';
        setComments(JSON.parse(raw));
      } catch { setComments([]); }
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      if (user) {
        const created = await dataService.createComment(reelId, trimmed);
        const newComment: CommentData = {
          id: created.id,
          userId: user.id,
          userName: created.user?.name || (user as any)?.name || 'You',
          userAvatar: created.user?.avatar,
          content: created.content,
          createdAt: created.createdAt?.toISOString?.() || new Date().toISOString(),
          likes: 0,
          isLiked: false,
        };

        if (replyingTo) {
          setComments(prev => prev.map(c => {
            if (c.id === replyingTo.id) {
              return { ...c, replies: [...(c.replies || []), newComment] };
            }
            return c;
          }));
        } else {
          setComments(prev => [newComment, ...prev]);
        }
      }
      setText('');
      setReplyingTo(null);
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await supabase.from('comments').delete().eq('id', commentId);
      setComments(prev => prev.filter(c => c.id !== commentId).map(c => ({
        ...c,
        replies: c.replies?.filter(r => r.id !== commentId),
      })));
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await supabase.from('comments').update({ content: editText.trim() }).eq('id', commentId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, content: editText.trim() };
        return {
          ...c,
          replies: c.replies?.map(r => r.id === commentId ? { ...r, content: editText.trim() } : r),
        };
      }));
      setEditingId(null);
      setEditText('');
    } catch {
      toast({ title: 'Edit failed', variant: 'destructive' });
    }
  };

  const handleReply = (comment: CommentData) => {
    setReplyingTo({ id: comment.id, userName: comment.userName });
    inputRef.current?.focus();
  };

  const toggleReplies = (id: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!open) return null;

  const renderComment = (comment: CommentData, isReply = false) => {
    const isOwn = user?.id === comment.userId;
    const isEditing = editingId === comment.id;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2.5 ${isReply ? 'ml-10' : ''}`}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.userAvatar} />
          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
            {comment.userName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{comment.userName}</span>
            <span className="text-xs text-muted-foreground">· {formatTimeAgo(comment.createdAt)}</span>
          </div>

          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEdit(comment.id)}
                className="flex-1 text-sm p-1.5 rounded-lg bg-muted text-foreground border border-border focus:outline-none"
                autoFocus
              />
              <button onClick={() => handleEdit(comment.id)} className="text-xs text-primary font-semibold">Save</button>
              <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          ) : (
            <p className="text-sm text-foreground/90 mt-0.5 break-words">{comment.content}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1.5">
            {!isReply && (
              <button
                onClick={() => handleReply(comment)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Reply
                {comment.replies && comment.replies.length > 0 && (
                  <span className="ml-1">· {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                )}
              </button>
            )}
            {isOwn && !isEditing && (
              <>
                <button onClick={() => { setEditingId(comment.id); setEditText(comment.content); }} className="text-xs text-muted-foreground hover:text-foreground">
                  Edit
                </button>
                <button onClick={() => handleDelete(comment.id)} className="text-xs text-destructive hover:text-destructive/80">
                  Delete
                </button>
              </>
            )}
          </div>

          {/* Expand replies */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => toggleReplies(comment.id)}
              className="flex items-center gap-1 mt-2 text-xs font-medium text-primary"
            >
              {expandedReplies.has(comment.id) ? (
                <><ChevronUp className="w-3 h-3" /> Hide replies</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[75vh] flex flex-col bg-background border-t border-border"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Comments</h3>
              <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Comments list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id}>
                    {renderComment(comment)}
                    {expandedReplies.has(comment.id) && comment.replies?.map(reply => renderComment(reply, true))}
                  </div>
                ))
              )}
            </div>

            {/* Reply indicator */}
            {replyingTo && (
              <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span>
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-xs text-primary font-medium">Cancel</button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2 items-center">
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2.5 rounded-full bg-muted text-foreground text-sm placeholder:text-muted-foreground border-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentsModal;
