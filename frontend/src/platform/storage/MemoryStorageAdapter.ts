/**
 * FitNova AI — Memory Storage Adapter
 * In-memory fallback adapter for SSR, unit tests, and restricted environments.
 */

import type { IStorageAdapter } from '../types/index.ts';

export class MemoryStorageAdapter implements IStorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  hasItem(key: string): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  isAvailable(): boolean {
    return true;
  }
}
