// Premium status helpers for WizAi
export const WIZAI_PREMIUM_KEY = (userId: string) => `wizai_premium_${userId}`;
export const WIZAI_NOTIFICATIONS_KEY = (userId: string) => `wizai_notifications_${userId}`;
export const WIZAI_CHATS_KEY = (userId: string) => `wizai_chats_${userId}`;
export const WIZAI_ACTIVE_CHAT_KEY = (userId: string) => `wizai_active_chat_${userId}`;

export interface WizAiNotification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface WizAiChatSession {
  id: string;
  title: string;
  messages: WizAiMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface WizAiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export function isPremiumUnlocked(userId: string): boolean {
  try {
    return localStorage.getItem(WIZAI_PREMIUM_KEY(userId)) === 'true';
  } catch { return false; }
}

export function setPremiumUnlocked(userId: string) {
  localStorage.setItem(WIZAI_PREMIUM_KEY(userId), 'true');
}

export function getNotifications(userId: string): WizAiNotification[] {
  try {
    const raw = localStorage.getItem(WIZAI_NOTIFICATIONS_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addNotification(userId: string, message: string) {
  const notifs = getNotifications(userId);
  notifs.unshift({ id: Date.now().toString(), message, timestamp: Date.now(), read: false });
  localStorage.setItem(WIZAI_NOTIFICATIONS_KEY(userId), JSON.stringify(notifs.slice(0, 50)));
}

export function markAllNotificationsRead(userId: string) {
  const notifs = getNotifications(userId).map(n => ({ ...n, read: true }));
  localStorage.setItem(WIZAI_NOTIFICATIONS_KEY(userId), JSON.stringify(notifs));
}

export function getChatSessions(userId: string): WizAiChatSession[] {
  try {
    const raw = localStorage.getItem(WIZAI_CHATS_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveChatSessions(userId: string, sessions: WizAiChatSession[]) {
  localStorage.setItem(WIZAI_CHATS_KEY(userId), JSON.stringify(sessions));
}

export function getActiveChatId(userId: string): string | null {
  return localStorage.getItem(WIZAI_ACTIVE_CHAT_KEY(userId));
}

export function setActiveChatId(userId: string, chatId: string) {
  localStorage.setItem(WIZAI_ACTIVE_CHAT_KEY(userId), chatId);
}

export function createNewSession(): WizAiChatSession {
  return {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
