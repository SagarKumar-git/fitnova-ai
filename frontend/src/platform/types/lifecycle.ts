/**
 * FitNova AI — Platform Lifecycle Types
 * Application lifecycle states and transition listener contracts.
 */

export type AppLifecycleState =
  | 'initialization'
  | 'ready'
  | 'foreground'
  | 'background'
  | 'shutdown';

export type LifecycleListener = (
  newState: AppLifecycleState,
  previousState: AppLifecycleState
) => void | Promise<void>;
