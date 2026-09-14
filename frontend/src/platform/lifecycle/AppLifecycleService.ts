/**
 * FitNova AI — Application Lifecycle Service
 * Coordinates app lifecycle transitions (initialization, ready, foreground, background, shutdown).
 */

import type {
  AppLifecycleState,
  LifecycleListener,
  UnsubscribeFn,
} from '../types/index.ts';

export class AppLifecycleService {
  private currentState: AppLifecycleState = 'initialization';
  private readonly listeners = new Set<LifecycleListener>();
  private readonly cleanupFns: Array<() => void> = [];

  constructor() {
    this.setupBrowserLifecycleListeners();
  }

  private setupBrowserLifecycleListeners(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.transitionTo('foreground');
      } else if (document.visibilityState === 'hidden') {
        this.transitionTo('background');
      }
    };

    const handleBeforeUnload = () => {
      this.transitionTo('shutdown');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    this.cleanupFns.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });
  }

  getState(): AppLifecycleState {
    return this.currentState;
  }

  transitionTo(newState: AppLifecycleState): void {
    if (this.currentState === newState) return;

    const previousState = this.currentState;
    this.currentState = newState;

    for (const listener of Array.from(this.listeners)) {
      try {
        listener(newState, previousState);
      } catch {
        // Isolation
      }
    }
  }

  subscribe(listener: LifecycleListener): UnsubscribeFn {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    for (const fn of this.cleanupFns) {
      try {
        fn();
      } catch {
        // Safe swallow
      }
    }
    this.cleanupFns.length = 0;
    this.listeners.clear();
  }
}
