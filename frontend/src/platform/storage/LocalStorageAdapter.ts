/**
 * FitNova AI — LocalStorage Adapter
 * Safe LocalStorage adapter with SSR guards and quota exception fallback.
 */

import type { IStorageAdapter } from '../types/index.ts';
import { MemoryStorageAdapter } from './MemoryStorageAdapter.ts';

export class LocalStorageAdapter implements IStorageAdapter {
  private readonly memoryFallback = new MemoryStorageAdapter();
  private available: boolean;

  constructor() {
    this.available = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }

    try {
      const testKey = '__fitnova_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getItem(key: string): string | null {
    if (!this.available) {
      return this.memoryFallback.getItem(key);
    }

    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
      return this.memoryFallback.getItem(key);
    } catch {
      return this.memoryFallback.getItem(key);
    }
  }

  setItem(key: string, value: string): void {
    if (!this.available) {
      this.memoryFallback.setItem(key, value);
      return;
    }

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Handles DOMException QuotaExceededError or SecurityError
      this.memoryFallback.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.available) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Safe swallow
      }
    }
    this.memoryFallback.removeItem(key);
  }

  hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  clear(): void {
    if (this.available) {
      try {
        window.localStorage.clear();
      } catch {
        // Safe swallow
      }
    }
    this.memoryFallback.clear();
  }

  keys(): string[] {
    const keySet = new Set<string>();
    if (this.available) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keySet.add(k);
        }
      } catch {
        // Fallback to memory keys
      }
    }

    for (const k of this.memoryFallback.keys()) {
      keySet.add(k);
    }

    return Array.from(keySet);
  }
}
