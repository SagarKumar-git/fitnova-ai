import type { IAdaptiveDecisionRepository, AdaptiveDecisionRecord } from './IAdaptiveDecisionRepository.ts';
import type { ApiClient } from '../../../../platform/network/ApiClient.ts';

export class AdaptiveDecisionRepository implements IAdaptiveDecisionRepository {
  private readonly storageKey = 'fitnova_adaptive_decisions';
  private readonly apiClient?: ApiClient;
  
  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient;
  }

  private getDecisions(): Record<string, AdaptiveDecisionRecord> {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : {};
  }

  private saveAll(decisions: Record<string, AdaptiveDecisionRecord>): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(decisions));
  }

  private async syncToBackend(decision: AdaptiveDecisionRecord): Promise<void> {
    if (!this.apiClient) return;
    try {
      await this.apiClient.post('/workouts/adaptive/decisions', {
        session_id: decision.sessionId,
        decision_type: decision.decisionType,
        original_plan: decision.originalWorkoutPlan || {},
        adaptive_plan: decision.adaptiveWorkoutPlan || {},
        reasons: decision.reasons || [],
        supporting_signals: decision.supportingSignals || [],
        confidence: decision.confidence || 0,
        safety_limits_applied: decision.safetyLimitsApplied || [],
        user_action: decision.userAction,
        resulting_outcome: decision.resultingWorkoutOutcome
      });
    } catch (err) {
      console.warn('Failed to sync adaptive decision to backend. It is stored locally.', err);
    }
  }

  private async syncUpdateToBackend(decisionId: string, updates: Record<string, unknown>): Promise<void> {
     if (!this.apiClient) return;
     try {
       await this.apiClient.put(`/workouts/adaptive/decisions/${decisionId}`, updates);
     } catch (err) {
       console.warn('Failed to sync decision update.', err);
     }
  }

  async saveDecision(decision: AdaptiveDecisionRecord): Promise<void> {
    const decisions = this.getDecisions();
    decisions[decision.decisionId] = decision;
    this.saveAll(decisions);
    this.syncToBackend(decision);
  }

  async updateUserAction(decisionId: string, action: AdaptiveDecisionRecord['userAction']): Promise<void> {
    const decisions = this.getDecisions();
    if (decisions[decisionId]) {
      decisions[decisionId].userAction = action;
      this.saveAll(decisions);
      this.syncUpdateToBackend(decisionId, { user_action: action });
    }
  }

  async updateUserOverride(decisionId: string, userOverride: string, userModification?: string): Promise<void> {
    const decisions = this.getDecisions();
    if (decisions[decisionId]) {
      decisions[decisionId].userAction = 'overridden';
      decisions[decisionId].userOverride = userOverride;
      if (userModification) {
        decisions[decisionId].userModification = userModification;
      }
      this.saveAll(decisions);
      this.syncUpdateToBackend(decisionId, {
        user_action: 'overridden',
        user_override: userOverride,
        user_modification: userModification,
      });
    }
  }

  async updateOutcome(decisionId: string, outcome: AdaptiveDecisionRecord['resultingWorkoutOutcome']): Promise<void> {
    const decisions = this.getDecisions();
    if (decisions[decisionId]) {
      decisions[decisionId].resultingWorkoutOutcome = outcome;
      this.saveAll(decisions);
      this.syncUpdateToBackend(decisionId, { resulting_outcome: outcome });
    }
  }

  async getDecisionById(decisionId: string): Promise<AdaptiveDecisionRecord | null> {
    const decisions = this.getDecisions();
    return decisions[decisionId] || null;
  }

  async getDecisionsBySession(sessionId: string): Promise<AdaptiveDecisionRecord[]> {
    const decisions = this.getDecisions();
    return Object.values(decisions).filter(d => d.sessionId === sessionId);
  }
}
