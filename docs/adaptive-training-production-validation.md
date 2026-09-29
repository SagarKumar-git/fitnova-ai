# Sprint 4.0: Adaptive Training Production Validation

## Overview
FitNova AI's Adaptive Training Engine is now fully operationalized for production use. It builds upon the deterministic intelligence of Sprint 3.9 and introduces safety guardrails, a transparent UI, historical outcome learning, and backend persistence.

## Architecture

The system enforces a strict top-down data flow:
1.  **UI (`AdaptiveSummaryCard`, `AdaptiveDecisionHistory`)**
    -   Displays adaptive decisions in a transparent way.
    -   Allows users to accept/reject/modify AI recommendations.
2.  **Hooks / Context (`WorkoutContext`)**
    -   Passes user actions down to the `WorkoutIntelligenceService`.
3.  **WorkoutIntelligenceService & Safety Guards (`AdaptiveSafetyGuard`)**
    -   Intercepts all AI plans.
    -   Clamps maximum physiological increases based on `AdaptivePreferences`.
    -   Halts progression if live `FormSignal` warnings are detected.
4.  **HealthDataService & SyncManager (`HealthSyncManager`)**
    -   Responsible for pulling data via `IHealthProvider`.
    -   Maintains offline-first queuing if the backend is unreachable.

## Adaptive Decision Lifecycle

1.  **Generation**: `ProgressionEngine` suggests a change.
2.  **Safety Validation**: `AdaptiveSafetyGuard` reviews the change against `maxWeightIncreaseKg`, `maxRepIncrease`, and form constraints.
3.  **Calibration**: `ConfidenceCalibrationEngine` assigns a confidence score (LOW, MODERATE, HIGH, VERY_HIGH) based on signal freshness and historical success.
4.  **Presentation**: The user is presented with the adaptation via `NovaWorkoutService`.
5.  **Action**: The user accepts, rejects, or modifies the recommendation.
6.  **Persistence**: `AdaptiveDecisionRepository` saves the action locally and syncs it to the FastAPI backend (`/workouts/adaptive/decisions`).
7.  **Outcome Tracking**: After the workout, `AdaptiveLearningEngine` compares actual performance vs the adaptive plan and labels it `adaptation_successful`, `adaptation_too_aggressive`, or `adaptation_too_conservative`.

## User Controls
Users have granular control over the engine via `AdaptivePreferences`:
-   Enable/disable adaptive training entirely.
-   Opt-in/out of automatic intensity reduction or progressive overload.
-   Set minimum confidence thresholds required for AI intervention.

## Feature Flags
-   `VITE_FF_ADAPTIVE_TRAINING`: Toggles the entire adaptive suite at runtime. When disabled, Workout OS falls back to Sprint 3.7 static progression.

## Wearable Readiness
-   **Status**: `IHealthProvider` and `WearableHealthProvider` abstractions are fully implemented and integrated.
-   **Integration**: External integration with Apple Health / Google Fit is pending real-world hardware API keys. Currently using `MockHealthProvider` for deterministic simulation.

## Known Limitations & Risks
-   Health synchronization is currently interval-based (every 15m) rather than push-based.
-   Actual wearable integration will require native iOS/Android bridge code in a React Native / Capacitor wrapper.
-   Offline sync currently relies on standard `localStorage`; `IndexedDB` may be required if decision history grows significantly.
