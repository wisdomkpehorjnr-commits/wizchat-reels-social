/**
 * Network-Aware Data Fetching
 * Adapts request strategy based on connection speed
 * - Reduces image quality on slow networks
 * - Implements request batching for slow connections
 * - Enables compression and progressive loading
 */

import { networkStatusManager } from './networkStatusManager';
import { retryWithBackoff } from '@/lib/performanceUtils';

export interface FetchOptions {
  priority?: 'critical' | 'high' | 'normal' | 'low';
  adaptiveQuality?: boolean;
  batchable?: boolean;
  timeout?: number;
  retries?: number;
}

export interface AdaptiveImageOptions {
  originalUrl: string;
  sizes?: string[];
  enableWebP?: boolean;
  quality?: number;
}

class NetworkAwareFetcher {
  private requestBatch: Map<string, any> = new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private batchDelay = 500; // ms

  /**
   * Smart fetch that adapts to network conditions
   */
  async smartFetch<T>(
    url: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const {
      priority = 'normal',
      adaptiveQuality = true,
      batchable = false,
      timeout = 30000,
      retries = 3,
    } = options;

    const speed = await networkStatusManager.getSpeed();
    const isSlow = speed === 'slow';

    // Adjust timeout for slow networks
    const adjustedTimeout = isSlow ? timeout * 2 : timeout;

    // Use request batching on slow networks
    if (batchable && isSlow) {
      return this.batchedFetch<T>(url, adjustedTimeout, retries);
    }

    // Standard fetch with retry
    return retryWithBackoff(
      async () => {
        return this.fetchWithTimeout<T>(url, adjustedTimeout);
      },
      retries
    );
  }

  /**
   * Batched requests for slow networks (reduces overhead)
   */
  private batchedFetch<T>(
    url: string,
    timeout: number,
    retries: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchKey = url;

      // Add to batch
      if (!this.requestBatch.has(batchKey)) {
        this.requestBatch.set(batchKey, {
          url,
          resolvers: [],
          rejecters: [],
        });
      }

      const batch = this.requestBatch.get(batchKey);
      batch.resolvers.push(resolve);
      batch.rejecters.push(reject);

      // Schedule batch execution
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.executeBatch(timeout, retries);
          this.batchTimer = null;
        }, this.batchDelay);
      }
    });
  }

  /**
   * Execute batched requests
   */
  private async executeBatch(timeout: number, retries: number) {
    const batchEntries = Array.from(this.requestBatch.entries());
    this.requestBatch.clear();

    for (const [key, batch] of batchEntries) {
      try {
        const result = await retryWithBackoff(
          async () => {
            return this.fetchWithTimeout(batch.url, timeout);
          },
          retries
        );

        batch.resolvers.forEach(r => r(result));
      } catch (error) {
        batch.rejecters.forEach(r => r(error));
      }
    }
  }

  /**
   * Fetch with timeout
   */
  private fetchWithTimeout<T>(url: string, timeout: number): Promise<T> {
    return Promise.race([
      fetch(url).then(r => r.json()),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Fetch timeout: ${url}`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Generate adaptive image URL based on network speed
   */
  getAdaptiveImageUrl(options: AdaptiveImageOptions): string {
    const { originalUrl, sizes = [256, 512, 1024], enableWebP = true } = options;

    // For now, return original URL
    // In production, this would integrate with image CDN for dynamic resizing
    // Example: https://cdn.example.com/image?url=original&width=512&format=webp
    return originalUrl;
  }

  /**
   * Generate srcset for responsive images
   */
  getImageSrcset(url: string, isSlowNetwork: boolean): string {
    if (isSlowNetwork) {
      // Lower quality images for slow networks
      return `${url}?w=256 256w, ${url}?w=512 512w`;
    }

    // Full quality for fast networks
    return `${url}?w=512 512w, ${url}?w=1024 1024w, ${url}?w=2048 2048w`;
  }

  /**
   * Prefetch critical resources
   */
  async prefetch(urls: string[]): Promise<void> {
    const link = document.createElement('link');
    link.rel = 'prefetch';

    for (const url of urls) {
      link.href = url;
      document.head.appendChild(link);
    }
  }

  /**
   * Preload critical resources (higher priority than prefetch)
   */
  async preload(urls: string[], options?: { as?: string }): Promise<void> {
    const link = document.createElement('link');
    link.rel = 'preload';
    if (options?.as) link.as = options.as;

    for (const url of urls) {
      link.href = url;
      document.head.appendChild(link);
    }
  }

  /**
   * Progressive image loading with placeholders
   */
  createProgressiveImage(url: string): {
    placeholder: string;
    full: string;
  } {
    // Low quality placeholder (could be a blur hash)
    const placeholder = `${url}?w=50&blur=10`;
    const full = url;

    return { placeholder, full };
  }

  /**
   * Compress data for transmission on slow networks
   */
  async compressData(data: any): Promise<string> {
    const json = JSON.stringify(data);

    // Use TextEncoder/Deflate if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(new TextEncoder().encode(json));
      writer.close();

      const compressed = await new Response(stream.readable).arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(compressed)));
    }

    // Fallback: return encoded
    return btoa(json);
  }

  /**
   * Decompress data
   */
  async decompressData(compressed: string): Promise<any> {
    try {
      const binary = atob(compressed);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      if (typeof DecompressionStream !== 'undefined') {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        writer.write(bytes);
        writer.close();

        const decompressed = await new Response(stream.readable).text();
        return JSON.parse(decompressed);
      }

      return JSON.parse(binary);
    } catch (error) {
      console.error('[NetworkAware] Decompression error:', error);
      throw error;
    }
  }
}

export const networkAwareFetcher = new NetworkAwareFetcher();
