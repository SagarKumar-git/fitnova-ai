/**
 * FitNova AI — Storage Service Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../storage/StorageService.ts';
import { MemoryStorageAdapter } from '../storage/MemoryStorageAdapter.ts';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter.ts';

describe('StorageService', () => {
  let memoryAdapter: MemoryStorageAdapter;
  let service: StorageService;

  beforeEach(() => {
    memoryAdapter = new MemoryStorageAdapter();
    service = new StorageService({
      adapter: memoryAdapter,
      namespace: 'test_fitnova:',
      defaultVersion: 1,
    });
  });

  it('sets and gets raw string values with namespacing', () => {
    service.set('theme', 'dark');
    expect(service.get('theme')).toBe('dark');
    // Verify namespacing in underlying adapter
    expect(memoryAdapter.getItem('test_fitnova:theme')).toBe('dark');
  });

  it('removes keys correctly', () => {
    service.set('temp', '123');
    expect(service.has('temp')).toBe(true);
    service.remove('temp');
    expect(service.has('temp')).toBe(false);
    expect(service.get('temp')).toBeNull();
  });

  it('handles JSON serialization and deserialization with envelopes', () => {
    const user = { id: 'u_1', name: 'Alex', targetWeight: 75 };
    service.setJSON('user_profile', user);

    const retrieved = service.getJSON<typeof user>('user_profile');
    expect(retrieved).toEqual(user);
  });

  it('returns default value when JSON is malformed without crashing', () => {
    memoryAdapter.setItem('test_fitnova:bad_json', '{not-valid-json}');
    const result = service.getJSON('bad_json', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('returns default value when key does not exist', () => {
    expect(service.getJSON('non_existent', null)).toBeNull();
    expect(service.getJSON('non_existent', { def: 1 })).toEqual({ def: 1 });
  });

  it('handles TTL expiration properly', async () => {
    service.setJSON('short_lived', { text: 'hello' }, { ttlMs: 20 });
    expect(service.getJSON('short_lived')).toEqual({ text: 'hello' });

    // Wait for TTL to elapse
    await new Promise((resolve) => setTimeout(resolve, 35));
    expect(service.getJSON('short_lived')).toBeNull();
  });

  it('clears only keys belonging to its namespace', () => {
    service.set('key1', 'val1');
    service.set('key2', 'val2');
    memoryAdapter.setItem('other_app:token', 'preserve_me');

    service.clear();

    expect(service.get('key1')).toBeNull();
    expect(service.get('key2')).toBeNull();
    expect(memoryAdapter.getItem('other_app:token')).toBe('preserve_me');
  });

  it('lists only namespace-relative keys', () => {
    service.set('k1', 'v1');
    service.set('k2', 'v2');
    memoryAdapter.setItem('foreign:k', 'v');

    const keys = service.keys();
    expect(keys).toContain('k1');
    expect(keys).toContain('k2');
    expect(keys).not.toContain('foreign:k');
  });

  it('safeGet and safeSet return structured StorageResult', () => {
    const writeRes = service.safeSet('safe_key', { count: 42 });
    expect(writeRes.success).toBe(true);
    expect(writeRes.data).toEqual({ count: 42 });

    const readRes = service.safeGet<{ count: number }>('safe_key');
    expect(readRes.success).toBe(true);
    expect(readRes.data).toEqual({ count: 42 });
  });

  it('LocalStorageAdapter is available or falls back gracefully', () => {
    const localAdapter = new LocalStorageAdapter();
    expect(typeof localAdapter.isAvailable()).toBe('boolean');
    localAdapter.setItem('adapter_test', 'works');
    expect(localAdapter.getItem('adapter_test')).toBe('works');
    localAdapter.removeItem('adapter_test');
  });
});
