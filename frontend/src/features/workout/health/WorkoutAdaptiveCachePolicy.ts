import type { ComprehensiveHealthDataset } from './healthTypes.ts';
import type { AdaptiveDecisionRecord } from '../intelligence/repository/IAdaptiveDecisionRepository.ts';

export class WorkoutAdaptiveCachePolicy {
  private readonly HEALTH_CACHE_KEY = 'fitnova_health_cache';
  private readonly DECISION_CACHE_KEY = 'fitnova_decision_cache';

  // 24 hours TTL for health data offline fallback
  private readonly HEALTH_TTL_MS = 24 * 60 * 60 * 1000;

  cacheHealthDataset(dataset: ComprehensiveHealthDataset): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      this.HEALTH_CACHE_KEY,
      JSON.stringify({ dataset, cachedAt: Date.now() })
    );
  }

  getCachedHealthDataset(): ComprehensiveHealthDataset | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.HEALTH_CACHE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const ageMs = Date.now() - parsed.cachedAt;
      if (ageMs > this.HEALTH_TTL_MS) {
        localStorage.removeItem(this.HEALTH_CACHE_KEY);
        return null;
      }
      return parsed.dataset;
    } catch {
      return null;
    }
  }

  cacheLatestDecision(decision: AdaptiveDecisionRecord): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.DECISION_CACHE_KEY, JSON.stringify(decision));
  }

  getLatestDecision(): AdaptiveDecisionRecord | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.DECISION_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
