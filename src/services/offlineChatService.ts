/**
 * Offline Chat Service - WhatsApp-Style Offline-First Architecture
 * 
 * Features:
 * - Instant chat list loading from local IndexedDB
 * - Background sync with server
 * - Offline message queue
 * - Delta updates (only fetch new messages)
 * - Profile caching
 */

import { supabase } from '@/integrations/supabase/client';
import { User, Message } from '@/types';
import { localMessageService, LocalMessage } from './localMessageService';

interface CachedChat {
  id: string;
  participantId: string;
  participant: User;
  lastMessage?: LocalMessage;
  lastMessageTime?: Date;
  unreadCount: number;
  updatedAt: Date;
  hidden?: boolean;
}

interface CachedProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  cachedAt: Date;
}

const DB_NAME = 'WizChatOffline';
const DB_VERSION = 2;
const STORES = {
  CHATS: 'chats',
  PROFILES: 'profiles',
  SYNC_STATUS: 'sync_status',
  SEARCH_CACHE: 'search_cache'
};

class OfflineChatService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private syncInProgress = false;

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

        // Chats store - cached chat list
        if (!db.objectStoreNames.contains(STORES.CHATS)) {
          const chatsStore = db.createObjectStore(STORES.CHATS, { keyPath: 'id' });
          chatsStore.createIndex('participantId', 'participantId', { unique: false });
          chatsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          chatsStore.createIndex('hidden', 'hidden', { unique: false });
        }

        // Profiles store - cached user profiles
        if (!db.objectStoreNames.contains(STORES.PROFILES)) {
          const profilesStore = db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
          profilesStore.createIndex('username', 'username', { unique: false });
        }

        // Sync status store - track last sync timestamps
        if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
          db.createObjectStore(STORES.SYNC_STATUS, { keyPath: 'key' });
        }

        // Search cache store
        if (!db.objectStoreNames.contains(STORES.SEARCH_CACHE)) {
          const searchStore = db.createObjectStore(STORES.SEARCH_CACHE, { keyPath: 'id', autoIncrement: true });
          searchStore.createIndex('query', 'query', { unique: false });
          searchStore.createIndex('type', 'type', { unique: false });
          searchStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // ==================== CHAT LIST MANAGEMENT ====================

  /**
   * Get all chats from local cache instantly (no network)
   */
  async getCachedChats(userId: string): Promise<CachedChat[]> {
    await this.initDB();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHATS, 'readonly');
      const store = transaction.objectStore(STORES.CHATS);
      const request = store.getAll();

      request.onsuccess = () => {
        const chats = (request.result as CachedChat[])
          .filter(chat => !chat.hidden)
          .sort((a, b) => {
            const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return bTime - aTime;
          });
        resolve(chats);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save chat to local cache
   */
  async saveChat(chat: CachedChat): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHATS, 'readwrite');
      const store = transaction.objectStore(STORES.CHATS);
      const request = store.put(chat);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save multiple chats at once
   */
  async saveChats(chats: CachedChat[]): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHATS, 'readwrite');
      const store = transaction.objectStore(STORES.CHATS);

      let completed = 0;
      if (chats.length === 0) {
        resolve();
        return;
      }

      chats.forEach(chat => {
        const request = store.put(chat);
        request.onsuccess = () => {
          completed++;
          if (completed === chats.length) resolve();
        };
        request.onerror = () => {
          completed++;
          if (completed === chats.length) reject(request.error);
        };
      });
    });
  }

  /**
   * Hide a chat from the list (but keep the data)
   */
  async hideChat(chatId: string): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHATS, 'readwrite');
      const store = transaction.objectStore(STORES.CHATS);
      const getRequest = store.get(chatId);

      getRequest.onsuccess = () => {
        const chat = getRequest.result as CachedChat;
        if (chat) {
          chat.hidden = true;
          const putRequest = store.put(chat);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Unhide a chat (when user receives a message)
   */
  async unhideChat(chatId: string): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHATS, 'readwrite');
      const store = transaction.objectStore(STORES.CHATS);
      const getRequest = store.get(chatId);

      getRequest.onsuccess = () => {
        const chat = getRequest.result as CachedChat;
        if (chat) {
          chat.hidden = false;
          const putRequest = store.put(chat);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Update chat's last message
   */
  async updateChatLastMessage(chatId: string, message: LocalMessage): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHATS, 'readwrite');
      const store = transaction.objectStore(STORES.CHATS);
      const getRequest = store.get(chatId);

      getRequest.onsuccess = () => {
        const chat = getRequest.result as CachedChat;
        if (chat) {
          chat.lastMessage = message;
          chat.lastMessageTime = message.timestamp;
          chat.updatedAt = new Date();
          chat.hidden = false; // Unhide if new message received
          const putRequest = store.put(chat);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ==================== PROFILE CACHING ====================

  /**
   * Get cached profile
   */
  async getCachedProfile(userId: string): Promise<CachedProfile | null> {
    await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.PROFILES, 'readonly');
      const store = transaction.objectStore(STORES.PROFILES);
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save profile to cache
   */
  async saveProfile(profile: CachedProfile): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.PROFILES, 'readwrite');
      const store = transaction.objectStore(STORES.PROFILES);
      const request = store.put({ ...profile, cachedAt: new Date() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save multiple profiles
   */
  async saveProfiles(profiles: CachedProfile[]): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.PROFILES, 'readwrite');
      const store = transaction.objectStore(STORES.PROFILES);

      let completed = 0;
      if (profiles.length === 0) {
        resolve();
        return;
      }

      profiles.forEach(profile => {
        const request = store.put({ ...profile, cachedAt: new Date() });
        request.onsuccess = () => {
          completed++;
          if (completed === profiles.length) resolve();
        };
        request.onerror = () => {
          completed++;
          if (completed === profiles.length) reject(request.error);
        };
      });
    });
  }

  // ==================== SYNC MANAGEMENT ====================

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(key: string): Promise<Date | null> {
    await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SYNC_STATUS, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_STATUS);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.timestamp ? new Date(result.timestamp) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update last sync timestamp
   */
  async setLastSyncTime(key: string, timestamp: Date): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SYNC_STATUS, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_STATUS);
      const request = store.put({ key, timestamp: timestamp.toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync chats from server (background, delta updates only)
   */
  async syncChatsFromServer(userId: string): Promise<CachedChat[]> {
    if (this.syncInProgress || !navigator.onLine) return [];
    this.syncInProgress = true;

    try {
      const lastSync = await this.getLastSyncTime('chats');
      
      // Get chats from server
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id, is_group, created_at, updated_at')
        .eq('is_group', false)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (chatsError) throw chatsError;

      const cachedChats: CachedChat[] = [];

      for (const chat of chats || []) {
        // Get participants
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chat.id);

        if (!participants || participants.length !== 2) continue;

        const otherUserId = participants.find(p => p.user_id !== userId)?.user_id;
        if (!otherUserId) continue;

        // Get other user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();

        if (!profile) continue;

        // Cache the profile
        await this.saveProfile({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          bio: profile.bio,
          cachedAt: new Date()
        });

        // Get last message (delta: only if updated since last sync)
        let lastMessage: LocalMessage | undefined;
        let lastMessageTime: Date | undefined;

        const messageQuery = supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: messages } = await messageQuery;

        if (messages && messages.length > 0) {
          const msg = messages[0];
          lastMessage = {
            id: msg.id,
            chatId: msg.chat_id,
            userId: msg.user_id,
            content: msg.content,
            type: msg.type as any,
            mediaUrl: msg.media_url,
            duration: msg.duration,
            seen: msg.seen,
            timestamp: new Date(msg.created_at),
            status: msg.seen ? 'read' : 'delivered',
            synced: true
          } as LocalMessage;
          lastMessageTime = new Date(msg.created_at);
        }

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('seen', false)
          .neq('user_id', userId);

        const cachedChat: CachedChat = {
          id: chat.id,
          participantId: otherUserId,
          participant: {
            id: profile.id,
            name: profile.name,
            username: profile.username,
            email: profile.email,
            avatar: profile.avatar,
            photoURL: profile.avatar,
            bio: profile.bio,
            followerCount: profile.follower_count || 0,
            followingCount: profile.following_count || 0,
            profileViews: profile.profile_views || 0,
            createdAt: new Date(profile.created_at)
          },
          lastMessage,
          lastMessageTime,
          unreadCount: unreadCount || 0,
          updatedAt: new Date(chat.updated_at || chat.created_at)
        };

        cachedChats.push(cachedChat);
      }

      // Save all chats to local cache
      await this.saveChats(cachedChats);
      await this.setLastSyncTime('chats', new Date());

      return cachedChats;
    } catch (error) {
      console.error('[OfflineChat] Sync error:', error);
      return [];
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync messages for a specific chat (delta updates)
   */
  async syncChatMessages(chatId: string, userId: string): Promise<LocalMessage[]> {
    if (!navigator.onLine) return [];

    try {
      const lastSync = await this.getLastSyncTime(`messages_${chatId}`);
      
      // Build query for delta updates
      let query = supabase
        .from('messages')
        .select(`
          *,
          user:profiles!messages_user_id_fkey (
            id, name, username, avatar
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      // Only fetch new messages since last sync
      if (lastSync) {
        query = query.gt('created_at', lastSync.toISOString());
      }

      const { data: messages, error } = await query;
      if (error) throw error;

      const localMessages: LocalMessage[] = (messages || []).map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        userId: msg.user_id,
        user: msg.user ? {
          id: msg.user.id,
          name: msg.user.name,
          username: msg.user.username,
          email: '',
          avatar: msg.user.avatar,
          photoURL: msg.user.avatar,
          bio: '',
          followerCount: 0,
          followingCount: 0,
          profileViews: 0,
          createdAt: new Date()
        } : undefined,
        content: msg.content,
        type: msg.type as any,
        mediaUrl: msg.media_url,
        duration: msg.duration,
        seen: msg.seen,
        timestamp: new Date(msg.created_at),
        status: msg.seen ? 'read' : 'delivered',
        synced: true
      })) as LocalMessage[];

      // Save to local message store
      if (localMessages.length > 0) {
        await localMessageService.saveMessages(localMessages);
        await this.setLastSyncTime(`messages_${chatId}`, new Date());
      }

      return localMessages;
    } catch (error) {
      console.error('[OfflineChat] Message sync error:', error);
      return [];
    }
  }

  // ==================== SEARCH CACHING ====================

  /**
   * Save search results to cache
   */
  async saveSearchResults(query: string, type: string, results: any[]): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SEARCH_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.SEARCH_CACHE);
      
      // Store each result with query reference
      const searchEntry = {
        query: query.toLowerCase(),
        type,
        results,
        cachedAt: new Date()
      };

      const request = store.add(searchEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string, type?: string): Promise<any[]> {
    await this.initDB();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SEARCH_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.SEARCH_CACHE);
      const index = store.index('query');
      const request = index.getAll(query.toLowerCase());

      request.onsuccess = () => {
        let results = request.result || [];
        if (type) {
          results = results.filter(r => r.type === type);
        }
        // Flatten results
        const flatResults = results.flatMap(r => r.results || []);
        resolve(flatResults);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear old search cache (keep last 500 entries)
   */
  async cleanupSearchCache(): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SEARCH_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.SEARCH_CACHE);
      const index = store.index('cachedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const entries = request.result || [];
        if (entries.length <= 500) {
          resolve();
          return;
        }

        // Sort by date and delete oldest entries
        entries.sort((a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime());
        const toDelete = entries.slice(500);

        toDelete.forEach(entry => {
          if (entry.id) store.delete(entry.id);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.CHATS, STORES.PROFILES, STORES.SYNC_STATUS, STORES.SEARCH_CACHE],
        'readwrite'
      );

      const stores = [STORES.CHATS, STORES.PROFILES, STORES.SYNC_STATUS, STORES.SEARCH_CACHE];
      let completed = 0;

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) resolve();
        };
        request.onerror = () => {
          completed++;
          if (completed === stores.length) reject(request.error);
        };
      });
    });
  }
}

export const offlineChatService = new OfflineChatService();
export type { CachedChat, CachedProfile };
