/**
 * FitNova AI — Strongly Typed Platform Event Bus
 * Pub/Sub system with isolated subscriber execution and safe cleanup.
 */

import type {
  PlatformEventMap,
  EventHandler,
  UnsubscribeFn,
} from '../types/index.ts';

export interface EventBusOptions {
  onError?: (event: string, error: unknown) => void;
}

export class EventBus<TEventMap = PlatformEventMap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly listeners = new Map<keyof TEventMap, Set<EventHandler<any>>>();
  private readonly onError?: (event: string, error: unknown) => void;

  constructor(options: EventBusOptions = {}) {
    this.onError = options.onError;
  }

  subscribe<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;
    handlers.add(handler);

    return () => {
      this.unsubscribe(event, handler);
    };
  }

  unsubscribe<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  once<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): UnsubscribeFn {
    const onceWrapper: EventHandler<TEventMap[K]> = (payload) => {
      this.unsubscribe(event, onceWrapper);
      return handler(payload);
    };

    return this.subscribe(event, onceWrapper);
  }

  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Clone set into array to prevent modification during iteration
    const handlersCopy = Array.from(handlers);

    for (const handler of handlersCopy) {
      try {
        const result = handler(payload);
        // If the handler is async and returns a promise that rejects, handle it
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch((err) => {
            this.handleSubscriberError(String(event), err);
          });
        }
      } catch (err) {
        // Critical isolation: one failing subscriber MUST NEVER crash other subscribers or the emitter
        this.handleSubscriberError(String(event), err);
      }
    }
  }

  clear(event?: keyof TEventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof TEventMap): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  private handleSubscriberError(event: string, err: unknown): void {
    if (this.onError) {
      try {
        this.onError(event, err);
      } catch {
        // Safe swallow
      }
    } else {
      if (typeof console !== 'undefined' && console.error) {
        console.error(`[EventBus] Subscriber error on event "${event}":`, err);
      }
    }
  }
}
