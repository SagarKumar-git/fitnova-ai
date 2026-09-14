/**
 * FitNova AI — PlatformContainer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { createPlatformContainer, PlatformContainer } from '../container/PlatformContainer.ts';
import { MemoryStorageAdapter } from '../storage/MemoryStorageAdapter.ts';
import { StorageService } from '../storage/StorageService.ts';

describe('PlatformContainer', () => {
  it('wires all foundation services in a single cohesive container', () => {
    const container = createPlatformContainer();

    expect(container).toBeInstanceOf(PlatformContainer);
    expect(container.config).toBeDefined();
    expect(container.logger).toBeDefined();
    expect(container.storage).toBeDefined();
    expect(container.events).toBeDefined();
    expect(container.notifications).toBeDefined();
    expect(container.analytics).toBeDefined();
    expect(container.telemetry).toBeDefined();
    expect(container.featureFlags).toBeDefined();
    expect(container.network).toBeDefined();
    expect(container.offline).toBeDefined();
    expect(container.sync).toBeDefined();
    expect(container.lifecycle).toBeDefined();

    expect(container.lifecycle.getState()).toBe('ready');
    container.destroy();
  });

  it('allows explicit overrides for testing and custom environments', () => {
    const customMemoryStorage = new StorageService({
      adapter: new MemoryStorageAdapter(),
      namespace: 'custom_inject:',
    });

    const container = createPlatformContainer({
      storage: customMemoryStorage,
    });

    container.storage.set('injected', 'true');
    expect(customMemoryStorage.get('injected')).toBe('true');
    container.destroy();
  });
});
