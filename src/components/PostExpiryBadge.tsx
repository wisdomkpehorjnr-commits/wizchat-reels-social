import React, { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PostExpiryBadgeProps {
  postId: string;
  expiresAt?: Date | string | null;
  isOwner?: boolean;
  onExtended?: (newExpiry: Date) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Small glass timer badge shown under profile post / reel cards.
 * Posts auto-delete 15 days after creation. Owners can extend when
 * the post enters its final 5 days.
 */
const PostExpiryBadge: React.FC<PostExpiryBadgeProps> = ({ postId, expiresAt, isOwner, onExtended }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [localExpiry, setLocalExpiry] = useState<Date | null>(
    expiresAt ? new Date(expiresAt) : null
  );

  if (!localExpiry || isNaN(localExpiry.getTime())) return null;

  const msLeft = localExpiry.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));
  const isExpiring = daysLeft <= 5;

  const label = daysLeft > 1 ? `${daysLeft}d left` : hoursLeft > 1 ? `${hoursLeft}h left` : 'Expiring';

  const handleExtend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('extend_post_expiry', { p_post_id: postId });
      if (error) throw error;
      const next = new Date(data as string);
      setLocalExpiry(next);
      onExtended?.(next);
      toast({ title: 'Post extended', description: 'Another 15 days added.' });
    } catch {
      if (navigator.onLine) {
        toast({ title: 'Could not extend', description: 'Please try again.' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1 flex items-center justify-center">
      <div
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-xl border shadow-sm ${
          isExpiring
            ? 'bg-destructive/15 border-destructive/30 text-destructive'
            : 'bg-foreground/10 border-foreground/15 text-muted-foreground'
        }`}
      >
        <Clock className="w-2.5 h-2.5" />
        <span>{label}</span>
        {isOwner && isExpiring && (
          <button
            type="button"
            onClick={handleExtend}
            disabled={busy}
            aria-label="Extend post by 15 days"
            className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-foreground/10 px-1.5 py-[1px] text-[10px] text-foreground backdrop-blur-xl transition-transform active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-2.5 h-2.5" />
            {busy ? '...' : 'Extend'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PostExpiryBadge;
