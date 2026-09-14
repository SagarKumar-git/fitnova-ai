/**
 * FitNova AI — TelemetryService Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { TelemetryService } from '../telemetry/TelemetryService.ts';
import type { ITelemetryAdapter, TelemetryEvent } from '../types/index.ts';

describe('TelemetryService', () => {
  it('records system latency metrics cleanly', () => {
    const mockAdapter: ITelemetryAdapter = {
      record: vi.fn(),
    };

    const service = new TelemetryService({ adapters: [mockAdapter] });

    service.recordLatency('API_LATENCY', 'Workouts', 120, { endpoint: '/api/workouts' });

    expect(mockAdapter.record).toHaveBeenCalledWith(
      expect.objectContaining<Partial<TelemetryEvent>>({
        type: 'API_LATENCY',
        sourceModule: 'Workouts',
        durationMs: 120,
        metadata: { endpoint: '/api/workouts' },
      })
    );
  });

  it('measures async operations with time() helper', async () => {
    const mockAdapter: ITelemetryAdapter = {
      record: vi.fn(),
    };

    const service = new TelemetryService({ adapters: [mockAdapter] });

    const result = await service.time(
      'AI_LATENCY',
      'MealPlannerAI',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return { plan: 'Keto Day 1' };
      }
    );

    expect(result).toEqual({ plan: 'Keto Day 1' });
    expect(mockAdapter.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'AI_LATENCY',
        sourceModule: 'MealPlannerAI',
        metadata: expect.objectContaining({ success: true }),
      })
    );
  });

  it('sanitizes authorization headers and tokens from telemetry metadata', () => {
    const mockAdapter: ITelemetryAdapter = {
      record: vi.fn(),
    };

    const service = new TelemetryService({ adapters: [mockAdapter] });

    service.record({
      type: 'REQUEST_FAILED',
      sourceModule: 'APIClient',
      metadata: {
        authorization: 'Bearer eyJhbGciOi...',
        password: 'my-secret-password',
      },
    });

    expect(mockAdapter.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          authorization: '[REDACTED]',
          password: '[REDACTED]',
        },
      })
    );
  });
});
