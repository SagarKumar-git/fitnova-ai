/**
 * FitNova AI — Workout OS Public Barrel
 * Clean public contracts and exports for Workout OS.
 */

// Types & Enums
export * from './types/index.ts';

// Domain Models
export * from './models/index.ts';

// Constants
export * from './constants/index.ts';

// Domain Rules & Calculations
export * from './utils/index.ts';

// Repository Layer
export * from './repositories/index.ts';

// Events
export * from './events/index.ts';

// Services
export * from './services/index.ts';

// State & Context
export * from './state/index.ts';

// Hooks
export * from './hooks/index.ts';

// UI Components
export * from './components/index.ts';

// API Layer
export * from './api/index.ts';

// Intelligence Layer
export * from './intelligence/index.ts';

// Analytics Layer
export * from './analytics/index.ts';

// Pages
export {
  WorkoutHome,
  WorkoutDetails,
  ActiveWorkout,
  WorkoutHistory,
  WorkoutStatsPage,
} from './pages/index.ts';
