/**
 * FitNova AI — IndexedDB Adapter Scaffold
 * Prepared architecture for future high-volume offline storage (workouts, media, offline sync cache).
 */

import type { IStorageAdapter } from '../types/index.ts';
import { MemoryStorageAdapter } from './MemoryStorageAdapter.ts';

export interface IndexedDBConfig {
  dbName: string;
  storeName: string;
  version?: number;
}

export class IndexedDBAdapter implements IStorageAdapter {
  private readonly fallback = new MemoryStorageAdapter();
  private readonly dbName: string;
  private readonly storeName: string;

  constructor(config: IndexedDBConfig = { dbName: 'fitnova_db', storeName: 'kv_store', version: 1 }) {
    this.dbName = config.dbName;
    this.storeName = config.storeName;
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  getItem(key: string): string | null {
    return this.fallback.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.fallback.setItem(key, value);
  }

  removeItem(key: string): void {
    this.fallback.removeItem(key);
  }

  hasItem(key: string): boolean {
    return this.fallback.hasItem(key);
  }

  clear(): void {
    this.fallback.clear();
  }

  keys(): string[] {
    return this.fallback.keys();
  }

  getStoreName(): string {
    return this.storeName;
  }

  getDbName(): string {
    return this.dbName;
  }
}
