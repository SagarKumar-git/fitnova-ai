/**
 * FitNova AI — Network Service
 * SSR-safe network status detection, connection monitoring, and event broadcasting.
 */

import type {
  NetworkStatus,
  NetworkChangeListener,
  UnsubscribeFn,
} from '../types/index.ts';
import type { EventBus } from '../events/EventBus.ts';

export interface NetworkServiceConfig {
  eventBus?: EventBus;
  initialOnline?: boolean;
}

export class NetworkService {
  private readonly eventBus?: EventBus;
  private readonly listeners = new Set<NetworkChangeListener>();
  private status: NetworkStatus;
  private cleanupFns: Array<() => void> = [];

  constructor(config: NetworkServiceConfig = {}) {
    this.eventBus = config.eventBus;
    this.status = this.determineInitialStatus(config.initialOnline);
    this.setupListeners();
  }

  private determineInitialStatus(initialOnline?: boolean): NetworkStatus {
    const isOnline =
      initialOnline !== undefined
        ? initialOnline
        : typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? navigator.onLine
        : true; // SSR safe default

    let effectiveType: string | undefined;
    let downlink: number | undefined;
    let rtt: number | undefined;
    let saveData: boolean | undefined;

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection;
      if (conn) {
        effectiveType = conn.effectiveType;
        downlink = conn.downlink;
        rtt = conn.rtt;
        saveData = conn.saveData;
      }
    }

    return {
      isOnline,
      effectiveType,
      downlink,
      rtt,
      saveData,
      lastChangedAt: Date.now(),
    };
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      this.updateStatus(true);
    };

    const handleOffline = () => {
      this.updateStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.cleanupFns.push(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    // Network Information API change listener if available
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as unknown as { connection?: EventTarget }).connection;
      if (conn && typeof conn.addEventListener === 'function') {
        const handleConnChange = () => {
          this.updateStatus(this.status.isOnline);
        };
        conn.addEventListener('change', handleConnChange);
        this.cleanupFns.push(() => {
          conn.removeEventListener('change', handleConnChange);
        });
      }
    }
  }

  private updateStatus(isOnline: boolean): void {
    const previous = this.status.isOnline;
    this.status = this.determineInitialStatus(isOnline);

    // Notify internal subscribers
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(this.status);
      } catch {
        // Isolation
      }
    }

    // Emit on EventBus if state actually changed
    if (this.eventBus && previous !== isOnline) {
      if (isOnline) {
        this.eventBus.emit('NETWORK_ONLINE', {
          timestamp: this.status.lastChangedAt,
          effectiveType: this.status.effectiveType,
        });
      } else {
        this.eventBus.emit('NETWORK_OFFLINE', {
          timestamp: this.status.lastChangedAt,
        });
      }
    }
  }

  isOnline(): boolean {
    return this.status.isOnline;
  }

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  subscribe(listener: NetworkChangeListener): UnsubscribeFn {
    this.listeners.add(listener);
    // Immediately provide current state
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    for (const fn of this.cleanupFns) {
      try {
        fn();
      } catch {
        // Safe swallow
      }
    }
    this.cleanupFns = [];
    this.listeners.clear();
  }
}
