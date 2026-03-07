import React, { useEffect, useState } from 'react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface CommentItem {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface CommentsModalProps {
  reelId: string;
  open: boolean;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ reelId, open, onClose }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const fetched = await dataService.getComments(reelId);
        setComments(fetched.map((c: any) => ({ id: c.id, userName: c.user?.name || 'User', content: c.content, createdAt: c.createdAt.toISOString() })));
      } catch (err) {
        console.error('Failed to load comments', err);
        const raw = localStorage.getItem(`reel_comments_${reelId}`) || '[]';
        try { setComments(JSON.parse(raw)); } catch { setComments([]); }
      }
    })();
  }, [open, reelId]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      if (user) {
        const created = await dataService.createComment(reelId, text.trim());
        const c: CommentItem = { id: created.id, userName: created.user?.name || 'You', content: created.content, createdAt: created.createdAt.toISOString() };
        setComments(prev => [c, ...prev]);
      } else {
        const c: CommentItem = { id: `c_${Date.now()}`, userName: 'You', content: text.trim(), createdAt: new Date().toISOString() };
        const next = [c, ...comments];
        setComments(next);
        localStorage.setItem(`reel_comments_${reelId}`, JSON.stringify(next));
      }
      setText('');
    } catch (err: any) {
      console.error('Failed to send comment', err);
      toast({ title: 'Failed to send comment', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-black/90 backdrop-blur-xl rounded-t-xl p-4 shadow-lg border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Comments</h3>
          <button onClick={onClose} className="text-white font-bold text-sm hover:text-white/80">Close</button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-3 mb-3">
          {comments.length === 0 ? (
            <div className="text-center text-white/60 py-6 font-medium">Be the first to comment</div>
          ) : comments.map(c => (
            <div key={c.id} className="p-2.5 rounded-lg bg-white/10">
              <div className="text-sm font-bold text-white">{c.userName}</div>
              <div className="text-sm text-white/80">{c.content}</div>
              <div className="text-xs text-white/40 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Write a comment..."
            className="flex-1 p-2.5 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={send}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
