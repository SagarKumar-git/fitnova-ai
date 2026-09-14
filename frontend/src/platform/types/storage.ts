/**
 * FitNova AI — Platform Storage Types
 * Strongly typed contracts for storage adapters and storage services.
 */

export interface IStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  hasItem(key: string): boolean;
  clear(): void;
  keys(): string[];
  isAvailable(): boolean;
}

export type StorageKey = string;

export interface StorageEnvelope<T> {
  version: number;
  timestamp: number;
  ttlMs?: number;
  value: T;
}

export interface StorageResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export interface StorageOptions {
  namespace?: string;
  version?: number;
  ttlMs?: number;
}
