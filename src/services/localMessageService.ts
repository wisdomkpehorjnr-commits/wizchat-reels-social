/**
 * Local Message Service - Offline-First Message Storage
 * 
 * This service provides IndexedDB-based local storage for messages,
 * enabling offline-first functionality with automatic sync when online.
 */

import { Message } from '@/types';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface LocalMessage extends Message {
  status: MessageStatus;
  localId?: string; // Temporary ID for messages not yet synced
  synced: boolean; // Whether message has been synced to server
  deleted?: boolean; // Whether message has been deleted locally
  pinned?: boolean; // Whether message is pinned
  pinnedAt?: Date; // When message was pinned
}

interface ChatMetadata {
  chatId: string;
  pinnedMessageId?: string;
  lastMessageId?: string;
  lastMessagePreview?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  updatedAt: Date;
}

const DB_NAME = 'WizChatMessages';
const DB_VERSION = 1;
const STORES = {
  MESSAGES: 'messages',
  OUTBOX: 'outbox',
  DELETED: 'deleted_messages',
  CHAT_METADATA: 'chat_metadata',
  PINNED: 'pinned_messages'
};

class LocalMessageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async initDB(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store - all messages for a chat
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('status', 'status', { unique: false });
        }

        // Outbox store - messages waiting to be sent
        if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
          const outboxStore = db.createObjectStore(STORES.OUTBOX, { keyPath: 'localId', autoIncrement: true });
          outboxStore.createIndex('chatId', 'chatId', { unique: false });
          outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Deleted messages store - track permanently deleted messages
        if (!db.objectStoreNames.contains(STORES.DELETED)) {
          const deletedStore = db.createObjectStore(STORES.DELETED, { keyPath: 'messageId' });
          deletedStore.createIndex('chatId', 'chatId', { unique: false });
          deletedStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        }

        // Chat metadata store - last message, unread counts, etc.
        if (!db.objectStoreNames.contains(STORES.CHAT_METADATA)) {
          const metadataStore = db.createObjectStore(STORES.CHAT_METADATA, { keyPath: 'chatId' });
        }

        // Pinned messages store
        if (!db.objectStoreNames.contains(STORES.PINNED)) {
          const pinnedStore = db.createObjectStore(STORES.PINNED, { keyPath: 'id' });
          pinnedStore.createIndex('chatId', 'chatId', { unique: true }); // Only one pinned message per chat
        }
      };
    });

    return this.initPromise;
  }

  // Get all messages for a chat (excluding deleted ones)
  async getMessages(chatId: string): Promise<LocalMessage[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES, STORES.DELETED], 'readonly');
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      const deletedStore = transaction.objectStore(STORES.DELETED);
      const index = messagesStore.index('chatId');
      const request = index.getAll(chatId);

      request.onsuccess = async () => {
        const messages = request.result as LocalMessage[];
        
        // Get deleted message IDs for this chat
        const deletedRequest = deletedStore.index('chatId').getAll(chatId);
        deletedRequest.onsuccess = () => {
          const deletedIds = new Set((deletedRequest.result as any[]).map(d => d.messageId));
          const filtered = messages
            .filter(m => !deletedIds.has(m.id))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          resolve(filtered);
        };
        deletedRequest.onerror = () => reject(deletedRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Save a message locally
  async saveMessage(message: LocalMessage): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES, STORES.CHAT_METADATA], 'readwrite');
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      const request = messagesStore.put(message);

      request.onsuccess = async () => {
        // Update chat metadata
        await this.updateChatMetadata(message.chatId, message);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Save multiple messages
  async saveMessages(messages: LocalMessage[]): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES, STORES.CHAT_METADATA], 'readwrite');
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      
      let completed = 0;
      const total = messages.length;

      if (total === 0) {
        resolve();
        return;
      }

      messages.forEach(async (message) => {
        const request = messagesStore.put(message);
        request.onsuccess = async () => {
          await this.updateChatMetadata(message.chatId, message);
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => {
          completed++;
          if (completed === total) {
            reject(new Error('Failed to save some messages'));
          }
        };
      });
    });
  }

  // Clear all messages for a chat
  async clearChatMessages(chatId: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES, STORES.DELETED, STORES.OUTBOX], 'readwrite');
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      const deletedStore = transaction.objectStore(STORES.DELETED);
      const outboxStore = transaction.objectStore(STORES.OUTBOX);
      
      const index = messagesStore.index('chatId');
      const request = index.getAll(chatId);

      request.onsuccess = () => {
        const messages = request.result as LocalMessage[];
        
        // Delete all messages
        messages.forEach(msg => {
          messagesStore.delete(msg.id);
          // Mark as deleted
          deletedStore.put({
            messageId: msg.id,
            chatId,
            deletedAt: new Date()
          });
        });

        // Also clear outbox for this chat
        const outboxIndex = outboxStore.index('chatId');
        const outboxRequest = outboxIndex.getAll(chatId);
        outboxRequest.onsuccess = () => {
          const outboxMessages = outboxRequest.result;
          outboxMessages.forEach((msg: any) => {
            outboxStore.delete(msg.localId);
          });
        };
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Permanently delete a message (mark as deleted)
  async deleteMessage(messageId: string, chatId: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MESSAGES, STORES.DELETED, STORES.PINNED], 'readwrite');
      
      // Remove from messages store
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      const deleteRequest = messagesStore.delete(messageId);

      // Add to deleted store
      const deletedStore = transaction.objectStore(STORES.DELETED);
      const addDeletedRequest = deletedStore.put({
        messageId,
        chatId,
        deletedAt: new Date()
      });

      // Remove from pinned if it was pinned
      const pinnedStore = transaction.objectStore(STORES.PINNED);
      const pinnedIndex = pinnedStore.index('chatId');
      const getPinnedRequest = pinnedIndex.get(chatId);
      
      getPinnedRequest.onsuccess = () => {
        const pinned = getPinnedRequest.result;
        if (pinned && pinned.messageId === messageId) {
          pinnedStore.delete(pinned.id);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Pin a message (only one per chat)
  async pinMessage(messageId: string, chatId: string, message: LocalMessage): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PINNED, STORES.MESSAGES], 'readwrite');
      const pinnedStore = transaction.objectStore(STORES.PINNED);
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      
      // Check if there's already a pinned message for this chat
      const pinnedIndex = pinnedStore.index('chatId');
      const getExistingRequest = pinnedIndex.get(chatId);
      
      getExistingRequest.onsuccess = () => {
        const existing = getExistingRequest.result;
        
        // Unpin previous message if exists
        if (existing) {
          const unpinRequest = messagesStore.get(existing.messageId);
          unpinRequest.onsuccess = () => {
            const prevMessage = unpinRequest.result;
            if (prevMessage) {
              prevMessage.pinned = false;
              messagesStore.put(prevMessage);
            }
          };
          pinnedStore.delete(existing.id);
        }

        // Pin new message
        const pinData = {
          id: `pin_${chatId}_${Date.now()}`,
          chatId,
          messageId,
          pinnedAt: new Date()
        };
        
        const addPinRequest = pinnedStore.put(pinData);
        addPinRequest.onsuccess = () => {
          // Update message
          message.pinned = true;
          message.pinnedAt = new Date();
          messagesStore.put(message);
          resolve();
        };
        addPinRequest.onerror = () => reject(addPinRequest.error);
      };

      getExistingRequest.onerror = () => reject(getExistingRequest.error);
    });
  }

  // Unpin a message
  async unpinMessage(messageId: string, chatId: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PINNED, STORES.MESSAGES], 'readwrite');
      const pinnedStore = transaction.objectStore(STORES.PINNED);
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      
      const pinnedIndex = pinnedStore.index('chatId');
      const getRequest = pinnedIndex.get(chatId);
      
      getRequest.onsuccess = () => {
        const pinned = getRequest.result;
        if (pinned && pinned.messageId === messageId) {
          pinnedStore.delete(pinned.id);
          
          // Update message
          const messageRequest = messagesStore.get(messageId);
          messageRequest.onsuccess = () => {
            const message = messageRequest.result;
            if (message) {
              message.pinned = false;
              messagesStore.put(message);
            }
            resolve();
          };
          messageRequest.onerror = () => reject(messageRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Get pinned message for a chat
  async getPinnedMessage(chatId: string): Promise<LocalMessage | null> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PINNED, STORES.MESSAGES], 'readonly');
      const pinnedStore = transaction.objectStore(STORES.PINNED);
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      
      const pinnedIndex = pinnedStore.index('chatId');
      const getRequest = pinnedIndex.get(chatId);
      
      getRequest.onsuccess = () => {
        const pinned = getRequest.result;
        if (!pinned) {
          resolve(null);
          return;
        }

        const messageRequest = messagesStore.get(pinned.messageId);
        messageRequest.onsuccess = () => {
          const message = messageRequest.result as LocalMessage | undefined;
          resolve(message || null);
        };
        messageRequest.onerror = () => reject(messageRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Add message to outbox (for offline sending)
  async addToOutbox(message: LocalMessage): Promise<string> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.OUTBOX, STORES.MESSAGES], 'readwrite');
      const outboxStore = transaction.objectStore(STORES.OUTBOX);
      
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      message.localId = localId;
      message.status = 'pending';
      message.synced = false;

      const request = outboxStore.add(message);
      request.onsuccess = () => {
        // Also save to messages store
        const messagesStore = transaction.objectStore(STORES.MESSAGES);
        messagesStore.put(message);
        resolve(localId);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all messages from outbox
  async getOutboxMessages(): Promise<LocalMessage[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.OUTBOX, 'readonly');
      const outboxStore = transaction.objectStore(STORES.OUTBOX);
      const index = outboxStore.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        resolve(request.result as LocalMessage[]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Remove message from outbox (after successful send)
  async removeFromOutbox(localId: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.OUTBOX, 'readwrite');
      const outboxStore = transaction.objectStore(STORES.OUTBOX);
      const request = outboxStore.delete(localId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Update message status
  async updateMessageStatus(messageId: string, status: MessageStatus): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.MESSAGES, 'readwrite');
      const messagesStore = transaction.objectStore(STORES.MESSAGES);
      const request = messagesStore.get(messageId);

      request.onsuccess = () => {
        const message = request.result as LocalMessage;
        if (message) {
          message.status = status;
          message.synced = status !== 'pending';
          const updateRequest = messagesStore.put(message);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Update chat metadata (last message, unread count, etc.)
  private async updateChatMetadata(chatId: string, message: LocalMessage): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHAT_METADATA, 'readwrite');
      const metadataStore = transaction.objectStore(STORES.CHAT_METADATA);
      const request = metadataStore.get(chatId);

      request.onsuccess = () => {
        const existing = request.result as ChatMetadata | undefined;
        const metadata: ChatMetadata = {
          chatId,
          lastMessageId: message.id,
          lastMessagePreview: this.getMessagePreview(message),
          lastMessageTime: message.timestamp,
          unreadCount: existing?.unreadCount || 0,
          updatedAt: new Date()
        };

        const putRequest = metadataStore.put(metadata);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Public method to update chat metadata
  async updateChatMetadataFromMessage(chatId: string, message: LocalMessage): Promise<void> {
    return this.updateChatMetadata(chatId, message);
  }

  // Get chat metadata
  async getChatMetadata(chatId: string): Promise<ChatMetadata | null> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHAT_METADATA, 'readonly');
      const metadataStore = transaction.objectStore(STORES.CHAT_METADATA);
      const request = metadataStore.get(chatId);

      request.onsuccess = () => {
        resolve(request.result as ChatMetadata || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all chat metadata entries
  async getAllChatMetadata(): Promise<ChatMetadata[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHAT_METADATA, 'readonly');
      const metadataStore = transaction.objectStore(STORES.CHAT_METADATA);
      const request = metadataStore.getAll();

      request.onsuccess = () => {
        resolve(request.result as ChatMetadata[]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update unread count for a chat
  async updateUnreadCount(chatId: string, count: number): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHAT_METADATA, 'readwrite');
      const metadataStore = transaction.objectStore(STORES.CHAT_METADATA);
      const request = metadataStore.get(chatId);

      request.onsuccess = () => {
        const existing = request.result as ChatMetadata | undefined;
        const metadata: ChatMetadata = {
          chatId,
          ...existing,
          unreadCount: count,
          updatedAt: new Date()
        };

        const putRequest = metadataStore.put(metadata);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get message preview text
  private getMessagePreview(message: LocalMessage): string {
    if (message.type === 'image') return '📷 Photo';
    if (message.type === 'video') return '🎥 Video';
    if (message.type === 'voice') return '🎤 Voice message';
    if (message.content) {
      return message.content.length > 50 
        ? message.content.substring(0, 50) + '...'
        : message.content;
    }
    return 'Media';
  }

  // Check if message is deleted
  async isMessageDeleted(messageId: string): Promise<boolean> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.DELETED, 'readonly');
      const deletedStore = transaction.objectStore(STORES.DELETED);
      const request = deletedStore.get(messageId);

      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (for testing/debugging)
  async clearAll(): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.MESSAGES, STORES.OUTBOX, STORES.DELETED, STORES.CHAT_METADATA, STORES.PINNED],
        'readwrite'
      );

      let completed = 0;
      const stores = [STORES.MESSAGES, STORES.OUTBOX, STORES.DELETED, STORES.CHAT_METADATA, STORES.PINNED];
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            resolve();
          }
        };
        request.onerror = () => {
          completed++;
          if (completed === stores.length) {
            reject(new Error('Failed to clear some stores'));
          }
        };
      });
    });
  }
}

export const localMessageService = new LocalMessageService();

