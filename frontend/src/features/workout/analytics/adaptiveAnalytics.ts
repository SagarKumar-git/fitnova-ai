import type { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import type { AdaptiveDecisionRecord } from '../intelligence/repository/IAdaptiveDecisionRepository.ts';

import type { TelemetryService } from '../../../platform/telemetry/TelemetryService';
import type { Logger } from '../../../platform/logging/Logger';

export class AdaptiveAnalytics {
  private readonly analyticsService: AnalyticsService;
  private readonly telemetryService?: TelemetryService;
  private readonly logger?: Logger;

  constructor(
    analyticsService: AnalyticsService,
    telemetryService?: TelemetryService,
    logger?: Logger
  ) {
    this.analyticsService = analyticsService;
    this.telemetryService = telemetryService;
    this.logger = logger;
  }

  public trackDecisionCreated(decision: AdaptiveDecisionRecord, executionTimeMs?: number): void {
    // Analytics (User Behavior)
    this.analyticsService.track('ADAPTIVE_DECISION_CREATED', {
      decisionId: decision.decisionId,
      sessionId: decision.sessionId,
      type: decision.decisionType,
      confidence: decision.confidence,
      reasonCount: decision.reasons.length,
    });

    // Telemetry (System Performance/Health) - No sensitive health/user data
    if (this.telemetryService) {
      this.telemetryService.record({
        type: 'ADAPTIVE_ENGINE_METRIC',
        sourceModule: 'AdaptiveAnalytics',
        durationMs: executionTimeMs || 0,
        metadata: { event: 'adaptive.decision.generated', type: decision.decisionType }
      });
    }

    if (this.logger) {
      this.logger.info(`Adaptive decision created: ${decision.decisionId}`);
    }
  }

  public trackDecisionAction(decisionId: string, action: AdaptiveDecisionRecord['userAction']): void {
    const eventName = action === 'accepted' ? 'ADAPTIVE_DECISION_ACCEPTED' : 
                      (action === 'rejected' ? 'ADAPTIVE_DECISION_REJECTED' : 'ADAPTIVE_DECISION_MODIFIED');
    this.analyticsService.track(eventName, { decisionId, action });
  }

  public trackAdaptiveOutcome(decisionId: string, outcome: AdaptiveDecisionRecord['resultingWorkoutOutcome']): void {
    this.analyticsService.track('ADAPTIVE_OUTCOME_RECORDED', {
      decisionId,
      outcome,
    });
    
    if (this.telemetryService) {
       this.telemetryService.record({
         type: 'ADAPTIVE_ENGINE_METRIC',
         sourceModule: 'AdaptiveAnalytics',
         metadata: { event: 'adaptive.decision.outcome', outcome }
       });
    }
  }
}
