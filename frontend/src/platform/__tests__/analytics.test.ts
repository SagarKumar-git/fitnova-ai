/**
 * FitNova AI — AnalyticsService Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from '../analytics/AnalyticsService.ts';
import type { IAnalyticsAdapter, AnalyticsEvent } from '../types/index.ts';

describe('AnalyticsService', () => {
  it('generates consistent session IDs and tags events', () => {
    const mockAdapter: IAnalyticsAdapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };

    const service = new AnalyticsService({
      adapters: [mockAdapter],
    });

    const sessId = service.getSessionId();
    expect(sessId).toBeDefined();
    expect(sessId.startsWith('sess_')).toBe(true);

    service.track('WORKOUT_STARTED', { workoutType: 'strength' });

    expect(mockAdapter.track).toHaveBeenCalledWith(
      expect.objectContaining<Partial<AnalyticsEvent>>({
        name: 'WORKOUT_STARTED',
        sessionId: sessId,
        metadata: { workoutType: 'strength' },
      })
    );
  });

  it('handles user identification and attribution', () => {
    const mockAdapter: IAnalyticsAdapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };

    const service = new AnalyticsService({
      adapters: [mockAdapter],
    });

    service.identify('usr_999', { tier: 'pro' });
    expect(service.getUserId()).toBe('usr_999');
    expect(mockAdapter.identify).toHaveBeenCalledWith('usr_999', { tier: 'pro' });

    service.track('MEAL_LOGGED', { calories: 500 });
    expect(mockAdapter.track).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_999',
      })
    );

    service.reset();
    expect(service.getUserId()).toBeUndefined();
  });

  it('suppresses events when disabled', () => {
    const mockAdapter: IAnalyticsAdapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };

    const service = new AnalyticsService({
      enabled: false,
      adapters: [mockAdapter],
    });

    service.track('PAGE_VIEWED', { page: '/dashboard' });
    expect(mockAdapter.track).not.toHaveBeenCalled();
  });

  it('redacts sensitive fields in analytics metadata', () => {
    const mockAdapter: IAnalyticsAdapter = {
      track: vi.fn(),
    };

    const service = new AnalyticsService({
      adapters: [mockAdapter],
    });

    service.track('FEATURE_USED', {
      feature: 'ai_coach',
      apiKey: 'secret-12345',
      userToken: 'ey12345.token',
    });

    expect(mockAdapter.track).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          apiKey: '[REDACTED]',
          userToken: '[REDACTED]',
        }),
      })
    );
  });
});
