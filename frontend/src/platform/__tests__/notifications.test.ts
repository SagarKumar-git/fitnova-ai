/**
 * FitNova AI — NotificationService Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../notifications/NotificationService.ts';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates and lists notifications with types', () => {
    const service = new NotificationService();

    const id = service.notify({
      type: 'achievement',
      title: 'Goal Achieved!',
      message: 'You logged 5 workouts this week.',
    });

    expect(id).toBeDefined();
    const list = service.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(id);
    expect(list[0].type).toBe('achievement');
    expect(list[0].title).toBe('Goal Achieved!');
  });

  it('notifies subscribers upon creation and dismissal', () => {
    const service = new NotificationService();
    const subscriber = vi.fn();

    const unsubscribe = service.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledWith([]);

    const id = service.notify({
      type: 'workout',
      title: 'Workout Saved',
      message: 'Push day completed.',
    });

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ id })])
    );

    service.dismiss(id);
    expect(subscriber).toHaveBeenCalledTimes(3);
    expect(subscriber).toHaveBeenLastCalledWith([]);

    unsubscribe();
  });

  it('automatically dismisses notifications after duration expires', () => {
    const service = new NotificationService({ defaultDurationMs: 2000 });

    service.notify({
      type: 'info',
      title: 'Hydration Reminder',
      message: 'Drink a glass of water.',
      durationMs: 1500,
    });

    expect(service.list().length).toBe(1);

    vi.advanceTimersByTime(1400);
    expect(service.list().length).toBe(1);

    vi.advanceTimersByTime(200);
    expect(service.list().length).toBe(0);
  });

  it('enforces maximum notification queue size', () => {
    const service = new NotificationService({ maxNotifications: 3 });

    service.notify({ type: 'info', title: '1', message: 'one' });
    service.notify({ type: 'info', title: '2', message: 'two' });
    service.notify({ type: 'info', title: '3', message: 'three' });
    service.notify({ type: 'info', title: '4', message: 'four' });

    expect(service.list().length).toBe(3);
    expect(service.list()[0].title).toBe('4'); // newest first
  });

  it('dismisses all notifications cleanly', () => {
    const service = new NotificationService();
    service.notify({ type: 'info', title: 'A', message: 'msg' });
    service.notify({ type: 'warning', title: 'B', message: 'msg' });

    expect(service.list().length).toBe(2);
    service.dismissAll();
    expect(service.list().length).toBe(0);
  });
});
