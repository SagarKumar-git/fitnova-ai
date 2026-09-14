/**
 * FitNova AI — Storage Service
 * Namespaced, versioned, error-resilient storage abstraction.
 */

import type {
  IStorageAdapter,
  StorageEnvelope,
  StorageOptions,
  StorageResult,
} from '../types/index.ts';
import { LocalStorageAdapter } from './LocalStorageAdapter.ts';

export interface StorageServiceConfig {
  adapter?: IStorageAdapter;
  namespace?: string;
  defaultVersion?: number;
}

export class StorageService {
  private readonly adapter: IStorageAdapter;
  private readonly namespace: string;
  private readonly defaultVersion: number;

  constructor(config: StorageServiceConfig = {}) {
    this.adapter = config.adapter ?? new LocalStorageAdapter();
    this.namespace = config.namespace ?? 'fitnova:';
    this.defaultVersion = config.defaultVersion ?? 1;
  }

  private resolveKey(key: string): string {
    if (key.startsWith(this.namespace)) {
      return key;
    }
    return `${this.namespace}${key}`;
  }

  private stripNamespace(fullKey: string): string {
    if (fullKey.startsWith(this.namespace)) {
      return fullKey.slice(this.namespace.length);
    }
    return fullKey;
  }

  get(key: string): string | null {
    try {
      const fullKey = this.resolveKey(key);
      return this.adapter.getItem(fullKey);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): boolean {
    try {
      const fullKey = this.resolveKey(key);
      this.adapter.setItem(fullKey, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      const fullKey = this.resolveKey(key);
      this.adapter.removeItem(fullKey);
      return true;
    } catch {
      return false;
    }
  }

  has(key: string): boolean {
    try {
      const fullKey = this.resolveKey(key);
      return this.adapter.hasItem(fullKey);
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      // Only clear keys belonging to this namespace to avoid wiping other local data
      const allKeys = this.adapter.keys();
      for (const k of allKeys) {
        if (k.startsWith(this.namespace)) {
          this.adapter.removeItem(k);
        }
      }
    } catch {
      // Safe swallow
    }
  }

  keys(): string[] {
    try {
      const allKeys = this.adapter.keys();
      return allKeys
        .filter((k) => k.startsWith(this.namespace))
        .map((k) => this.stripNamespace(k));
    } catch {
      return [];
    }
  }

  getJSON<T>(key: string, defaultValue: T | null = null): T | null {
    const raw = this.get(key);
    if (raw === null) {
      return defaultValue;
    }

    try {
      const parsed = JSON.parse(raw);

      // Check if it's an envelope
      if (
        parsed &&
        typeof parsed === 'object' &&
        'version' in parsed &&
        'timestamp' in parsed &&
        'value' in parsed
      ) {
        const envelope = parsed as StorageEnvelope<T>;

        // Check TTL expiration
        if (envelope.ttlMs && envelope.ttlMs > 0) {
          const age = Date.now() - envelope.timestamp;
          if (age > envelope.ttlMs) {
            this.remove(key);
            return defaultValue;
          }
        }

        return envelope.value;
      }

      // Plain JSON format (backward compatibility with non-enveloped values)
      return parsed as T;
    } catch {
      // Malformed JSON fallback
      return defaultValue;
    }
  }

  setJSON<T>(key: string, value: T, options?: StorageOptions): boolean {
    try {
      const envelope: StorageEnvelope<T> = {
        version: options?.version ?? this.defaultVersion,
        timestamp: Date.now(),
        ttlMs: options?.ttlMs,
        value,
      };

      const serialized = JSON.stringify(envelope);
      return this.set(key, serialized);
    } catch {
      return false;
    }
  }

  safeGet<T>(key: string, defaultValue: T | null = null): StorageResult<T> {
    try {
      const data = this.getJSON<T>(key, defaultValue);
      return { success: true, data };
    } catch (e) {
      return {
        success: false,
        data: defaultValue,
        error: e instanceof Error ? e.message : 'Storage read error',
      };
    }
  }

  safeSet<T>(key: string, value: T, options?: StorageOptions): StorageResult<T> {
    try {
      const ok = this.setJSON<T>(key, value, options);
      return { success: ok, data: ok ? value : null, error: ok ? undefined : 'Storage write failed' };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : 'Storage write exception',
      };
    }
  }
}
