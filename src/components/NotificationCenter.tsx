
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { offlineDataManager } from '@/services/offlineDataManager';

const NOTIF_CACHE_KEY = 'wizchat_notifications_cache';
const NOTIF_SESSION_KEY = 'wizchat_notifs_loaded_this_session';

// Persistent cache helpers (use offlineDataManager for longer-lived storage)
const getCachedNotifications = async (): Promise<Notification[]> => {
  try {
    const cached = await offlineDataManager.getCachedNotifications();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) }));
    }
  } catch (err) {
    // fall back to localStorage
    try {
      const raw = localStorage.getItem(NOTIF_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) }));
      }
    } catch {}
  }
  return [];
};

const saveCachedNotifications = async (notifs: Notification[]) => {
  try {
    // cache for 30 days by default
    await offlineDataManager.cacheNotifications(notifs, 30 * 24 * 60 * 60 * 1000);
  } catch (err) {
    try { localStorage.setItem(NOTIF_CACHE_KEY, JSON.stringify(notifs)); } catch {}
  }
};

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasLoadedThisSession = useRef(!!sessionStorage.getItem(NOTIF_SESSION_KEY));
  const navigate = useNavigate();

  useEffect(() => {
    // Load cached notifications first (async)
    (async () => {
      const cached = await getCachedNotifications();
      if (cached && cached.length > 0) {
        setNotifications(cached);
        setUnreadCount(cached.filter(n => !n.isRead).length);
      }
      // Only fetch from network once per session
      if (!hasLoadedThisSession.current && navigator.onLine) {
        await loadNotifications();
        hasLoadedThisSession.current = true;
        sessionStorage.setItem(NOTIF_SESSION_KEY, '1');
      } else {
        setLoading(false);
      }
    })();

    // Subscribe to real-time notifications for incremental updates
    const channel = supabase
      .channel('notifications-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const n = payload.new as any;
        const mapped: Notification = {
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data,
          isRead: n.is_read,
          createdAt: new Date(n.created_at)
        };
        setNotifications(prev => {
          const updated = [mapped, ...prev];
          saveCachedNotifications(updated).catch(() => {});
          return updated;
        });
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => {
          const updated = prev.map(notif =>
            notif.id === n.id ? { ...notif, isRead: n.is_read } : notif
          );
          saveCachedNotifications(updated).catch(() => {});
          return updated;
        });
        setUnreadCount(prev => n.is_read ? Math.max(0, prev - 1) : prev);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const mappedNotifications = data?.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.is_read,
        createdAt: new Date(notification.created_at)
      })) || [];

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.isRead).length);
      await saveCachedNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
      saveCachedNotifications(updated);
      return updated;
    });
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      saveCachedNotifications(updated);
      return updated;
    });
    setUnreadCount(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.data?.post_id) {
          navigate(`/?post=${notification.data.post_id}`);
        } else if (notification.data?.reel_id) {
          navigate('/reels');
        }
        break;
      case 'friend_request':
      case 'friend_accept':
        navigate('/friends');
        break;
      case 'follow':
      case 'profile_view':
        if (notification.data?.user_id) {
          navigate(`/profile/${notification.data.user_id}`);
        }
        break;
      case 'new_message':
        if (notification.data?.chat_id) {
          navigate(`/chat/${notification.data.chat_id}`);
        } else {
          navigate('/chat');
        }
        break;
      default:
        if (notification.data?.post_id) {
          navigate(`/?post=${notification.data.post_id}`);
        } else if (notification.data?.user_id) {
          navigate(`/profile/${notification.data.user_id}`);
        }
        break;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={markAllAsRead}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
              !notification.isRead 
                ? 'bg-primary/5 border-primary/20' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </p>
              </div>
              {!notification.isRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8">
            <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;
