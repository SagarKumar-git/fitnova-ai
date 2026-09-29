# FitNova AI — Workout OS Production Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React UI Layer                      │
│  ActiveWorkout │ WorkoutHome │ WorkoutHistory │ Stats     │
│  SyncStatusBadge │ CoachingPanel │ ProgressionSuggestion │
├─────────────────────────────────────────────────────────┤
│                   Workout Feature Layer                   │
│  WorkoutService │ WorkoutContext │ WorkoutApi             │
│  ApiWorkoutRepository │ WorkoutCachePolicy                │
├─────────────────────────────────────────────────────────┤
│              Workout Intelligence / AI Layer              │
│  ProgressionEngine │ NovaWorkoutService                   │
│  WorkoutIntelligenceService │ RecoveryEngine              │
├─────────────────────────────────────────────────────────┤
│                 Platform Foundation Layer                 │
│  ApiClient │ EventBus │ StorageService │ OfflineManager   │
│  SyncManager │ NotificationService │ AnalyticsService     │
│  TelemetryService │ NetworkService │ FitNovaError          │
├─────────────────────────────────────────────────────────┤
│               FastAPI Backend (Python)                    │
│  Routes: /workouts/sessions/* │ /exercises/*              │
│  Services: workout_sync │ workout_analytics               │
│  Models: WorkoutSession │ WorkoutSet │ IdempotencyRecord  │
├─────────────────────────────────────────────────────────┤
│                    SQLite Database                        │
│  workout_sessions │ workout_sets │ personal_records       │
│  workout_idempotency_records │ exercises                  │
└─────────────────────────────────────────────────────────┘
```

## API & Database Flow

### Session Lifecycle

```
START SESSION → LOG SET(s) → [PAUSE/RESUME] → [SUBSTITUTE] → FINISH/CANCEL
     ↓              ↓              ↓                ↓              ↓
  POST /start   POST /log-set   PUT /update   POST /substitute   POST /finish
     ↓              ↓              ↓                ↓              ↓
  Session row   Set row +      Status update   Set.substitute_id  Status=completed
  status=active  volume sync    version++       Notes appended    Duration computed
                 PR check                                         Streak updated
```

### Database Schema (Sprint 3.6 Extensions)

**WorkoutSession** additions:
- `status`: `active | paused | completed | cancelled` — Session lifecycle state
- `rating`: 1–5 user satisfaction score
- `calories`: Computed or user-provided energy expenditure
- `version`: Optimistic concurrency counter (incremented on every mutation)
- `updated_at`: Auto-updated modification timestamp

**WorkoutSet** additions:
- `is_skipped`: Boolean flag for intentionally skipped sets
- `notes`: Free-text annotation per set
- `substitute_exercise_id`: FK to replacement exercise
- `version`: Row-level concurrency counter
- `updated_at`: Auto-updated modification timestamp

**WorkoutIdempotencyRecord** (new):
- Keyed on `(user_id, idempotency_key)` unique constraint
- Stores `endpoint`, `status_code`, `response_payload`
- Prevents duplicate mutations across retries and offline replays

## Offline & Sync Lifecycle

```
1. User logs set → WorkoutService.completeSet()
2. Local session state updated immediately (optimistic)
3. API call attempted:
   a. SUCCESS → Server confirms, session persisted
   b. FAILURE → OfflineManager.queueOperation() with idempotency key
4. Network returns online → SyncManager.sync() triggered
5. Each queued operation replayed with exponential backoff:
   - Backoff: min(30s, 1s × 2^retryCount) + random(0-500ms) jitter
   - Success → Operation removed from queue
   - Failure → retryCount++, backoffMs updated
   - retryCount >= maxRetries → Operation moves to dead_letter
6. Dead letter operations surfaced in UI for manual retry
```

## Idempotency Guarantees

Every mutating workout endpoint accepts an `idempotency_key` (header or body):

| Endpoint | Idempotency Key Pattern | Behavior |
|---|---|---|
| `POST /sessions/start` | `start_{sessionId}` | Returns cached session on duplicate |
| `POST /sessions/log-set` | `set_{sessionId}_{exerciseId}_{setNumber}` | Returns cached set response |
| `POST /sessions/finish` | `finish_{sessionId}` | Returns cached completion response |
| `POST /sessions/cancel` | `cancel_{sessionId}` | Returns cached cancellation |
| `POST /sessions/substitute-exercise` | `sub_{sessionId}_{originalExId}` | Returns cached substitution |

Duplicate requests with the same key skip mutation logic and return the previously stored response.

## Conflict Resolution Rules

When a client reconnects with offline sets while the server has newer state:

1. **Set Matching**: Sets are matched on `(exercise_id, set_number)` composite key
2. **Completed Wins**: A completed set (with actual reps/weight) is never overwritten by an incomplete one
3. **Highest Timestamp**: When both sides have completed sets with different data, the higher timestamp wins
4. **Additive Merge**: Local exercises not present on server are appended (no silent drops)
5. **Metadata Preservation**: User notes and ratings from both sources are merged

## Caching Strategy

| Entity | Cache Key | TTL | Invalidation Events |
|---|---|---|---|
| Exercise Catalog | `fitnova:cache:exercises` | 24h | `EXERCISE_MUTATED` |
| Workout Templates | `fitnova:cache:workouts` | 1h | `TEMPLATE_MUTATED`, `WORKOUT_COMPLETED` |
| Recent History | `fitnova:cache:history` | 15m | `WORKOUT_COMPLETED`, `SESSION_DELETED` |
| Personal Records | `fitnova:cache:prs` | 30m | `PERSONAL_RECORD_ACHIEVED`, `WORKOUT_COMPLETED` |
| Analytics | `workout:analytics:unified` | 5m | `WORKOUT_COMPLETED` |
| Active Session | `fitnova:workout:active_session` | ∞ | `WORKOUT_COMPLETED`, `WORKOUT_CANCELLED` |

**Critical Rule**: Active session state is NEVER replaced by stale cache data. Local optimistic state takes priority.

## Security Model & IDOR Prevention

Every endpoint enforces strict ownership via `current_user.id` filtering:

- **Session Access**: `WHERE session.user_id == current_user.id`
- **Template Access**: `WHERE template.user_id == current_user.id`
- **Set Deletion**: JOIN through session ownership check
- **PR Queries**: Filtered by `user_id` on PersonalRecord model

Cross-user access returns `404 Not Found` (not `403 Forbidden`) to prevent user enumeration.

Optimistic locking via `version` field prevents stale overwrites:
- Client sends `version` with update request
- Server rejects if `client_version < server_version` with `409 Conflict`

## Nova Intelligence Grounding

All Nova coaching recommendations are grounded in **real user data**:

- **Pre-workout**: Analyzes actual past sessions (muscle groups trained in last 48-72h, recent volume density, fatigue score)
- **During workout**: Compares against actual completed sets, detects missed reps, high RPE patterns
- **Post-workout**: Computes volume delta against real 4-week average from history, summarizes actual PRs
- **Zero invented numbers**: All statistics reference real logged data

## Progression Safeguards

The ProgressionEngine enforces physiological caps on weight increases:

| Category | Max Single-Step Delta |
|---|---|
| Upper Body Compound | +2.5 kg |
| Upper Body Isolation | +1.25 kg |
| Lower Body Compound | +5.0 kg |
| Lower Body Isolation | +2.5 kg |

Additional safeguard: Max delta capped at **5% of previous weight** or category max (whichever is larger).
This prevents unrealistic jumps like 100kg → 120kg.

## Failure Recovery UX

The ActiveWorkout page displays a **SyncStatusBadge** with five states:

| State | Color | Description |
|---|---|---|
| Online | Green | Connected, all data synced |
| Offline | Amber | Disconnected, shows pending sync count |
| Syncing | Blue | Active sync in progress (animated) |
| Recovered | Purple | Session recovered from local storage |
| Sync Failed | Red | Sync failed, manual retry button shown |

All pages support the state machine: **Loading → Success → Empty → Error → Retry**
