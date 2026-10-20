const KEY = 'wizchat-toasted-messages';
const OPENED_KEY = 'wizchat-chat-opened-at';

const load = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};

/** Returns true only the first time a message id is seen, and never after the chat tab was opened. */
export function shouldToastMessage(id: string, createdAt?: string | number | Date): boolean {
  if (!id) return false;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/chat')) return false;
  const opened = Number(localStorage.getItem(OPENED_KEY) || 0);
  if (createdAt && opened && new Date(createdAt).getTime() <= opened) return false;
  const seen = load();
  if (seen.includes(id)) return false;
  seen.push(id);
  localStorage.setItem(KEY, JSON.stringify(seen.slice(-500)));
  return true;
}

/** Call when the chat tab opens: silences every pending pop-up up to now. */
export function markChatOpened() {
  localStorage.setItem(OPENED_KEY, String(Date.now()));
}
