import { useEffect, useRef } from 'react';
import { localMessageService } from '@/services/localMessageService';
import { dataService } from '@/services/dataService';
import { networkStatusManager } from '@/services/networkStatusManager';

/**
 * Hook that automatically flushes the local message outbox when the app is online.
 * It should be mounted once (for example in ChatRoom or App-level) to ensure
 * queued messages are retried when connectivity returns.
 */
export function useOfflineSync() {
  const flushingRef = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const tryFlush = async () => {
      if (flushingRef.current) return;
      if (!networkStatusManager.isOnline()) return;

      flushingRef.current = true;
      try {
        const outbox = await localMessageService.getOutboxMessages();
        for (const msg of outbox) {
          try {
            // Attempt to send via dataService depending on message type
            if (msg.type === 'text') {
              // Use sendMessage which returns server message with id
              const sent = await dataService.sendMessage(msg.chatId, msg.content || '');
              // Replace the local message with the server message (update status)
              await localMessageService.updateMessageStatus(msg.id || sent.id, 'sent').catch(() => {});
              await localMessageService.removeFromOutbox(msg.localId || '');
            } else if (msg.type === 'voice' || msg.type === 'image' || msg.type === 'video') {
              // For media messages, create via appropriate API
              if (msg.mediaUrl) {
                const created = await dataService.createMediaMessage(msg.chatId, msg.mediaUrl, msg.type as 'image' | 'video');
                await localMessageService.updateMessageStatus(msg.id || created.id, 'sent').catch(() => {});
                await localMessageService.removeFromOutbox(msg.localId || '');
              }
            } else {
              // Fallback: mark as sent and remove from outbox
              await localMessageService.updateMessageStatus(msg.id || msg.localId || '', 'sent').catch(() => {});
              await localMessageService.removeFromOutbox(msg.localId || '');
            }
          } catch (err) {
            // If a single message fails, leave it in outbox for next attempt
            console.debug('Failed to flush outbox item, will retry later', err);
          }
        }
      } catch (err) {
        console.error('Error flushing outbox:', err);
      } finally {
        flushingRef.current = false;
      }
    };

    // Subscribe to network status changes
    unsub = networkStatusManager.subscribe((status) => {
      if (status === 'online' || status === 'reconnecting') {
        tryFlush().catch(console.error);
      }
    });

    // Try once on mount
    tryFlush().catch(console.error);

    return () => {
      if (unsub) unsub();
    };
  }, []);
}

export default useOfflineSync;
