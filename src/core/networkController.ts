/**
 * Global Network Controller
 * - Detects connection type and speed
 * - Exposes simple subscribe API and helper hooks
 */
type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

class NetworkControllerClass {
  private listeners = new Set<(s: NetworkState) => void>();
  private state: NetworkState = { isOnline: !!navigator.onLine, type: 'unknown', downlink: 0 };

  constructor() {
    this.updateState();
    window.addEventListener('online', () => this.updateState());
    window.addEventListener('offline', () => this.updateState());
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', () => this.updateState());
    }
  }

  isOnline() { return this.state.isOnline; }

  getState() { return this.state; }

  subscribe(cb: (s: NetworkState) => void) {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  private notify() { for (const l of this.listeners) l(this.state); }

  private updateState() {
    const nav: any = navigator;
    const connection = nav.connection || {};
    const downlink = connection.downlink || 0;
    const typeRaw = connection.type || '';
    const type: ConnectionType = !navigator.onLine ? 'none' : (typeRaw.includes('wifi') ? 'wifi' : (typeRaw.includes('cellular') ? 'cellular' : 'unknown'));
    this.state = { isOnline: !!navigator.onLine, type, downlink };
    this.notify();
  }
}

export interface NetworkState {
  isOnline: boolean;
  type: ConnectionType;
  downlink: number;
}

export const networkController = new NetworkControllerClass();
export default networkController;
