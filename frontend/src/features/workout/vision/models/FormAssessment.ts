/**
 * FitNova AI — Form Assessment Domain Model
 * Structured biomechanical evaluation result for live exercise feedback.
 * Zero UI/React code. Non-medical fitness guidance.
 */

export type FormIssueSeverity = 'low' | 'moderate' | 'high';

export interface FormIssue {
  id: string;
  name: string;
  description: string;
  severity: FormIssueSeverity;
  correctiveCue: string;
  affectedJoint?: string;
  deductionPoints: number;
}

export interface FormAssessment {
  exerciseId: string;
  exerciseName: string;
  timestamp: number;
  formScore: number; // 0 to 100
  rating: 'excellent' | 'good' | 'needs_attention' | 'critical';
  confidence: number; // 0.0 to 1.0
  detectedIssues: FormIssue[];
  positiveFeedback: string;
  primaryCorrection: string | null;
  repPhase?: 'eccentric' | 'inflection_point' | 'concentric' | 'lockout' | 'idle';
  isRepValid: boolean;
}
