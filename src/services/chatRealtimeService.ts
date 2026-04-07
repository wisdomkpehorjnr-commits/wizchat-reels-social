/**
 * Chat Realtime Service
 * Manages realtime subscriptions, message receipts, chat summaries, and read/delivered tracking.
 * Single source of truth for chat list data.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChatSummary {
  chatId: string;
  isGroup: boolean;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  creatorId: string | null;
  updatedAt: string;
  createdAt: string;
  memberCount: number;
  isPublic: boolean;
  inviteCode: string | null;
  lastMessageId: string | null;
  lastMessageContent: string | null;
  lastMessageType: string | null;
  lastMessageMediaUrl: string | null;
  lastMessageCreatedAt: string | null;
  lastMessageUserId: string | null;
  unreadCount: number;
  // populated after join
  participants?: any[];
}

const CHAT_SUMMARIES_CACHE_KEY = 'wizchat_chat_summaries';

// ---- Persistent module-level store ----
let _cachedSummaries: ChatSummary[] = [];
let _lastFetchTs = 0;
const MIN_REFRESH_MS = 20_000; // 20s

try {
  const raw = localStorage.getItem(CHAT_SUMMARIES_CACHE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) {
      _cachedSummaries = parsed.data;
      _lastFetchTs = parsed.ts || 0;
    }
  }
} catch {}

function persistSummaries(summaries: ChatSummary[]) {
  _cachedSummaries = summaries;
  _lastFetchTs = Date.now();
  try {
    localStorage.setItem(CHAT_SUMMARIES_CACHE_KEY, JSON.stringify({ data: summaries, ts: _lastFetchTs }));
  } catch {}
}

export function getCachedSummaries(): ChatSummary[] {
  return _cachedSummaries;
}

export function isCacheFresh(): boolean {
  return Date.now() - _lastFetchTs < MIN_REFRESH_MS;
}

/**
 * Fetch chat summaries from server (via the new `get_chat_summaries` RPC).
 * Falls back to cache when offline.
 */
export async function fetchChatSummaries(): Promise<ChatSummary[]> {
  try {
    const { data, error } = await supabase.rpc('get_chat_summaries');
    if (error) throw error;

    const summaries: ChatSummary[] = (data || []).map((row: any) => ({
      chatId: row.chat_id,
      isGroup: row.is_group,
      name: row.name,
      description: row.description,
      avatarUrl: row.avatar_url,
      creatorId: row.creator_id,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      memberCount: row.member_count || 0,
      isPublic: row.is_public,
      inviteCode: row.invite_code,
      lastMessageId: row.last_message_id,
      lastMessageContent: row.last_message_content,
      lastMessageType: row.last_message_type,
      lastMessageMediaUrl: row.last_message_media_url,
      lastMessageCreatedAt: row.last_message_created_at,
      lastMessageUserId: row.last_message_user_id,
      unreadCount: Number(row.unread_count) || 0,
    }));

    if (summaries.length > 0) {
      const { data: participantRows, error: participantsError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          role,
          profiles:user_id (
            id,
            name,
            username,
            email,
            avatar,
            bio,
            location,
            website,
            birthday,
            gender,
            pronouns,
            cover_image,
            is_private,
            follower_count,
            following_count,
            profile_views,
            is_verified,
            created_at
          )
        `)
        .in('chat_id', summaries.map(summary => summary.chatId));

      if (!participantsError && participantRows) {
        const participantsByChat = participantRows.reduce<Record<string, any[]>>((acc, row: any) => {
          if (!row?.profiles) return acc;

          if (!acc[row.chat_id]) {
            acc[row.chat_id] = [];
          }

          acc[row.chat_id].push({
            ...row.profiles,
            role: row.role,
            photoURL: row.profiles.avatar || '',
            createdAt: row.profiles.created_at || null,
            coverImage: row.profiles.cover_image || '',
            followerCount: row.profiles.follower_count || 0,
            followingCount: row.profiles.following_count || 0,
            profileViews: row.profiles.profile_views || 0,
            isPrivate: row.profiles.is_private ?? false,
          });

          return acc;
        }, {});

        summaries.forEach(summary => {
          summary.participants = participantsByChat[summary.chatId] || [];
        });
      }
    }

    persistSummaries(summaries);
    return summaries;
  } catch (err) {
    console.debug('[ChatService] fetchChatSummaries failed, using cache', err);
    return _cachedSummaries;
  }
}

/**
 * Mark all messages in a chat as delivered for the current user.
 */
export async function markChatDelivered(chatId: string): Promise<void> {
  try {
    await supabase.rpc('mark_chat_messages_delivered', { _chat_id: chatId });
  } catch (err) {
    console.debug('[ChatService] markChatDelivered failed', err);
  }
}

/**
 * Mark all messages in a chat as read for the current user.
 */
export async function markChatRead(chatId: string): Promise<void> {
  try {
    await supabase.rpc('mark_chat_messages_read', { _chat_id: chatId });
  } catch (err) {
    console.debug('[ChatService] markChatRead failed', err);
  }
}

/**
 * Determine message status from receipt data.
 * For the sender's own messages: check if all recipients delivered / read.
 */
export async function getMessageStatuses(chatId: string, messageIds: string[]): Promise<Record<string, 'sent' | 'delivered' | 'read'>> {
  if (messageIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('message_receipts')
      .select('message_id, delivered_at, read_at')
      .eq('chat_id', chatId)
      .in('message_id', messageIds);

    if (error) throw error;

    // Group by message_id
    const byMsg: Record<string, { delivered: boolean; read: boolean }[]> = {};
    for (const r of data || []) {
      if (!byMsg[r.message_id]) byMsg[r.message_id] = [];
      byMsg[r.message_id].push({ delivered: !!r.delivered_at, read: !!r.read_at });
    }

    const result: Record<string, 'sent' | 'delivered' | 'read'> = {};
    for (const id of messageIds) {
      const receipts = byMsg[id];
      if (!receipts || receipts.length === 0) {
        result[id] = 'sent';
        continue;
      }
      const allRead = receipts.every(r => r.read);
      const allDelivered = receipts.every(r => r.delivered);
      if (allRead) result[id] = 'read';
      else if (allDelivered) result[id] = 'delivered';
      else result[id] = 'sent';
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Get a formatted message preview string for the chat list.
 */
export function formatMessagePreview(
  content: string | null,
  type: string | null,
  mediaUrl: string | null,
  isMe: boolean
): string {
  const prefix = isMe ? 'You: ' : '';
  if (type === 'image') return `${prefix}📷 Photo`;
  if (type === 'video') return `${prefix}🎥 Video`;
  if (type === 'voice' || (mediaUrl && content === '' && type === 'text')) return `${prefix}🎤 Voice message`;
  if (content && content.trim()) {
    const text = content.trim();
    const short = text.length > 60 ? text.substring(0, 60) + '...' : text;
    return `${prefix}${short}`;
  }
  if (mediaUrl) return `${prefix}📎 File`;
  return '';
}