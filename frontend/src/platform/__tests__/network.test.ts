/**
 * FitNova AI — NetworkService Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { NetworkService } from '../network/NetworkService.ts';
import { EventBus } from '../events/EventBus.ts';

describe('NetworkService', () => {
  it('initializes with online status in SSR/browser safe manner', () => {
    const service = new NetworkService({ initialOnline: true });
    expect(service.isOnline()).toBe(true);

    const status = service.getStatus();
    expect(status.isOnline).toBe(true);
    expect(status.lastChangedAt).toBeGreaterThan(0);
    service.destroy();
  });

  it('notifies subscribers upon initialization and status changes', () => {
    const service = new NetworkService({ initialOnline: true });
    const listener = vi.fn();

    const unsubscribe = service.subscribe(listener);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isOnline: true }));

    unsubscribe();
    service.destroy();
  });

  it('integrates with EventBus emitting NETWORK_ONLINE and NETWORK_OFFLINE', () => {
    const eventBus = new EventBus();
    const onlineSpy = vi.fn();
    const offlineSpy = vi.fn();

    eventBus.subscribe('NETWORK_ONLINE', onlineSpy);
    eventBus.subscribe('NETWORK_OFFLINE', offlineSpy);

    const service = new NetworkService({ eventBus, initialOnline: true });

    // Simulate offline transition
    (service as unknown as { updateStatus: (s: boolean) => void }).updateStatus(false);
    expect(offlineSpy).toHaveBeenCalledTimes(1);
    expect(service.isOnline()).toBe(false);

    // Simulate online transition
    (service as unknown as { updateStatus: (s: boolean) => void }).updateStatus(true);
    expect(onlineSpy).toHaveBeenCalledTimes(1);
    expect(service.isOnline()).toBe(true);

    service.destroy();
  });
});
