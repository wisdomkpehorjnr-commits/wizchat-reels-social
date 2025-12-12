import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Post } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CommentsSheetProps {
  post: Post;
  onClose: () => void;
}

const CommentsSheet: React.FC<CommentsSheetProps> = ({ post, onClose }) => {
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setComments(post.comments || []);
  }, [post]);

  const submit = async () => {
    if (!text.trim() || !user) return;
    try {
      await dataService.addComment(post.id, text);
      const newComment = { id: `local-${Date.now()}`, user, content: text, createdAt: new Date() };
      setComments(prev => [newComment, ...prev]);
      setText('');
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 bg-white dark:bg-gray-900 max-w-full">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {comments.length === 0 && <div className="text-sm text-muted-foreground">No comments yet</div>}
          {comments.map((c: any) => (
            <div key={c.id} className="py-2 border-b border-muted py-2">
              <div className="text-sm font-medium">{c.user?.name || c.user?.username || 'User'}</div>
              <div className="text-sm text-muted-foreground">{c.content || c.text || ''}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} className="flex-1 p-2 rounded bg-muted/10 dark:bg-muted/20" placeholder="Add a comment..." />
          <Button onClick={submit}>Send</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsSheet;
