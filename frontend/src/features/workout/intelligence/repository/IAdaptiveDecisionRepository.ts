export interface WorkoutPlanSnapshot {
  exerciseId?: string;
  exerciseName?: string;
  weight?: number;
  reps?: number;
  sets?: number;
  [key: string]: unknown;
}

export interface AdaptiveDecisionRecord {
  decisionId: string;
  sessionId: string;
  timestamp: number;
  originalWorkoutPlan: WorkoutPlanSnapshot;
  adaptiveWorkoutPlan: WorkoutPlanSnapshot;
  decisionType: 'reduce_weight' | 'increase_weight' | 'reduce_volume' | 'increase_volume' | 'substitute_exercise' | 'maintain';
  reasons: string[];
  supportingSignals: string[];
  signalFreshness?: string;
  confidence: number;
  safetyLimitsApplied: string[];

  // Auditable Chain distinguishing AI vs Safety Guard vs User
  aiRecommendation?: string;
  safetyModification?: string;
  userModification?: string;
  userAction: 'accepted' | 'rejected' | 'dismissed' | 'overridden' | 'pending';
  userOverride?: string;
  resultingWorkoutOutcome?: 'adaptation_successful' | 'adaptation_too_aggressive' | 'adaptation_too_conservative' | 'neutral' | 'insufficient_data';
}

export interface IAdaptiveDecisionRepository {
  saveDecision(decision: AdaptiveDecisionRecord): Promise<void>;
  updateUserAction(decisionId: string, action: AdaptiveDecisionRecord['userAction']): Promise<void>;
  updateUserOverride(decisionId: string, userOverride: string, userModification?: string): Promise<void>;
  updateOutcome(decisionId: string, outcome: AdaptiveDecisionRecord['resultingWorkoutOutcome']): Promise<void>;
  getDecisionById(decisionId: string): Promise<AdaptiveDecisionRecord | null>;
  getDecisionsBySession(sessionId: string): Promise<AdaptiveDecisionRecord[]>;
}
