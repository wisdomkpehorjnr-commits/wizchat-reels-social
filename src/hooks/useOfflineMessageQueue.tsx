import { useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';

interface QueuedMessage {
  id: string;
  chatId: string;
  userId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'voice';
  mediaUrl?: string;
  timestamp: number;
}

const LAST_SYNC_KEY = 'wizchat-last-message-sync';
const QUEUED_MESSAGES_KEY = 'wizchat-queued-messages';

/**
 * Hook to handle offline message queue.
 * Stores messages when offline and replays them as toasts when reconnected.
 */
export const useOfflineMessageQueue = () => {
  const isOnline = useNetworkStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const processingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Initialize last sync time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    if (stored) {
      lastSyncRef.current = parseInt(stored, 10);
    } else {
      lastSyncRef.current = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, lastSyncRef.current.toString());
    }
  }, []);

  // When user comes online, fetch and display queued messages
  useEffect(() => {
    if (!isOnline || !user || processingRef.current) return;

    processingRef.current = true;

    const processQueuedMessages = async () => {
      try {
        // Get user's chat IDs
        const { data: myChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id);

        if (!myChats || myChats.length === 0) {
          processingRef.current = false;
          return;
        }

        const chatIds = myChats.map((c: any) => c.chat_id);
        const lastSyncTime = lastSyncRef.current;

        // Fetch messages newer than last sync that aren't from the current user
        const { data: newMessages } = await supabase
          .from('messages')
          .select('id, chat_id, user_id, content, type, media_url, created_at, profiles(name, username)')
          .in('chat_id', chatIds)
          .neq('user_id', user.id)
          .gt('created_at', new Date(lastSyncTime).toISOString())
          .order('created_at', { ascending: true });

        // Update sync time
        lastSyncRef.current = Date.now();
        localStorage.setItem(LAST_SYNC_KEY, lastSyncRef.current.toString());

        if (!newMessages || newMessages.length === 0) {
          processingRef.current = false;
          return;
        }

        console.log(`[Offline Queue] Processing ${newMessages.length} queued messages`);

        // Process messages sequentially with a delay between each toast
        for (let i = 0; i < newMessages.length; i++) {
          const msg = newMessages[i] as any;

          // Get sender name
          let senderName = 'New message';
          if (msg.profiles) {
            senderName = msg.profiles.name || msg.profiles.username || senderName;
          } else {
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
          }

          // Get message preview
          const getPreview = (m: any) => {
            if (!m) return '';
            if (m.type === 'image') return '📷 Photo';
            if (m.type === 'video') return '🎥 Video';
            if (m.type === 'voice') return '🎤 Voice message';
            return m.content || '';
          };

          const fullText = getPreview(msg);
          const truncated = fullText.length > 140 ? fullText.slice(0, 140).trim() + '…' : fullText;

          // Create handler for opening chat
          const chatId = msg.chat_id;
          const handleOpenChat = () => {
            try {
              navigate('/chat');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openChatWithUser', {
                  detail: { userId: msg.user_id, chatId }
                }));
              }, 100);
            } catch (e) {
              console.error('Error opening chat from queued message toast:', e);
            }
          };

          // Show toast with slight delay to queue them sequentially
          // Wait before showing the next toast
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 400)); // 400ms between toasts
          }

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

          // Auto-dismiss after 4 seconds
          setTimeout(() => {
            try { toastRef.dismiss(); } catch (e) {}
          }, 4000);
        }

        processingRef.current = false;
      } catch (error) {
        console.error('[Offline Queue] Error processing queued messages:', error);
        processingRef.current = false;
      }
    };

    processQueuedMessages();
  }, [isOnline, user, toast, navigate]);

  // Public API to get/set last sync time
  return {
    getLastSyncTime: () => lastSyncRef.current,
    setLastSyncTime: (time: number) => {
      lastSyncRef.current = time;
      localStorage.setItem(LAST_SYNC_KEY, time.toString());
    },
  };
};
