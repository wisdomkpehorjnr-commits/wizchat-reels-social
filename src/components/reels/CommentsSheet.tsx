import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { reelsStore } from '@/services/reelsStore';
import { Send } from 'lucide-react';

interface CommentsSheetProps {
  post: any;
  open: boolean;
  onClose: () => void;
}

const CommentsSheet: React.FC<CommentsSheetProps> = ({ post, open, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!post) return;
    // Fast local load
    const local = reelsStore.getComments(post.id) || [];
    setComments(local.concat(post.comments || []));
  }, [post?.id]);

  const sendComment = async () => {
    if (!text.trim()) return;
    const comment = {
      id: `local_${Date.now()}`,
      userId: user?.id,
      userName: user?.name || user?.username || 'You',
      content: text,
      createdAt: new Date().toISOString()
    };
    // optimistic
    setComments(prev => [comment, ...prev]);
    reelsStore.pushComment(post.id, comment);
    setText('');
    try {
      // submit to server if API exists
      await fetch(`/api/reels/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.content })
      });
    } catch (e) {
      console.warn('[CommentsSheet] send failed', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="fixed bottom-0 left-0 right-0 rounded-t-xl max-h-[70vh] p-4 bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-3 overflow-auto max-h-[50vh]">
          {comments.map(c => (
            <div key={c.id} className="p-2 rounded-md bg-gray-100 dark:bg-gray-800">
              <div className="text-sm font-medium">{c.userName}</div>
              <div className="text-sm">{c.content}</div>
              <div className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input className="flex-1 rounded-md p-2 border" value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." />
          <Button onClick={sendComment} aria-label="Send"><Send /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsSheet;
