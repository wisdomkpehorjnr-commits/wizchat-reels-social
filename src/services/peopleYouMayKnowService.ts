import { supabase } from '@/integrations/supabase/client';

export interface PymkUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  mutualCount?: number;
}

const CACHE_KEY = 'wizchat_pymk_cache_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

function readCache(): PymkUser[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.users || !Array.isArray(parsed.users)) return null;
    return parsed.users as PymkUser[];
  } catch { return null; }
}

function writeCache(users: PymkUser[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ users, timestamp: Date.now() })); } catch {}
}

function isCacheFresh(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Date.now() - (parsed.timestamp || 0) < TTL_MS;
  } catch { return false; }
}

/**
 * Returns instantly-available people-you-may-know list.
 * Always returns cached data first (works offline); refreshes in background.
 */
export async function getPymk(currentUserId: string): Promise<PymkUser[]> {
  const cached = readCache() || [];
  if (isCacheFresh() && cached.length > 0) {
    // Stale-while-revalidate
    if (navigator.onLine) refreshPymk(currentUserId).catch(() => {});
    return cached;
  }
  try {
    const fresh = await refreshPymk(currentUserId);
    return fresh.length ? fresh : cached;
  } catch {
    return cached;
  }
}

export async function refreshPymk(currentUserId: string): Promise<PymkUser[]> {
  if (!currentUserId || !navigator.onLine) return readCache() || [];
  try {
    // Step 1: get my accepted friend IDs
    const { data: myFriends } = await supabase
      .from('friends')
      .select('requester_id,addressee_id')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
      .eq('status', 'accepted');

    const myFriendIds = new Set<string>();
    (myFriends || []).forEach((row: any) => {
      const other = row.requester_id === currentUserId ? row.addressee_id : row.requester_id;
      if (other) myFriendIds.add(other);
    });

    let candidateMap = new Map<string, number>();

    // Step 2: get friends-of-friends (true PYMK signal)
    if (myFriendIds.size > 0) {
      const friendIdList = Array.from(myFriendIds);
      const { data: fof } = await supabase
        .from('friends')
        .select('requester_id,addressee_id')
        .in('requester_id', friendIdList)
        .eq('status', 'accepted');

      const { data: fof2 } = await supabase
        .from('friends')
        .select('requester_id,addressee_id')
        .in('addressee_id', friendIdList)
        .eq('status', 'accepted');

      const collect = (rows: any[] | null) => {
        (rows || []).forEach((row: any) => {
          [row.requester_id, row.addressee_id].forEach((id: string) => {
            if (!id || id === currentUserId || myFriendIds.has(id)) return;
            candidateMap.set(id, (candidateMap.get(id) || 0) + 1);
          });
        });
      };
      collect(fof);
      collect(fof2);
    }

    // Fallback: if no friends-of-friends, surface some other users
    let candidateIds = Array.from(candidateMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    if (candidateIds.length === 0) {
      const { data: anyUsers } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', currentUserId)
        .limit(20);
      candidateIds = (anyUsers || []).map((u: any) => u.id).filter((id: string) => !myFriendIds.has(id));
    }

    if (candidateIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,username,avatar')
      .in('id', candidateIds);

    const users: PymkUser[] = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name || p.username || 'User',
      username: p.username || 'user',
      avatar: p.avatar,
      mutualCount: candidateMap.get(p.id) || 0,
    }));

    // Sort by mutualCount desc
    users.sort((a, b) => (b.mutualCount || 0) - (a.mutualCount || 0));

    if (users.length > 0) writeCache(users);
    return users;
  } catch (e) {
    console.debug('[pymk] refresh failed silently', e);
    return readCache() || [];
  }
}

export function getCachedPymk(): PymkUser[] {
  return readCache() || [];
}
