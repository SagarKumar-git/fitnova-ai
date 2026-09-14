/**
 * FitNova AI — Platform Foundation Layer Public API
 * Unified export point for all platform services, adapters, types, and hooks.
 * Strictly feature-agnostic with zero business logic.
 */

// 1. Platform Types
export * from './types/index.ts';

// 2. Configuration
export * from './config/index.ts';

// 3. Structured Logging & Sanitization
export * from './logging/index.ts';

// 4. Error Architecture
export * from './errors/index.ts';

// 5. Storage Foundation
export * from './storage/index.ts';

// 6. Strongly Typed Event Bus
export * from './events/index.ts';

// 7. Notification Service
export * from './notifications/index.ts';

// 8. Product Analytics
export * from './analytics/index.ts';

// 9. System Telemetry
export * from './telemetry/index.ts';

// 10. Feature Flags
export * from './feature-flags/index.ts';

// 11. Network Service
export * from './network/index.ts';

// 12. Offline Queue & Manager
export * from './offline/index.ts';

// 13. Sync Engine
export * from './sync/index.ts';

// 14. Application Lifecycle
export * from './lifecycle/index.ts';

// 15. Dependency Injection Container & React Integration
export * from './container/index.ts';
