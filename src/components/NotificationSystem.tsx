import { useState, useEffect } from 'react';
import { Bell, Check, X, User, MessageCircle, Heart, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';import { ToastAction } from '@/components/ui/toast';import { Notification } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { offlineDataManager } from '@/services/offlineDataManager';

const NotificationSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    if (!user) return;

    // Load cached notifications first
    (async () => {
      try {
        const cached = await offlineDataManager.getCachedNotifications();
        if (mounted && cached && Array.isArray(cached) && cached.length > 0) {
          const mapped = cached.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })) as Notification[];
          setNotifications(mapped);
          setUnreadCount(mapped.filter(n => !n.isRead).length);
        }
      } catch (err) {
        // ignore
      }

      // Then fetch fresh notifications if online
      if (navigator.onLine) {
        await loadNotifications();
      }
    })();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
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
          offlineDataManager.cacheNotifications(updated, 30 * 24 * 60 * 60 * 1000).catch(() => {});
          return updated;
        });
        setUnreadCount(prev => prev + 1);
        // If this notification represents a new chat message, show a small themed drop-in toast
        try {
          if (mapped.type === 'message' || mapped.type === 'new_message') {
            const truncate = (s: string | undefined, l = 80) => {
              if (!s) return '';
              return s.length > l ? s.slice(0, l).trim() + '…' : s;
            };

            const toastRef = toast({
              title: mapped.title || 'New message',
              description: truncate(mapped.message, 100),
            });

            // Auto dismiss after 3 seconds
            setTimeout(() => {
              try { toastRef.dismiss(); } catch (e) {}
            }, 3000);
          }
        } catch (err) {
          // swallow any toast errors to avoid breaking realtime flow
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const n = payload.new as any;
        setNotifications(prev => {
          const updated = prev.map(notif => notif.id === n.id ? { ...notif, isRead: n.is_read } : notif);
          offlineDataManager.cacheNotifications(updated, 30 * 24 * 60 * 60 * 1000).catch(() => {});
          return updated;
        });
        setUnreadCount(prev => n.is_read ? Math.max(0, prev - 1) : prev);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Subscribe to messages for user's chats and show a top-drop toast on new incoming messages
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    (async () => {
      try {
        // Get all chat IDs where the user participates
        const { data: myChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id);

        if (!mounted || !myChats || myChats.length === 0) return;

        const chatIds = myChats.map((c: any) => c.chat_id);

        chatIds.forEach((chatId: string) => {
          const channel = supabase
            .channel(`messages_for_${chatId}`)
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `chat_id=eq.${chatId}`
            }, async (payload) => {
              const msg = payload.new as any;
              if (!msg) return;
              // Ignore messages sent by current user
              if (msg.user_id === user.id) return;

              // Suppress if user is currently viewing this chat
              try {
                if (location.pathname === `/chat/${chatId}`) return;
              } catch (e) {}

              // Resolve sender name (lightweight)
              let senderName = 'New message';
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('name, username')
                  .eq('id', msg.user_id)
                  .single();
                if (profile) senderName = profile.name || profile.username || senderName;
              } catch (e) {
                // ignore
              }

              const getPreview = (m: any) => {
                if (!m) return '';
                if (m.type === 'image') return '📷 Photo';
                if (m.type === 'video') return '🎥 Video';
                if (m.type === 'voice') return '🎤 Voice message';
                return m.content || '';
              };

              const fullText = getPreview(msg);
              const truncated = fullText.length > 140 ? fullText.slice(0, 140).trim() + '…' : fullText;

              // Store handler for this specific message
              const handleOpenChat = () => {
                try {
                  // Navigate to chat page first
                  navigate('/chat');
                  
                  // Dispatch event after a small delay to ensure Chat page listener is registered
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('openChatWithUser', {
                      detail: { userId: msg.user_id, chatId }
                    }));
                  }, 100);
                } catch (e) {
                  console.error('Error opening chat from toast:', e);
                }
              };

              const toastRef = toast({
                title: senderName,
                description: truncated,
                action: (
                  <ToastAction
                    altText="Open chat"
                    onClick={handleOpenChat}
                    className="text-xs font-medium"
                  >
                    View
                  </ToastAction>
                ),
              });

              // Auto-dismiss after 3 seconds
              const dismissTimer = setTimeout(() => {
                try { toastRef.dismiss(); } catch (e) {}
              }, 3000);
            })
            .subscribe();

          channels.push(channel);
        });
      } catch (err) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user, location.pathname]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
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
      // save to offline cache for persistence (30 days)
      offlineDataManager.cacheNotifications(mappedNotifications, 30 * 24 * 60 * 60 * 1000).catch(() => {});
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'friend_request':
      case 'friend_accept':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'message':
      case 'new_message':
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'follow':
        return <User className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Close the popover
    setOpen(false);

    // Navigate based on notification type and data
    try {
      switch (notification.type) {
        case 'like':
        case 'comment':
          // Navigate to home and scroll to post if post_id is available
          if (notification.data?.post_id) {
            navigate('/');
            // Scroll to post after a brief delay
            setTimeout(() => {
              const postElement = document.querySelector(`[data-post-id="${notification.data.post_id}"]`);
              if (postElement) {
                postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          } else {
            navigate('/');
          }
          break;
          
        case 'friend_request':
        case 'friend_accept':
          // Navigate to friends page
          navigate('/friends');
          break;
          
        case 'follow':
          // Navigate to the user's profile who followed
          if (notification.data?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', notification.data.user_id)
              .single();
            
            const identifier = profile?.username || notification.data.user_id;
            navigate(`/profile/${identifier}`);
          } else {
            navigate('/friends');
          }
          break;
          
        case 'message':
        case 'new_message':
          // Navigate to chat
          if (notification.data?.chat_id) {
            navigate(`/chat`);
            // Optionally open specific chat
            setTimeout(() => {
              const chatElement = document.querySelector(`[data-chat-id="${notification.data.chat_id}"]`);
              if (chatElement) {
                chatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          } else {
            navigate('/chat');
          }
          break;
          
        default:
          // For any other notification types, try to navigate based on available data
          if (notification.data?.post_id) {
            navigate('/');
            setTimeout(() => {
              const postElement = document.querySelector(`[data-post-id="${notification.data.post_id}"]`);
              if (postElement) {
                postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          } else if (notification.data?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', notification.data.user_id)
              .single();
            
            const identifier = profile?.username || notification.data.user_id;
            navigate(`/profile/${identifier}`);
          } else if (notification.data?.chat_id) {
            navigate('/chat');
          }
          break;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Fallback navigation
      navigate('/');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-foreground">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Mark all as read
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start space-x-3 p-3 hover:bg-muted/50 cursor-pointer border-l-2 transition-colors ${
                        !notification.isRead 
                          ? 'border-l-primary bg-primary/5' 
                          : 'border-l-transparent'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem;
