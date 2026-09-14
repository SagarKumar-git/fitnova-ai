/**
 * FitNova AI — Notification Service
 * UI-framework independent notification manager with TTL expiration and subscriptions.
 */

import type {
  NotificationItem,
  NotificationOptions,
  NotificationListener,
  UnsubscribeFn,
} from '../types/index.ts';

export interface NotificationServiceConfig {
  defaultDurationMs?: number;
  maxNotifications?: number;
}

export class NotificationService {
  private notifications: NotificationItem[] = [];
  private readonly listeners = new Set<NotificationListener>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly defaultDurationMs: number;
  private readonly maxNotifications: number;
  private counter = 0;

  constructor(config: NotificationServiceConfig = {}) {
    this.defaultDurationMs = config.defaultDurationMs ?? 5000;
    this.maxNotifications = config.maxNotifications ?? 20;
  }

  notify(options: NotificationOptions): string {
    const id = `notif_${Date.now()}_${++this.counter}`;
    const duration = options.durationMs !== undefined ? options.durationMs : this.defaultDurationMs;

    const item: NotificationItem = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      timestamp: Date.now(),
      durationMs: duration,
      metadata: options.metadata,
      dismissed: false,
    };

    // Prepend new notification
    this.notifications = [item, ...this.notifications];

    // Enforce max notifications limit
    if (this.notifications.length > this.maxNotifications) {
      const removed = this.notifications.slice(this.maxNotifications);
      for (const rem of removed) {
        this.clearTimer(rem.id);
      }
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Set auto-dismiss timer if duration > 0
    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    this.notifyListeners();
    return id;
  }

  dismiss(id: string): void {
    this.clearTimer(id);

    const prevLength = this.notifications.length;
    this.notifications = this.notifications.filter((n) => n.id !== id);

    if (this.notifications.length !== prevLength) {
      this.notifyListeners();
    }
  }

  dismissAll(): void {
    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }
    this.notifications = [];
    this.notifyListeners();
  }

  list(): NotificationItem[] {
    return [...this.notifications];
  }

  subscribe(listener: NotificationListener): UnsubscribeFn {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.list());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private notifyListeners(): void {
    const currentList = this.list();
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(currentList);
      } catch {
        // Subscriber isolation
      }
    }
  }
}
