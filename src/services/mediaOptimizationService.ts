/**
 * Media Optimization Service
 * Handles network detection, caching, compression, and data saver mode
 * Goal: Reduce data usage by 80%+ like WhatsApp/TikTok
 */

// Network connection types
type ConnectionType = 'wifi' | 'cellular' | 'unknown';
type ConnectionSpeed = 'fast' | 'slow' | '2g' | '3g' | '4g';

interface NetworkInfo {
  type: ConnectionType;
  speed: ConnectionSpeed;
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

interface DataSaverSettings {
  enabled: boolean;
  autoDownloadOnWifi: boolean;
  autoDownloadOnCellular: boolean;
  videoQuality: 'auto' | '480p' | '720p' | '1080p';
  autoplayOnWifi: boolean;
  autoplayOnCellular: boolean;
  preloadVideos: boolean;
}

// IndexedDB for media caching
const DB_NAME = 'wizchat_media_cache';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200MB max cache

class MediaOptimizationService {
  private db: IDBDatabase | null = null;
  private networkInfo: NetworkInfo = { type: 'unknown', speed: 'fast' };
  private dataSaverSettings: DataSaverSettings;
  private cacheSize = 0;
  private initialized = false;

  constructor() {
    this.dataSaverSettings = this.loadDataSaverSettings();
    this.initNetworkDetection();
    this.initDatabase();
  }

  // ============= NETWORK DETECTION =============
  
  private initNetworkDetection() {
    // Use Network Information API if available
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      this.updateNetworkInfo(connection);
      connection.addEventListener('change', () => this.updateNetworkInfo(connection));
    } else {
      // Fallback: assume WiFi on desktop, cellular on mobile
      this.networkInfo = {
        type: /Mobi|Android/i.test(navigator.userAgent) ? 'cellular' : 'wifi',
        speed: 'fast'
      };
    }

    // Listen for online/offline
    window.addEventListener('online', () => this.updateNetworkInfo((navigator as any).connection));
    window.addEventListener('offline', () => {
      this.networkInfo = { type: 'unknown', speed: 'slow' };
    });
  }

  private updateNetworkInfo(connection: any) {
    if (!connection) return;

    const effectiveType = connection.effectiveType || '4g';
    const type: ConnectionType = connection.type === 'wifi' ? 'wifi' : 
                                 connection.type === 'cellular' ? 'cellular' : 
                                 'unknown';

    let speed: ConnectionSpeed = 'fast';
    if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      speed = '2g';
    } else if (effectiveType === '3g') {
      speed = '3g';
    } else if (effectiveType === '4g') {
      speed = '4g';
    }

    this.networkInfo = {
      type: type === 'unknown' ? (connection.type === 'wifi' ? 'wifi' : 'cellular') : type,
      speed,
      effectiveType,
      downlink: connection.downlink,
      saveData: connection.saveData || false
    };

    console.log('[MediaOptimization] Network updated:', this.networkInfo);
  }

  getNetworkInfo(): NetworkInfo {
    return this.networkInfo;
  }

  isOnWifi(): boolean {
    return this.networkInfo.type === 'wifi';
  }

  isOnCellular(): boolean {
    return this.networkInfo.type === 'cellular' || this.networkInfo.type === 'unknown';
  }

  shouldAutoplay(): boolean {
    if (this.dataSaverSettings.enabled) {
      return false; // Never autoplay in data saver mode
    }
    if (this.networkInfo.saveData) {
      return false; // Respect browser's data saver
    }
    if (this.isOnWifi()) {
      return this.dataSaverSettings.autoplayOnWifi;
    }
    return this.dataSaverSettings.autoplayOnCellular;
  }

  shouldAutoDownload(): boolean {
    if (this.dataSaverSettings.enabled) {
      return false;
    }
    if (this.isOnWifi()) {
      return this.dataSaverSettings.autoDownloadOnWifi;
    }
    return this.dataSaverSettings.autoDownloadOnCellular;
  }

  shouldPreloadVideos(): boolean {
    if (this.dataSaverSettings.enabled) {
      return false;
    }
    if (this.networkInfo.speed === '2g' || this.networkInfo.speed === '3g') {
      return false;
    }
    return this.dataSaverSettings.preloadVideos && this.isOnWifi();
  }

  getVideoQuality(): string {
    if (this.dataSaverSettings.enabled) {
      return '480p';
    }
    if (this.dataSaverSettings.videoQuality !== 'auto') {
      return this.dataSaverSettings.videoQuality;
    }
    // Auto quality based on network
    if (this.networkInfo.speed === '2g') return '360p';
    if (this.networkInfo.speed === '3g') return '480p';
    if (this.isOnWifi()) return '1080p';
    return '720p';
  }

  // ============= DATA SAVER SETTINGS =============

  private loadDataSaverSettings(): DataSaverSettings {
    try {
      const saved = localStorage.getItem('data_saver_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[MediaOptimization] Failed to load settings:', e);
    }
    // Default settings - MAXIMUM data saving by default (prevent 1GB drain on launch)
    return {
      enabled: true, // Data saver ON by default
      autoDownloadOnWifi: false, // NO auto-download even on WiFi
      autoDownloadOnCellular: false,
      videoQuality: '480p', // Low quality by default
      autoplayOnWifi: false, // NO autoplay by default
      autoplayOnCellular: false,
      preloadVideos: false // NEVER preload
    };
  }

  saveDataSaverSettings(settings: Partial<DataSaverSettings>) {
    this.dataSaverSettings = { ...this.dataSaverSettings, ...settings };
    localStorage.setItem('data_saver_settings', JSON.stringify(this.dataSaverSettings));
  }

  getDataSaverSettings(): DataSaverSettings {
    return { ...this.dataSaverSettings };
  }

  isDataSaverEnabled(): boolean {
    return this.dataSaverSettings.enabled || this.networkInfo.saveData || false;
  }

  // ============= INDEXEDDB MEDIA CACHE =============

  private async initDatabase(): Promise<void> {
    if (this.initialized) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[MediaOptimization] Failed to open IndexedDB:', request.error);
        resolve(); // Don't block on DB failure
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        this.calculateCacheSize();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });
  }

  private async calculateCacheSize(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(MEDIA_STORE, 'readonly');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.openCursor();
    
    let totalSize = 0;
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        totalSize += cursor.value.size || 0;
        cursor.continue();
      } else {
        this.cacheSize = totalSize;
        console.log(`[MediaOptimization] Cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      }
    };
  }

  async getCachedMedia(url: string): Promise<Blob | null> {
    if (!this.db) await this.initDatabase();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MEDIA_STORE, 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(url);

      request.onsuccess = () => {
        if (request.result) {
          // Update last accessed time (for LRU eviction)
          this.updateMediaTimestamp(url);
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  async cacheMedia(url: string, blob: Blob, type: 'video' | 'image' | 'audio'): Promise<void> {
    if (!this.db) await this.initDatabase();
    if (!this.db) return;

    // Check if we need to evict old entries
    if (this.cacheSize + blob.size > MAX_CACHE_SIZE) {
      await this.evictOldEntries(blob.size);
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      
      store.put({
        url,
        blob,
        type,
        size: blob.size,
        timestamp: Date.now()
      });

      transaction.oncomplete = () => {
        this.cacheSize += blob.size;
        resolve();
      };

      transaction.onerror = () => resolve();
    });
  }

  private async updateMediaTimestamp(url: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(MEDIA_STORE, 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.get(url);

    request.onsuccess = () => {
      if (request.result) {
        request.result.timestamp = Date.now();
        store.put(request.result);
      }
    };
  }

  private async evictOldEntries(neededSpace: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor();

      let freedSpace = 0;
      const targetFree = neededSpace + (MAX_CACHE_SIZE * 0.2); // Free 20% extra

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && freedSpace < targetFree) {
          freedSpace += cursor.value.size || 0;
          cursor.delete();
          cursor.continue();
        } else {
          this.cacheSize -= freedSpace;
          resolve();
        }
      };

      request.onerror = () => resolve();
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MEDIA_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      store.clear();
      
      transaction.oncomplete = () => {
        this.cacheSize = 0;
        resolve();
      };

      transaction.onerror = () => resolve();
    });
  }

  getCacheSize(): number {
    return this.cacheSize;
  }

  // ============= OPTIMIZED MEDIA LOADING =============

  /**
   * Load media with caching - checks cache first, then fetches if needed
   */
  async loadMedia(url: string, type: 'video' | 'image' | 'audio'): Promise<string> {
    // Check cache first
    const cached = await this.getCachedMedia(url);
    if (cached) {
      console.log(`[MediaOptimization] Cache hit: ${url.substring(0, 50)}...`);
      return URL.createObjectURL(cached);
    }

    // Fetch and cache
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Cache in background
      this.cacheMedia(url, blob, type).catch(console.warn);
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('[MediaOptimization] Failed to load media:', error);
      return url; // Fallback to original URL
    }
  }

  /**
   * Get thumbnail URL for video (low-res preview)
   */
  getVideoThumbnailUrl(videoUrl: string): string {
    // If the video URL is from Supabase, try to get thumbnail
    if (videoUrl.includes('supabase')) {
      // Replace /videos/ with /thumbnails/ and .mp4 with .jpg
      return videoUrl
        .replace('/videos/', '/thumbnails/')
        .replace(/\.(mp4|webm|mov)$/, '.jpg');
    }
    return videoUrl;
  }

  /**
   * Get optimized image URL based on quality settings
   */
  getOptimizedImageUrl(url: string, quality?: 'low' | 'medium' | 'high'): string {
    const targetQuality = quality || (this.isDataSaverEnabled() ? 'low' : 'medium');
    
    const params = new URLSearchParams();
    switch (targetQuality) {
      case 'low':
        params.set('width', '150');
        params.set('quality', '40');
        break;
      case 'medium':
        params.set('width', '400');
        params.set('quality', '70');
        break;
      case 'high':
        params.set('width', '800');
        params.set('quality', '85');
        break;
    }

    // Only add params if URL doesn't already have them
    if (url.includes('?')) {
      return url;
    }
    return `${url}?${params.toString()}`;
  }

  // ============= VOICE NOTE OPTIMIZATION =============

  /**
   * Compress audio for voice notes (target: 32-64kbps AAC)
   */
  async compressAudioBlob(blob: Blob): Promise<Blob> {
    // For now, return the original blob
    // Full audio compression would require Web Audio API or WASM codec
    // The MediaRecorder in VoiceRecorder should be configured for low bitrate
    return blob;
  }

  getRecommendedAudioConfig(): MediaRecorderOptions {
    return {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm',
      audioBitsPerSecond: this.isDataSaverEnabled() ? 32000 : 64000
    };
  }
}

// Singleton instance
export const mediaOptimizationService = new MediaOptimizationService();
export type { NetworkInfo, DataSaverSettings, ConnectionType, ConnectionSpeed };
