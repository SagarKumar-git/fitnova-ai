# FitNova AI — Workout Sync Strategy

## Overview

FitNova AI uses a **local-first, optimistic sync** architecture that guarantees zero silent data loss during workout sessions, even under unstable network conditions.

## 5-Step Conflict Resolution Scenario Analysis

### Scenario 1: Simple Offline Replay
```
T1: User starts workout online → Session created on server (version 1)
T2: Network drops
T3: User logs 3 sets offline → Queued as 3 pending operations
T4: Network returns
T5: SyncManager replays all 3 operations with idempotency keys
    → Server processes each set idempotently
    → Session version incremented per set
    → Zero duplicates due to idempotency_key uniqueness
```

### Scenario 2: Multi-Device Conflict
```
T1: User starts workout on Phone A → Session version 1
T2: User opens same session on Tablet B (e.g., in gym with two devices)
T3: Phone A logs Set 1 (ex: Bench Press, Set 1, 100kg×8) → version 2
T4: Tablet B logs Set 2 (ex: Bench Press, Set 2, 100kg×6) → version 3
T5: Both devices sync
    → Sets matched on (exercise_id, set_number)
    → Set 1 and Set 2 are different set_numbers → both preserved
    → Session volume re-synced to sum of all sets
```

### Scenario 3: Duplicate Submission
```
T1: User completes set, app sends to server
T2: Network timeout — app doesn't receive response
T3: App queues offline retry with same idempotency_key
T4: Network returns, SyncManager replays
T5: Server finds existing idempotency record → returns cached response
    → No duplicate set created
    → No double-counted volume or PRs
```

### Scenario 4: Stale Cache Protection
```
T1: User finishes workout → WORKOUT_COMPLETED event fired
T2: Cache invalidated for history, PRs, analytics
T3: User navigates to workout home
T4: Fresh data fetched from server
T5: Active session cache cleared (key: fitnova:workout:active_session)
    → No stale active session shown after completion
```

### Scenario 5: Prolonged Offline + Session Recovery
```
T1: User starts workout at gym (online)
T2: Enters basement area — complete signal loss
T3: Logs 5 sets offline over 20 minutes
T4: App crashes (browser refresh / OOM)
T5: User reopens app → WorkoutService.recoverSession()
    → Active session restored from localStorage
    → Status set to 'recovered'
    → Duration recalculated from wall-clock timestamps
    → SyncStatusBadge shows purple "Recovered" indicator
T6: Network returns → SyncManager replays 5 queued operations
    → Each set idempotently applied to server
    → Badge transitions: Recovered → Syncing → Online
```

## Exponential Backoff & Dead-Letter Queue

### Backoff Formula
```
backoffMs = min(30000, 1000 × 2^retryCount) + random(0-500ms)
```

| Retry # | Base Delay | With Jitter (range) |
|---|---|---|
| 0 | 1s | 1.0–1.5s |
| 1 | 2s | 2.0–2.5s |
| 2 | 4s | 4.0–4.5s |
| 3 | 8s | 8.0–8.5s |
| 4 | 16s | 16.0–16.5s |
| 5+ | 30s (cap) | 30.0–30.5s |

### Partial Sync Resilience
Operations are processed independently:
- If Operation B fails, Operation C still processes
- Failed operations get their own backoff timer
- Non-failing operations skip immediately past backoff check

### Dead-Letter Queue
When `retryCount >= maxRetries` (default: 3):
1. Operation status set to `'dead_letter'`
2. Operation remains in queue for manual inspection
3. UI shows red "Sync Failed" badge with Retry button
4. `OfflineManager.retryDeadLetter(id)` resets retry count and returns to pending
5. `OfflineManager.getDeadLetterOperations()` surfaces all dead-lettered items

## Local-First Durability Guarantees

### Active Session Storage
- Key: `fitnova:workout:active_session`
- TTL: Infinite (persisted until finished or cancelled)
- Written to localStorage on every state mutation
- **Never overwritten by stale server data**

### Optimistic State Priority
When both local and remote sessions exist for the same ID:
1. Count total sets in each
2. If local has more sets → keep local (user made progress offline)
3. If remote has more sets → adopt remote (another device synced)
4. Equal → keep local (preserve user's latest view)

### Data Integrity Checks on Recovery
Before restoring a session from storage:
- Validate `id`, `workoutId`, `exercises` array presence
- Verify exercises array is non-empty
- Recalculate duration from wall-clock timestamps
- Bound `currentExerciseIndex` and `currentSetIndex` within valid ranges
- If validation fails → clear corrupted session, return null
