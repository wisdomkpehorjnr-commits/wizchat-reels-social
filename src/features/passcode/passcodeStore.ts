/**
 * Local-only 2FA / app passcode.
 * PIN is hashed with SHA-256 + per-user salt and persisted in localStorage.
 * Verified session flag lives in sessionStorage — clearing it (logout or
 * fresh browser session) forces the passcode prompt again.
 */

const enabledKey = (userId: string) => `passcode.enabled.${userId}`;
const hashKey = (userId: string) => `passcode.hash.${userId}`;
const saltKey = (userId: string) => `passcode.salt.${userId}`;
const unlockedKey = (userId: string) => `passcode.unlocked.${userId}`;

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const passcode = {
  isEnabled(userId: string): boolean {
    return localStorage.getItem(enabledKey(userId)) === '1';
  },
  isUnlocked(userId: string): boolean {
    return sessionStorage.getItem(unlockedKey(userId)) === '1';
  },
  markUnlocked(userId: string) {
    sessionStorage.setItem(unlockedKey(userId), '1');
  },
  lock(userId: string) {
    sessionStorage.removeItem(unlockedKey(userId));
  },
  async enable(userId: string, pin: string) {
    const salt = randomSalt();
    const hash = await sha256(salt + pin);
    localStorage.setItem(saltKey(userId), salt);
    localStorage.setItem(hashKey(userId), hash);
    localStorage.setItem(enabledKey(userId), '1');
    this.markUnlocked(userId);
  },
  async disable(userId: string) {
    localStorage.removeItem(enabledKey(userId));
    localStorage.removeItem(hashKey(userId));
    localStorage.removeItem(saltKey(userId));
    this.lock(userId);
  },
  async verify(userId: string, pin: string): Promise<boolean> {
    const salt = localStorage.getItem(saltKey(userId));
    const stored = localStorage.getItem(hashKey(userId));
    if (!salt || !stored) return false;
    const hash = await sha256(salt + pin);
    const ok = hash === stored;
    if (ok) this.markUnlocked(userId);
    return ok;
  },
};
