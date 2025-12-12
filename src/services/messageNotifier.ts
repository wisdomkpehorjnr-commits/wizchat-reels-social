import { supabase } from '@/integrations/supabase/client';
import { localMessageService, LocalMessage } from './localMessageService';

/**
 * Message Notifier
 * - Subscribes to messages table for INSERT/UPDATE events
 * - Persists incoming messages into localMessageService
 * - Updates per-chat metadata / unread counts
 * - Emits window events so UI components can react immediately
 *
 * Usage:
 *   const cleanup = initMessageNotifier(currentUserId);
 *   // call cleanup() on logout or when unmounting
 */

export const initMessageNotifier = (userId: string) => {
  if (!userId) return () => {};

  // Channel name includes user id to avoid accidental duplicates
  const channel = supabase
    .channel(`messages_listener_${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload: any) => {
        try {
          const newMsg = payload.new;
          if (!newMsg) return;

          // If the message was sent by this user, ignore (we don't increment unread for own messages)
          if (newMsg.user_id === userId) return;

          // Check if user is a participant in this chat before handling
          const { data: participant } = await supabase
            .from('chat_participants')
            .select('id')
            .eq('chat_id', newMsg.chat_id)
            .eq('user_id', userId)
            .single();

          if (!participant) return; // not for this user

          // Build LocalMessage shape
          const localMsg: LocalMessage = {
            id: newMsg.id,
            chatId: newMsg.chat_id,
            userId: newMsg.user_id,
            user: newMsg.user || undefined,
            content: newMsg.content,
            type: newMsg.type,
            mediaUrl: newMsg.media_url,
            duration: newMsg.duration,
            timestamp: new Date(newMsg.created_at),
            seen: newMsg.seen || false,
            status: newMsg.seen ? 'read' : 'delivered',
            synced: true
          } as LocalMessage;

          // Save to local DB
          await localMessageService.saveMessage(localMsg);

          // Increment unread count for the chat (if message is unseen)
          if (!localMsg.seen) {
            const meta = await localMessageService.getChatMetadata(localMsg.chatId);
            const currentCount = meta?.unreadCount || 0;
            const newCount = currentCount + 1;
            await localMessageService.updateUnreadCount(localMsg.chatId, newCount);
          }

          // Notify UI: specific message received
          try {
            window.dispatchEvent(new CustomEvent('message:received', { detail: { message: localMsg } }));
          } catch (e) {
            // ignore in non-browser tests
          }

          // Notify aggregated badge update
          try {
            const allMeta = await localMessageService.getAllChatMetadata();
            const totalUnread = allMeta.reduce((sum, m) => sum + (m.unreadCount || 0), 0);
            window.dispatchEvent(new CustomEvent('badges:updated', { detail: { chat: totalUnread } }));
          } catch (e) {
            // ignore
          }
        } catch (err) {
          console.error('Error handling incoming message:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      async (payload: any) => {
        try {
          const newMsg = payload.new;
          const oldMsg = payload.old;
          if (!newMsg) return;

          // If seen status changed, update local DB and metadata
          if (oldMsg && oldMsg.seen !== newMsg.seen) {
            // Update message in local DB if present
            const localMsg: LocalMessage = {
              id: newMsg.id,
              chatId: newMsg.chat_id,
              userId: newMsg.user_id,
              user: newMsg.user || undefined,
              content: newMsg.content,
              type: newMsg.type,
              mediaUrl: newMsg.media_url,
              duration: newMsg.duration,
              timestamp: new Date(newMsg.created_at),
              seen: newMsg.seen,
              status: newMsg.seen ? 'read' : 'delivered',
              synced: true
            } as LocalMessage;

            await localMessageService.saveMessage(localMsg);

            // Recalculate unread count for that chat by querying local metadata or messages
            const localMeta = await localMessageService.getChatMetadata(localMsg.chatId);
            if (localMeta) {
              // If message was marked seen, decrement count safely
              const recalculated = Math.max(0, localMeta.unreadCount - (newMsg.seen ? 1 : 0));
              await localMessageService.updateUnreadCount(localMsg.chatId, recalculated);
            }

            // Emit update events
            try {
              window.dispatchEvent(new CustomEvent('message:updated', { detail: { message: localMsg } }));
            } catch (e) {}

            try {
              const allMeta = await localMessageService.getAllChatMetadata();
              const totalUnread = allMeta.reduce((sum, m) => sum + (m.unreadCount || 0), 0);
              window.dispatchEvent(new CustomEvent('badges:updated', { detail: { chat: totalUnread } }));
            } catch (e) {}
          }
        } catch (err) {
          console.error('Error handling message update:', err);
        }
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // ignore
    }
  };
};
