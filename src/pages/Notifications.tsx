import { useEffect, useState } from 'react';
import { ArrowLeft, Check, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types';
import { offlineDataManager } from '@/services/offlineDataManager';

const Notifications = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cached = await offlineDataManager.getCachedNotifications();
        if (cached && cached.length > 0) {
          setItems(cached.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })));
          setLoading(false);
        }
      } catch {}
      if (navigator.onLine) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { setLoading(false); return; }
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);
          const mapped = (data || []).map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.is_read,
            createdAt: new Date(n.created_at),
            data: n.data,
          })) as any as Notification[];
          setItems(mapped);
          try { await offlineDataManager.cacheNotifications(mapped, 30 * 24 * 60 * 60 * 1000); } catch {}
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background: 'hsl(var(--background) / 0.7)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <button
          aria-label="Back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-foreground">Notifications</h1>
        {items.some((n) => !n.isRead) && (
          <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs">
            <Check className="w-4 h-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading && items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-colors ${
                  !n.isRead ? 'bg-primary/5 border-primary/20' : 'bg-card/60 border-border/40'
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="font-medium text-sm text-foreground flex-1">{n.title}</h3>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{n.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
