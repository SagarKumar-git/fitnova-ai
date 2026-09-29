import type { IAdaptiveDecisionRepository } from './repository/IAdaptiveDecisionRepository.ts';

export class AdaptiveDecisionAudit {
  private readonly repository: IAdaptiveDecisionRepository;

  constructor(repository: IAdaptiveDecisionRepository) {
    this.repository = repository;
  }

  /**
   * Generates a structured, human-readable auditable chain for a specific decision.
   * Clearly distinguishes AI recommendation, Safety Guard modifications, and User Overrides.
   */
  async generateAuditTrail(decisionId: string): Promise<string> {
    const decision = await this.repository.getDecisionById(decisionId);
    if (!decision) {
      return `Error: Adaptive decision ${decisionId} not found in audit log.`;
    }

    const aiRecommendation = decision.aiRecommendation || `${decision.decisionType} (${decision.reasons.join('; ')})`;
    const safetyModification = decision.safetyModification || 
      (decision.safetyLimitsApplied.length > 0 ? decision.safetyLimitsApplied.join('; ') : 'No safety guard restrictions clamped');
    const userModification = decision.userModification || (decision.userOverride ? decision.userOverride : 'None (No user override)');
    
    // Explicit verification that AI recommendation is never claimed to be followed if user modified it
    const executionAttribution = decision.userAction === 'overridden' || decision.userOverride
      ? 'USER_OVERRIDE (AI recommendation was modified by user)'
      : decision.userAction === 'accepted'
      ? 'AI_ADAPTATION_ACCEPTED (User followed Nova recommendation)'
      : decision.userAction === 'rejected'
      ? 'USER_REJECTED (Original plan retained by user)'
      : decision.userAction.toUpperCase();

    return `
Adaptive Decision Auditable Chain
=================================
Decision ID: ${decision.decisionId}
Session ID: ${decision.sessionId}
Timestamp: ${new Date(decision.timestamp).toISOString()}

1. Original Plan:
${JSON.stringify(decision.originalWorkoutPlan, null, 2)}

2. Signals Used:
${decision.supportingSignals.length > 0 ? decision.supportingSignals.map(s => `   - ${s}`).join('\n') : '   - None recorded'}

3. Signal Freshness:
   ${decision.signalFreshness || 'fresh'}

4. Confidence Level:
   ${(decision.confidence * 100).toFixed(1)}%

5. Safety Guard:
   - Modifications: ${safetyModification}
   - Safety Limits: ${decision.safetyLimitsApplied.length > 0 ? decision.safetyLimitsApplied.join(', ') : 'Within standard bounds'}

6. Final Adaptive Plan:
${JSON.stringify(decision.adaptiveWorkoutPlan, null, 2)}

7. Decision Breakdown:
   - AI Recommendation: ${aiRecommendation}
   - Safety Modification: ${safetyModification}
   - User Modification: ${userModification}

8. User Action & Attribution:
   - Action: ${decision.userAction.toUpperCase()}
   - Attribution: ${executionAttribution}
   ${decision.userOverride ? `- Override Details: ${decision.userOverride}` : ''}

9. Workout Outcome:
   ${decision.resultingWorkoutOutcome || 'Pending Evaluation'}
    `.trim();
  }
}
