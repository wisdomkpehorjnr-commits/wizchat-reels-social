/**
 * Enhanced Network Status Manager
 * Real-time connection detection with speed monitoring
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
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private speedCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeListeners();
      this.checkInitialStatus();
      this.startSpeedDetection();
    }
  }

  private initializeListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private checkInitialStatus() {
    this.status = navigator.onLine ? 'online' : 'offline';
    this.notifyListeners();
  }

  private async detectSpeed(): Promise<ConnectionSpeed> {
    try {
      const startTime = performance.now();
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      if (!response.ok) throw new Error('Speed check failed');

      const duration = performance.now() - startTime;
      return duration < 500 ? 'fast' : 'slow';
    } catch (error) {
      return 'unknown';
    }
  }

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
      this.speedCheckTimeout = setTimeout(runCheck, 30 * 1000);
    };

    runCheck();
  }

  private handleOnline = () => {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.lastOnlineTime = Date.now();
    this.status = 'reconnecting';
    this.notifyListeners();

    this.reconnectTimeout = setTimeout(() => {
      this.status = 'online';
      this.notifyListeners();
      this.startSpeedDetection();
    }, 2000);
  };

  private handleOffline = () => {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.status = 'offline';
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.status, this.speed);
      } catch (error) {
        console.error('[Network] Error in listener:', error);
      }
    });
  }

  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSpeed(): ConnectionSpeed {
    return this.speed;
  }

  isOnline(): boolean {
    return this.status === 'online' || this.status === 'reconnecting';
  }

  isOffline(): boolean {
    return this.status === 'offline';
  }

  isSlow(): boolean {
    return this.speed === 'slow';
  }

  destroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.speedCheckTimeout) clearTimeout(this.speedCheckTimeout);
    this.listeners.clear();
  }
}

export const networkStatusManager = new NetworkStatusManager();
