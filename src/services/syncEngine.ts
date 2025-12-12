import CacheEngine from '@/core/cacheEngine';
import { networkController } from '@/core/networkController';
import supabase from '@/services/supabaseClient';

type QueueItem = { id: string; table: string; rows: any[]; attempts?: number; createdAt: number };

const QUEUE_PREFIX = 'sync-queue-';

export const syncEngine = {
  async enqueue(table: string, rows: any[]) {
    const item: QueueItem = { id: `${QUEUE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2,8)}`, table, rows, attempts: 0, createdAt: Date.now() };
    await CacheEngine.set(item.id, item);
    this.processQueue().catch(console.error);
  },

  async processQueue() {
    if (!networkController.isOnline()) return;
    const keys = await CacheEngine.allKeys();
    const queueKeys = keys.filter(k => k.startsWith(QUEUE_PREFIX)).sort();
    for (const key of queueKeys) {
      const item = await CacheEngine.get<QueueItem>(key);
      if (!item) { await CacheEngine.delete(key); continue; }
      try {
        // Attempt to upsert in batch (supabase wrapper handles small batches)
        await supabase.from(item.table).upsert(item.rows);
        await CacheEngine.delete(key);
      } catch (e) {
        item.attempts = (item.attempts || 0) + 1;
        await CacheEngine.set(key, item);
        // Exponential backoff delay
        const delay = Math.min(60_000, Math.pow(2, item.attempts || 1) * 1000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
};

// Auto-process when back online
networkController.subscribe((s) => { if (s.isOnline) setTimeout(() => syncEngine.processQueue(), 200); });

export default syncEngine;
