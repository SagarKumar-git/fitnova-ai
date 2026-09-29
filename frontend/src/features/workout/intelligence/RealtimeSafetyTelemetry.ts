import type { EventBus } from '../../../platform/events/EventBus.ts';
import type { AnalyticsService } from '../../../platform/analytics/AnalyticsService.ts';
import type { TelemetryService } from '../../../platform/telemetry/TelemetryService.ts';
import type { ApiClient } from '../../../platform/network/ApiClient.ts';
import type { OfflineManager } from '../../../platform/offline/OfflineManager.ts';
import type { 
  SafetyZoneTransitionedPayload,
  SafetyInterventionTriggeredPayload,
  SafetyInterventionClearedPayload,
  SafetyRecommendationOverriddenPayload,
  AdaptiveRecommendationAcceptedPayload,
  AdaptiveRecommendationRejectedPayload,
  HighHrSustainedPayload,
  CriticalHrSustainedPayload,
  HealthDataStalePayload,
  AdaptiveDecisionUpdatedPayload,
} from '../../../platform/types/events.ts';

export interface SafeStructuredSafetyEventPayload {
  session_id: string;
  event_type: string;
  safety_state: string;
  intervention?: string;
  confidence: number;
  freshness: string;
  provider: string;
  client_timestamp: number;
}

export class RealtimeSafetyTelemetry {
  private readonly eventBus: EventBus;
  private readonly analytics: AnalyticsService;
  private readonly apiClient?: ApiClient;
  private readonly offlineManager?: OfflineManager;
  private readonly telemetryService?: TelemetryService;
  private unsubs: Array<() => void> = [];

  constructor(
    eventBus: EventBus,
    analytics: AnalyticsService,
    apiClient?: ApiClient,
    offlineManager?: OfflineManager,
    telemetryService?: TelemetryService
  ) {
    this.eventBus = eventBus;
    this.analytics = analytics;
    this.apiClient = apiClient;
    this.offlineManager = offlineManager;
    this.telemetryService = telemetryService;
    this.attachListeners();
  }

  public async syncSafetyEventToBackend(payload: SafeStructuredSafetyEventPayload): Promise<void> {
    if (!this.apiClient) return;

    try {
      await this.apiClient.post('/workouts/adaptive/safety-events', payload);
    } catch (_err) {
      if (this.offlineManager) {
        const queue = this.offlineManager.getQueue();
        const alreadyQueued = queue.some(op => {
          const p = op.payload as SafeStructuredSafetyEventPayload | undefined;
          return p && p.session_id === payload.session_id && p.event_type === payload.event_type && p.client_timestamp === payload.client_timestamp;
        });

        if (!alreadyQueued) {
          this.offlineManager.queueOperation<SafeStructuredSafetyEventPayload>({
            type: 'SYNC_SAFETY_EVENT',
            method: 'POST',
            endpoint: '/workouts/adaptive/safety-events',
            payload,
            maxRetries: 5,
          });
        }
      }
    }
  }

  private attachListeners(): void {
    // 1. Zone Transitions
    this.unsubs.push(
      this.eventBus.subscribe('SAFETY_ZONE_TRANSITIONED', (payload: SafetyZoneTransitionedPayload) => {
        this.analytics.track('safety_zone_transitioned', {
          sessionId: payload.sessionId,
          previousZone: payload.previousZone,
          newZone: payload.newZone,
          timestamp: payload.timestamp,
        });

        if (this.telemetryService) {
          this.telemetryService.record({
            type: 'SAFETY_ENGINE_METRIC',
            sourceModule: 'RealtimeSafetyEngine',
            metadata: {
              transition: `${payload.previousZone}->${payload.newZone}`,
              sessionId: payload.sessionId,
            },
          });
        }

        this.syncSafetyEventToBackend({
          session_id: payload.sessionId,
          event_type: 'safety_zone_transitioned',
          safety_state: payload.newZone,
          confidence: 1.0,
          freshness: 'fresh',
          provider: 'realtime_safety_engine',
          client_timestamp: payload.timestamp,
        });
      })
    );

    // 2. Safety Interventions Triggered
    this.unsubs.push(
      this.eventBus.subscribe('SAFETY_INTERVENTION_TRIGGERED', (payload: SafetyInterventionTriggeredPayload) => {
        this.analytics.track('safety_intervention_triggered', {
          sessionId: payload.sessionId,
          zone: payload.zone,
          intervention: payload.intervention,
          timestamp: payload.timestamp,
        });

        if (this.telemetryService) {
          this.telemetryService.record({
            type: 'SAFETY_INTERVENTION_FIRED',
            sourceModule: 'RealtimeSafetyEngine',
            metadata: {
              intervention: payload.intervention,
              zone: payload.zone,
              sessionId: payload.sessionId,
            },
          });
        }

        this.syncSafetyEventToBackend({
          session_id: payload.sessionId,
          event_type: 'safety_intervention_triggered',
          safety_state: payload.zone,
          intervention: payload.intervention,
          confidence: 1.0,
          freshness: 'fresh',
          provider: 'realtime_safety_engine',
          client_timestamp: payload.timestamp,
        });
      })
    );

    // 3. Safety Intervention Cleared
    this.unsubs.push(
      this.eventBus.subscribe('SAFETY_INTERVENTION_CLEARED', (payload: SafetyInterventionClearedPayload) => {
        this.analytics.track('safety_intervention_cleared', {
          sessionId: payload.sessionId,
          timestamp: payload.timestamp,
        });

        this.syncSafetyEventToBackend({
          session_id: payload.sessionId,
          event_type: 'safety_intervention_cleared',
          safety_state: 'cleared',
          confidence: 1.0,
          freshness: 'fresh',
          provider: 'realtime_safety_engine',
          client_timestamp: payload.timestamp,
        });
      })
    );

    // 4. Sustained High HR Detection
    this.unsubs.push(
      this.eventBus.subscribe('HIGH_HR_SUSTAINED', (payload: HighHrSustainedPayload) => {
        this.analytics.track('sustained_high_hr_detected', {
          sessionId: payload.sessionId,
          consecutiveReadings: payload.consecutiveReadings,
          timestamp: payload.timestamp,
        });

        this.syncSafetyEventToBackend({
          session_id: payload.sessionId,
          event_type: 'sustained_high_hr_detected',
          safety_state: 'high',
          intervention: 'reduce_volume',
          confidence: 1.0,
          freshness: 'fresh',
          provider: 'realtime_safety_engine',
          client_timestamp: payload.timestamp,
        });
      })
    );

    // 5. Sustained Critical HR Detection
    this.unsubs.push(
      this.eventBus.subscribe('CRITICAL_HR_SUSTAINED', (payload: CriticalHrSustainedPayload) => {
        this.analytics.track('sustained_critical_hr_detected', {
          sessionId: payload.sessionId,
          consecutiveReadings: payload.consecutiveReadings,
          timestamp: payload.timestamp,
        });

        this.syncSafetyEventToBackend({
          session_id: payload.sessionId,
          event_type: 'sustained_critical_hr_detected',
          safety_state: 'critical',
          intervention: 'stop_and_recover',
          confidence: 1.0,
          freshness: 'fresh',
          provider: 'realtime_safety_engine',
          client_timestamp: payload.timestamp,
        });
      })
    );

    // 6. Safety Recommendation Overridden by User
    this.unsubs.push(
      this.eventBus.subscribe('SAFETY_RECOMMENDATION_OVERRIDDEN', (payload: SafetyRecommendationOverriddenPayload) => {
        this.analytics.track('safety_recommendation_overridden', {
          sessionId: payload.sessionId,
          intervention: payload.intervention,
          timestamp: payload.timestamp,
        });

        this.syncSafetyEventToBackend({
          session_id: payload.sessionId,
          event_type: 'safety_recommendation_overridden',
          safety_state: 'overridden',
          intervention: payload.intervention,
          confidence: 1.0,
          freshness: 'fresh',
          provider: 'user',
          client_timestamp: payload.timestamp,
        });
      })
    );

    // 7. Adaptive Decision Generated
    this.unsubs.push(
      this.eventBus.subscribe('ADAPTIVE_DECISION_UPDATED', (payload: AdaptiveDecisionUpdatedPayload) => {
        this.analytics.track('adaptive_decision_generated', {
          decisionId: payload.decisionId,
          recommendedAction: payload.recommendedAction,
          timestamp: payload.timestamp,
        });
      })
    );

    // 8. Adaptive Recommendation Accepted
    this.unsubs.push(
      this.eventBus.subscribe('ADAPTIVE_RECOMMENDATION_ACCEPTED', (payload: AdaptiveRecommendationAcceptedPayload) => {
        this.analytics.track('adaptive_decision_accepted', {
          recommendationId: payload.recommendationId,
          type: payload.type,
          timestamp: payload.timestamp,
        });
      })
    );

    // 9. Adaptive Recommendation Rejected
    this.unsubs.push(
      this.eventBus.subscribe('ADAPTIVE_RECOMMENDATION_REJECTED', (payload: AdaptiveRecommendationRejectedPayload) => {
        this.analytics.track('adaptive_decision_rejected', {
          recommendationId: payload.recommendationId,
          type: payload.type,
          timestamp: payload.timestamp,
        });
      })
    );

    // 10. Wearable Provider State Changed (Disconnect & Reconnect)
    this.unsubs.push(
      this.eventBus.subscribe('HEALTH_PROVIDER_STATE_CHANGED', (payload: { state: string; provider?: string }) => {
        const isDisconnect = payload.state === 'disconnected' || payload.state === 'unavailable' || payload.state === 'error';
        const eventName = isDisconnect ? 'wearable_disconnect' : (payload.state === 'connected' ? 'wearable_reconnect' : 'wearable_state_changed');

        this.analytics.track(eventName, {
          state: payload.state,
          provider: payload.provider ?? 'wearable',
          timestamp: Date.now(),
        });

        this.syncSafetyEventToBackend({
          session_id: 'active_session',
          event_type: eventName,
          safety_state: isDisconnect ? 'disconnected' : payload.state,
          confidence: isDisconnect ? 0.0 : 1.0,
          freshness: isDisconnect ? 'unavailable' : 'fresh',
          provider: payload.provider ?? 'wearable',
          client_timestamp: Date.now(),
        });
      })
    );

    // 11. Stale Biometric Data
    this.unsubs.push(
      this.eventBus.subscribe('HEALTH_DATA_STALE', (payload: HealthDataStalePayload) => {
        this.analytics.track('stale_biometric_data', {
          provider: payload.provider,
          ageMs: payload.ageMs,
          freshnessState: payload.freshnessState,
          timestamp: payload.timestamp,
        });

        this.syncSafetyEventToBackend({
          session_id: 'active_session',
          event_type: 'stale_biometric_data',
          safety_state: 'stale',
          confidence: 0.2,
          freshness: 'stale',
          provider: payload.provider,
          client_timestamp: payload.timestamp,
        });
      })
    );
  }

  public cleanup(): void {
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
  }
}
