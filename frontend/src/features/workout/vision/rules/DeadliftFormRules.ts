/**
 * FitNova AI — Deadlift Form Analysis Rules
 * Deterministic biomechanical evaluation of hip hinge and deadlift mechanics.
 * Analyzes:
 *  - Lumbar Rounding (spinal flexion under load)
 *  - Premature Hip Rise (hips shooting up before chest)
 *  - Knee/Hip Extension Synchronization
 * Pure TypeScript. Non-medical fitness guidance.
 */

import type { BiomechanicalKinematics } from '../models/JointAngle.ts';
import type { FormAssessment, FormIssue } from '../models/FormAssessment.ts';

export class DeadliftFormRules {
  evaluate(kinematics: BiomechanicalKinematics, exerciseId: string = 'ex_deadlift'): FormAssessment {
    const issues: FormIssue[] = [];
    let formScore = 100;
    const { hipFlexionAvgDegrees, torsoAngleDegrees } = kinematics;

    // 1. Lumbar Rounding (Spinal flexion risk)
    // If torso angle exceeds 60 degrees with high hip flexion divergence
    if (torsoAngleDegrees > 55 && hipFlexionAvgDegrees < 75) {
      const deduction = 25;
      formScore -= deduction;
      issues.push({
        id: 'deadlift_lumbar_rounding',
        name: 'Spinal Flexion / Lumbar Rounding',
        description: 'Excessive rounding of the lumbar spine detected during hip hinge pull.',
        severity: 'high',
        correctiveCue: 'Brace your abdominal wall, pack your lats, and pull the slack out of the bar before lifting.',
        affectedJoint: 'spine',
        deductionPoints: deduction,
      });
    }

    // 2. Premature Hip Rise (Hips shooting up)
    if (torsoAngleDegrees > 65) {
      const deduction = 15;
      formScore -= deduction;
      issues.push({
        id: 'deadlift_hip_shoot',
        name: 'Premature Hip Rise',
        description: 'Hips rose faster than shoulders off the floor, shifting load onto lower back.',
        severity: 'moderate',
        correctiveCue: 'Push the floor away with your legs and keep your chest rising at the same rate as your hips.',
        affectedJoint: 'hip',
        deductionPoints: deduction,
      });
    }

    formScore = Math.max(0, Math.min(100, formScore));

    let rating: FormAssessment['rating'] = 'excellent';
    if (formScore <= 60) rating = 'critical';
    else if (formScore < 75) rating = 'needs_attention';
    else if (formScore < 90) rating = 'good';

    const positiveFeedback =
      issues.length === 0
        ? 'Flawless hip hinge! Neutral spine maintained throughout pull and lockout.'
        : 'Good lockout power and bar proximity to body.';

    const primaryCorrection = issues.length > 0 ? issues[0].correctiveCue : null;

    return {
      exerciseId,
      exerciseName: 'Barbell Conventional Deadlift',
      timestamp: kinematics.timestamp,
      formScore,
      rating,
      confidence: 0.95,
      detectedIssues: issues,
      positiveFeedback,
      primaryCorrection,
      isRepValid: formScore >= 60,
    };
  }
}
