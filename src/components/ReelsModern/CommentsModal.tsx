import React, { useEffect, useState } from 'react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
        console.error('Failed to load comments, falling back to local storage', err);
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
        // fallback to local storage for unauthenticated users
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
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comments</h3>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-300">Close</button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-3 mb-3">
          {comments.length === 0 ? (
            <div className="text-center text-gray-500">Be the first to comment</div>
          ) : comments.map(c => (
            <div key={c.id} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.userName}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{c.content}</div>
              <div className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment" className="flex-1 p-2 rounded border bg-white dark:bg-gray-800" />
          <button onClick={send} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Send</button>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
