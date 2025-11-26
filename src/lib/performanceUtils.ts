/**
 * Performance Utilities
 * Handles request timeouts, batching, deduplication, and smart caching
 */

interface RequestOptions {
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
  priority?: 'high' | 'normal' | 'low';
}

interface PendingRequest {
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RequestManager {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private batchQueue: Map<string, any[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // milliseconds
  private readonly DEFAULT_TIMEOUT = 30 * 1000; // 30 seconds
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Execute request with timeout and automatic fallback
   */
  async executeRequest<T>(
    key: string,
    fn: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      cache = true,
      cacheTTL = this.CACHE_DURATION,
      priority = 'normal',
    } = options;

    // Return cached result if available
    if (cache && this.requestCache.has(key)) {
      const cached = this.requestCache.get(key)!;
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data as T;
      } else {
        this.requestCache.delete(key);
      }
    }

    // Return existing pending request if already in flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!.promise;
    }

    // Create new request with timeout
    const timeoutPromise = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    );

    const requestPromise = Promise.race([fn(), timeoutPromise]);

    // Track pending request
    let resolve: (value: T) => void;
    let reject: (error: any) => void;
    const pendingPromise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pendingRequests.set(key, {
      promise: pendingPromise,
      resolve: resolve!,
      reject: reject!,
      timestamp: Date.now(),
    });

    try {
      const result = await requestPromise;

      // Cache successful result
      if (cache) {
        this.requestCache.set(key, {
          data: result,
          timestamp: Date.now(),
        });
      }

      resolve!(result);
      this.pendingRequests.delete(key);
      return result;
    } catch (error) {
      reject!(error);
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Batch multiple requests and execute together
   */
  async batchRequest<T>(
    batchKey: string,
    itemKey: string,
    fn: (items: string[]) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      const queue = this.batchQueue.get(batchKey)!;
      queue.push({ itemKey, resolve, reject });

      // Clear existing timer
      if (this.batchTimer) clearTimeout(this.batchTimer);

      // Set new timer to execute batch
      this.batchTimer = setTimeout(async () => {
        const items = queue.map(item => item.itemKey);
        try {
          const results = await fn(items);
          queue.forEach(item => {
            const result = results[item.itemKey];
            if (result !== undefined) {
              item.resolve(result);
            } else {
              item.reject(new Error(`No result for ${item.itemKey}`));
            }
          });
        } catch (error) {
          queue.forEach(item => item.reject(error));
        }
        this.batchQueue.delete(batchKey);
      }, this.BATCH_DELAY);
    });
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.requestCache.keys()) {
        if (regex.test(key)) {
          this.requestCache.delete(key);
        }
      }
    } else {
      this.requestCache.clear();
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cacheSize: this.requestCache.size,
      pendingRequests: this.pendingRequests.size,
      queuedBatches: this.batchQueue.size,
    };
  }
}

/**
 * Debounce function with configurable wait time
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function with configurable interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  maxAge: number = 5 * 60 * 1000
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, { value: any; timestamp: number }>();

  return (...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.value;
    }

    const result = func(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Singleton instance
export const requestManager = new RequestManager();
