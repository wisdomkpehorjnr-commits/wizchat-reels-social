/**
 * Service to preload and cache post images in parallel
 * Runs in background without blocking renders
 */
import { IMAGE_CACHE_NAME, cacheImageAsync } from '@/hooks/useImageCache';

const PRELOAD_BATCH_SIZE = 5; // Load 5 images in parallel
const preloadingSet = new Set<string>();

/**
 * Preload multiple images in parallel (fire and forget)
 * Used by Post components to cache images before user scrolls to them
 */
export function preloadPostImages(imageUrls: (string | undefined)[]): void {
  const validUrls = imageUrls.filter((url): url is string => !!url);
  if (validUrls.length === 0) return;

  // Use requestIdleCallback to avoid blocking main thread
  const callback = typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(cb, 0);

  callback(() => {
    validUrls.forEach(url => {
      if (!preloadingSet.has(url)) {
        preloadingSet.add(url);
        cacheImageAsync(url)
          .catch(e => console.debug('[PreloadService] Failed to preload:', e))
          .finally(() => preloadingSet.delete(url));
      }
    });
  });
}

/**
 * Preload images from posts array
 * Extract all image URLs from posts and start caching them
 */
export function preloadPostsImages(posts: any[]): void {
  const imageUrls = new Set<string>();

  posts.forEach(post => {
    // Collect all image URLs
    if (post.imageUrl) imageUrls.add(post.imageUrl);
    if (post.images && Array.isArray(post.images)) {
      post.images.forEach((img: any) => {
        if (typeof img === 'string') imageUrls.add(img);
        else if (img?.url) imageUrls.add(img.url);
      });
    }
    if (post.posterUrl) imageUrls.add(post.posterUrl);
  });

  if (imageUrls.size > 0) {
    preloadPostImages(Array.from(imageUrls));
  }
}

/**
 * Preload story images/media
 * Extract all media URLs from stories and start caching them immediately
 */
export function preloadStoriesMedia(stories: any[]): void {
  const mediaUrls = new Set<string>();

  stories.forEach(story => {
    // Collect story media URLs (images and videos)
    if (story.mediaUrl) mediaUrls.add(story.mediaUrl);
  });

  if (mediaUrls.size > 0) {
    preloadPostImages(Array.from(mediaUrls));
  }
}

/**
 * Clear preload cache
 */
export function clearPreloadCache(): void {
  preloadingSet.clear();
}
