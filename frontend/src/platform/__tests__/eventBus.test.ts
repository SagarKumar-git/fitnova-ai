/**
 * FitNova AI — EventBus Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../events/EventBus.ts';

describe('EventBus', () => {
  it('subscribes and receives emitted events with strongly typed payloads', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe('WORKOUT_STARTED', handler);

    bus.emit('WORKOUT_STARTED', {
      workoutId: 'w_123',
      templateId: 't_456',
      timestamp: 1000,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      workoutId: 'w_123',
      templateId: 't_456',
      timestamp: 1000,
    });

    unsubscribe();

    bus.emit('WORKOUT_STARTED', {
      workoutId: 'w_123',
      timestamp: 2000,
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handles once() subscriptions firing only once', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('WATER_LOGGED', handler);

    bus.emit('WATER_LOGGED', { amountMl: 250, dailyTotalMl: 1500, timestamp: 1 });
    bus.emit('WATER_LOGGED', { amountMl: 500, dailyTotalMl: 2000, timestamp: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ amountMl: 250, dailyTotalMl: 1500, timestamp: 1 });
  });

  it('isolates subscriber exceptions so one error does not break others', () => {
    const errorListener = vi.fn();
    const bus = new EventBus({ onError: errorListener });

    const brokenHandler = vi.fn().mockImplementation(() => {
      throw new Error('Subscriber exploded!');
    });
    const healthyHandler = vi.fn();

    bus.subscribe('MEAL_LOGGED', brokenHandler);
    bus.subscribe('MEAL_LOGGED', healthyHandler);

    expect(() => {
      bus.emit('MEAL_LOGGED', {
        mealId: 'm_1',
        mealType: 'breakfast',
        calories: 450,
        proteinGrams: 30,
        carbsGrams: 50,
        fatGrams: 15,
        timestamp: Date.now(),
      });
    }).not.toThrow();

    expect(brokenHandler).toHaveBeenCalledTimes(1);
    expect(healthyHandler).toHaveBeenCalledTimes(1);
    expect(errorListener).toHaveBeenCalledTimes(1);
  });

  it('clears specific or all event listeners', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();

    bus.subscribe('ACHIEVEMENT_UNLOCKED', h1);
    bus.subscribe('NETWORK_ONLINE', h2);

    bus.clear('ACHIEVEMENT_UNLOCKED');
    expect(bus.listenerCount('ACHIEVEMENT_UNLOCKED')).toBe(0);
    expect(bus.listenerCount('NETWORK_ONLINE')).toBe(1);

    bus.clear();
    expect(bus.listenerCount('NETWORK_ONLINE')).toBe(0);
  });
});
