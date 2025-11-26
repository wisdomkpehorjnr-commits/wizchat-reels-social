/**
 * Enhanced Network Status Service
 * Provides real-time connection detection with speed detection and smart fallback
 */

export type ConnectionStatus = 'online' | 'offline' | 'slow' | 'reconnecting';
export type ConnectionSpeed = 'fast' | 'slow' | 'unknown';

interface NetworkStatusListener {
  (status: ConnectionStatus, speed: ConnectionSpeed): void;
}

class NetworkStatusManager {
  private status: ConnectionStatus = 'online';
  private speed: ConnectionSpeed = 'unknown';
  private listeners: Set<NetworkStatusListener> = new Set();
  private lastOnlineTime: number = Date.now();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private speedCheckTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeListeners();
      this.checkInitialStatus();
      this.startSpeedDetection();
    }
  }

  /**
   * Initialize network event listeners
   */
  private initializeListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    window.addEventListener('load', () => this.startSpeedDetection());
  }

  /**
   * Check initial connection status
   */
  private checkInitialStatus() {
    this.status = navigator.onLine ? 'online' : 'offline';
    this.notifyListeners();
  }

  /**
   * Detect connection speed using a test request
   */
  private async detectSpeed(): Promise<ConnectionSpeed> {
    try {
      const startTime = performance.now();
      // Make a very small request to check speed
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      if (!response.ok) throw new Error('Speed check failed');

      const duration = performance.now() - startTime;
      // If response is faster than 500ms, consider it fast
      return duration < 500 ? 'fast' : 'slow';
    } catch (error) {
      // If check fails, assume slow or unknown
      return 'unknown';
    }
  }

  /**
   * Start periodic speed detection
   */
  private startSpeedDetection() {
    if (this.speedCheckTimeout) clearTimeout(this.speedCheckTimeout);

    const runCheck = async () => {
      if (this.status === 'online') {
        const newSpeed = await this.detectSpeed();
        if (newSpeed !== this.speed) {
          this.speed = newSpeed;
          this.notifyListeners();
        }
      }
      // Re-check every 30 seconds
      this.speedCheckTimeout = setTimeout(runCheck, 30 * 1000);
    };

    runCheck();
  }

  /**
   * Handle online event
   */
  private handleOnline = () => {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.lastOnlineTime = Date.now();
    const previousStatus = this.status;

    // Set to reconnecting for 2 seconds to show reconnection state
    this.status = 'reconnecting';
    this.notifyListeners();

    this.reconnectTimeout = setTimeout(() => {
      this.status = 'online';
      this.notifyListeners();
      this.startSpeedDetection();
    }, 2000);
  };

  /**
   * Handle offline event
   */
  private handleOffline = () => {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.status = 'offline';
    this.notifyListeners();
  };

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.status, this.speed);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get current speed
   */
  getSpeed(): ConnectionSpeed {
    return this.speed;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.status === 'online' || this.status === 'reconnecting';
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return this.status === 'offline';
  }

  /**
   * Check if connection is slow
   */
  isSlow(): boolean {
    return this.speed === 'slow';
  }

  /**
   * Get time since last online
   */
  getTimeSinceLastOnline(): number {
    return Date.now() - this.lastOnlineTime;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.speedCheckTimeout) clearTimeout(this.speedCheckTimeout);
    this.listeners.clear();
  }
}

// Singleton instance
export const networkStatusManager = new NetworkStatusManager();
