// Simple video caching utilities using the Cache Storage API
const CACHE_NAME = 'wizchat-reels-videos-v1';

export async function prefetchVideo(url: string) {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) return;
    // Fetch and store
    const resp = await fetch(url, { mode: 'cors', credentials: 'same-origin' });
    if (resp && resp.ok) {
      await cache.put(url, resp.clone());
    }
  } catch (err) {
    console.warn('[reelsCache] prefetchVideo failed', err);
  }
}

export async function getCachedVideoUrl(url: string): Promise<string | null> {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;
    // Create blob URL to use as video src
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[reelsCache] getCachedVideoUrl failed', err);
    return null;
  }
}

export async function clearCachedVideoUrl(objectUrl: string) {
  try {
    URL.revokeObjectURL(objectUrl);
  } catch (e) {}
}

export async function removeVideoFromCache(url: string) {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  } catch (e) {}
}
