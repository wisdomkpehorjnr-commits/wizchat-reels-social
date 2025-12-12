import { Reel } from '../types';
import { networkStatusManager } from '@/services/networkStatusManager';

interface PlayerInstance {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  element?: HTMLVideoElement;
  loadedPercentage: number;
}

interface CachedReel {
  reel: Reel;
  player?: PlayerInstance;
  thumbnail?: string;
  loadedAt: number;
}

export class VideoPlayerController {
  private players: Map<string, CachedReel> = new Map();
  private currentReelId: string | null = null;
  private maxCachedPlayers = 3; // Keep ±1 videos loaded
  private preloadBuffer = 1; // Preload next/previous
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private videoCache: Map<string, Blob> = new Map();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private currentCacheSize = 0;

  /**
   * Initialize or get player for a reel
   */
  async initializePlayer(reel: Reel, videoElement?: HTMLVideoElement): Promise<void> {
    if (this.players.has(reel.id)) {
      const cached = this.players.get(reel.id)!;
      if (videoElement) {
        cached.player = this.createPlayerInstance(reel.videoUrl, videoElement);
      }
      return;
    }

    const player = videoElement ? this.createPlayerInstance(reel.videoUrl, videoElement) : undefined;
    this.players.set(reel.id, {
      reel,
      player,
      loadedAt: Date.now(),
    });

    // Preload adjacent videos
    await this.preloadAdjacentVideos(reel.id);
  }

  /**
   * Create a player instance for a video element
   */
  private createPlayerInstance(videoUrl: string, element: HTMLVideoElement): PlayerInstance {
    return {
      videoUrl,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      element,
      loadedPercentage: 0,
    };
  }

  /**
   * Play a reel video
   */
  async playReel(reelId: string): Promise<void> {
    if (this.currentReelId === reelId) return;

    // Pause previous video
    if (this.currentReelId) {
      await this.pauseReel(this.currentReelId);
    }

    const cached = this.players.get(reelId);
    if (cached?.player?.element) {
      try {
        const playPromise = cached.player.element.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        cached.player.isPlaying = true;
        this.currentReelId = reelId;
      } catch (error) {
        console.error(`Failed to play video ${reelId}:`, error);
      }
    }
  }

  /**
   * Pause a reel video
   */
  async pauseReel(reelId: string): Promise<void> {
    const cached = this.players.get(reelId);
    if (cached?.player?.element) {
      cached.player.element.pause();
      cached.player.isPlaying = false;
    }
  }

  /**
   * Toggle play/pause for a reel
   */
  async togglePlayPause(reelId: string): Promise<boolean> {
    const cached = this.players.get(reelId);
    if (!cached?.player?.element) return false;

    if (cached.player.isPlaying) {
      await this.pauseReel(reelId);
      return false;
    } else {
      await this.playReel(reelId);
      return true;
    }
  }

  /**
   * Seek to a specific time
   */
  seekTo(reelId: string, time: number): void {
    const cached = this.players.get(reelId);
    if (cached?.player?.element) {
      cached.player.element.currentTime = Math.max(0, Math.min(time, cached.player.duration));
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(reelId: string) {
    const cached = this.players.get(reelId);
    return cached?.player
      ? {
          isPlaying: cached.player.isPlaying,
          currentTime: cached.player.currentTime,
          duration: cached.player.duration,
          loadedPercentage: cached.player.loadedPercentage,
        }
      : null;
  }

  /**
   * Update playback state from video element
   */
  updatePlaybackState(reelId: string): void {
    const cached = this.players.get(reelId);
    if (cached?.player?.element) {
      cached.player.currentTime = cached.player.element.currentTime;
      cached.player.duration = cached.player.element.duration || 0;

      // Calculate loaded percentage
      const buffered = cached.player.element.buffered;
      if (buffered.length > 0) {
        cached.player.loadedPercentage = (buffered.end(buffered.length - 1) / cached.player.duration) * 100;
      }
    }
  }

  /**
   * Preload adjacent videos for smooth transitions
   */
  private async preloadAdjacentVideos(reelId: string): Promise<void> {
    // Implementation will be called when reels list is available
    // This is a placeholder for the controller
  }

  /**
   * Preload video from URL for faster playback
   */
  async preloadVideo(videoUrl: string): Promise<void> {
    // Avoid preloading on slow networks to save user data
    try {
      if (networkStatusManager.isSlow()) {
        // Skip heavy preloads on slow connections
        return;
      }

      if (this.videoCache.has(videoUrl)) return;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(videoUrl, { signal: controller.signal });
      clearTimeout(timeout);
      const blob = await response.blob();

      // Check cache size
      if (this.currentCacheSize + blob.size > this.maxCacheSize) {
        // Clear oldest cached videos
        this.clearOldestCache();
      }

      this.videoCache.set(videoUrl, blob);
      this.currentCacheSize += blob.size;
    } catch (error) {
      // Network errors or aborts are expected on constrained networks
      console.debug(`Preload skipped/failed for ${videoUrl}:`, error?.message || error);
    }
  }

  /**
   * Get cached video blob
   */
  getCachedVideo(videoUrl: string): Blob | undefined {
    return this.videoCache.get(videoUrl);
  }

  /**
   * Clear cache by removing oldest entries
   */
  private clearOldestCache(): void {
    if (this.players.size === 0) return;

    // Remove oldest player that's not currently playing
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cached] of this.players) {
      if (key !== this.currentReelId && cached.loadedAt < oldestTime) {
        oldestTime = cached.loadedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.disposePlayer(oldestKey);
    }
  }

  /**
   * Dispose a player instance and free resources
   */
  disposePlayer(reelId: string): void {
    const cached = this.players.get(reelId);
    if (cached?.player?.element) {
      cached.player.element.pause();
      cached.player.element.src = '';
      cached.player.element.load();
    }
    this.players.delete(reelId);
  }

  /**
   * Cleanup when moving away from a reel
   */
  async cleanupAfterReel(reelId: string, nextReelId?: string): Promise<void> {
    // Keep current and adjacent reels loaded
    const keysToKeep = new Set([reelId, nextReelId]);

    for (const key of this.players.keys()) {
      if (!keysToKeep.has(key)) {
        // Check if it's old enough to dispose
        const cached = this.players.get(key);
        if (cached && Date.now() - cached.loadedAt > 10000) {
          // 10 seconds
          this.disposePlayer(key);
        }
      }
    }
  }

  /**
   * Enforce memory limits
   */
  private enforceMemoryLimits(): void {
    while (this.players.size > this.maxCachedPlayers) {
      this.clearOldestCache();
    }
  }

  /**
   * Dispose all players
   */
  disposeAll(): void {
    for (const key of this.players.keys()) {
      this.disposePlayer(key);
    }
    this.players.clear();
    this.videoCache.clear();
    this.currentCacheSize = 0;
    this.currentReelId = null;
  }

  /**
   * Get controller statistics for debugging
   */
  getStats() {
    return {
      activePlayersCount: this.players.size,
      cachedVideosCount: this.videoCache.size,
      cacheSize: `${(this.currentCacheSize / 1024 / 1024).toFixed(2)}MB`,
      currentReelId: this.currentReelId,
    };
  }
}

export const videoPlayerController = new VideoPlayerController();
