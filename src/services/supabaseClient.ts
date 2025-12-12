import { createClient, SupabaseClient } from '@supabase/supabase-js';
import CacheEngine from '@/core/cacheEngine';
import { networkController } from '@/core/networkController';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Supabase] Missing env config; some features may fail in local dev');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '', {
  global: { headers: { 'x-client-name': 'wizchat-lowdata' } },
  auth: { persistSession: false },
});

export async function queryWithCache(table: string, opts: {select?: string; eq?: Record<string, any>; limit?: number; order?: string}, cacheKey?: string, ttlMs = 60_000) {
  const key = cacheKey || `${table}:${JSON.stringify(opts)}`;
  const cached = await CacheEngine.get(key);
  if (cached) return { data: cached, fromCache: true };

  // If offline, return null so UI can render cached content or fallback
  if (!networkController.isOnline()) return { data: null, fromCache: false };

  const qb = supabase.from(table).select(opts.select || '*');
  if (opts.eq) for (const k of Object.keys(opts.eq)) qb.eq(k, opts.eq[k]);
  if (opts.order) qb.order(opts.order);
  if (opts.limit) qb.limit(opts.limit);

  const { data, error } = await qb;
  if (error) throw error;
  await CacheEngine.set(key, data);
  setTimeout(() => CacheEngine.cleanupOlderThan(ttlMs * 5).catch(() => {}), 0);
  return { data, fromCache: false };
}

export async function batchInsert(table: string, rows: any[]) {
  // Use single upsert to reduce roundtrips
  if (!rows || rows.length === 0) return { data: [], error: null };
  // If offline, queue to CacheEngine (syncEngine will handle)
  if (!networkController.isOnline()) {
    await CacheEngine.set(`queue:${Date.now()}`, { table, rows });
    return { data: null, error: 'queued_offline' } as any;
  }
  return supabase.from(table).upsert(rows);
}

export function subscribeNewMessages(callback: (msg: any) => void) {
  // Keep realtime usage minimal: only new messages channel
  try {
    const channel = supabase.channel('new-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      callback(payload.new || payload);
    }).subscribe();
    return () => supabase.removeChannel(channel);
  } catch (e) {
    console.debug('[Supabase] Realtime subscription failed', e);
    return () => {};
  }
}

export default supabase;
