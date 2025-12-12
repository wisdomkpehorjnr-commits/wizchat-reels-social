/**
 * Lightweight IndexedDB-based cache engine for offline-first storage
 */
const DB_NAME = 'wizchat_cache_v1';
const DB_STORE = 'kv';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, cb: (store: IDBObjectStore) => Promise<T>) {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, mode);
    const store = tx.objectStore(DB_STORE);
    cb(store).then((res) => {
      tx.oncomplete = () => resolve(res);
      tx.onerror = () => reject(tx.error);
    }).catch(reject);
  });
}

export const CacheEngine = {
  async get<T = any>(key: string): Promise<T | null> {
    return withStore('readonly', (store) => new Promise<T | null>((res, rej) => {
      const req = store.get(key);
      req.onsuccess = () => res(req.result ? req.result.value : null);
      req.onerror = () => rej(req.error);
    }));
  },

  async set(key: string, value: any) {
    return withStore('readwrite', (store) => new Promise<void>((res, rej) => {
      const payload = { key, value, updatedAt: Date.now() };
      const req = store.put(payload);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    }));
  },

  async delete(key: string) {
    return withStore('readwrite', (store) => new Promise<void>((res, rej) => {
      const req = store.delete(key);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    }));
  },

  async allKeys(): Promise<string[]> {
    return withStore('readonly', (store) => new Promise<string[]>((res, rej) => {
      const keys: string[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return res(keys);
        keys.push(cur.key as string);
        cur.continue();
      };
      req.onerror = () => rej(req.error);
    }));
  },

  async putBatch(items: Array<{ key: string; value: any }>) {
    return withStore('readwrite', (store) => new Promise<void>((res, rej) => {
      try {
        for (const it of items) store.put({ key: it.key, value: it.value, updatedAt: Date.now() });
        res();
      } catch (e) {
        rej(e);
      }
    }));
  },

  async queryChangedSince(prefix: string, since: number) {
    return withStore('readonly', (store) => new Promise<any[]>((res, rej) => {
      const results: any[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return res(results);
        const key = cur.key as string;
        if (key.startsWith(prefix) && cur.value && cur.value.updatedAt > since) {
          results.push({ key, value: cur.value.value, updatedAt: cur.value.updatedAt });
        }
        cur.continue();
      };
      req.onerror = () => rej(req.error);
    }));
  },

  async cleanupOlderThan(ttlMs: number) {
    const cutoff = Date.now() - ttlMs;
    return withStore('readwrite', (store) => new Promise<void>((res, rej) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return res();
        try {
          if (cur.value && cur.value.updatedAt < cutoff) cur.delete();
        } catch (e) {
          // ignore per-item errors
        }
        cur.continue();
      };
      req.onerror = () => rej(req.error);
    }));
  }
};

export default CacheEngine;
