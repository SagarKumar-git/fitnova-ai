/**
 * FitNova AI — Squat Form Analysis Rules
 * Deterministic biomechanical evaluation of squat movement patterns.
 * Analyzes:
 *  - Knee Flexion Depth (parallel depth threshold)
 *  - Knee Valgus (inward knee collapse)
 *  - Torso Inclination (forward torso collapse)
 * Pure TypeScript. Non-medical fitness guidance.
 */

import type { BiomechanicalKinematics } from '../models/JointAngle.ts';
import type { FormAssessment, FormIssue } from '../models/FormAssessment.ts';

export class SquatFormRules {
  evaluate(kinematics: BiomechanicalKinematics, exerciseId: string = 'ex_squat'): FormAssessment {
    const issues: FormIssue[] = [];
    let formScore = 100;
    const { kneeFlexionAvgDegrees, torsoAngleDegrees, kneeValgusIndex } = kinematics;

    // 1. Depth Analysis (Target: Parallel depth <= 95 degrees at bottom of rep)
    if (kneeFlexionAvgDegrees > 105) {
      const deduction = 15;
      formScore -= deduction;
      issues.push({
        id: 'squat_depth_shallow',
        name: 'Shallow Squat Depth',
        description: `Knee flexion reached ${Math.round(kneeFlexionAvgDegrees)}° (target parallel depth is ≤95°).`,
        severity: 'moderate',
        correctiveCue: 'Descend until hip crease is level with or slightly below the top of your knees.',
        affectedJoint: 'knee',
        deductionPoints: deduction,
      });
    }

    // 2. Knee Valgus Analysis (Inward knee collapse)
    if (kneeValgusIndex < -0.05) {
      const isSevere = kneeValgusIndex < -0.12;
      const deduction = isSevere ? 25 : 15;
      formScore -= deduction;
      issues.push({
        id: 'squat_knee_valgus',
        name: 'Knees Collapsing Inward (Valgus)',
        description: 'Medial displacement of the patellofemoral joint during eccentric/concentric transition.',
        severity: isSevere ? 'high' : 'moderate',
        correctiveCue: 'Track your knees outward in line with your 2nd and 3rd toes during the ascent.',
        affectedJoint: 'knee',
        deductionPoints: deduction,
      });
    }

    // 3. Torso Angle Analysis (Excessive forward pitch)
    if (torsoAngleDegrees > 45) {
      const deduction = 15;
      formScore -= deduction;
      issues.push({
        id: 'squat_excessive_lean',
        name: 'Excessive Forward Torso Lean',
        description: `Torso inclination is ${Math.round(torsoAngleDegrees)}° from vertical, increasing lumbar shear load.`,
        severity: 'moderate',
        correctiveCue: 'Keep chest proud, pull the bar into your upper traps, and maintain intra-abdominal pressure.',
        affectedJoint: 'torso',
        deductionPoints: deduction,
      });
    }

    formScore = Math.max(0, Math.min(100, formScore));

    let rating: FormAssessment['rating'] = 'excellent';
    if (formScore < 60) rating = 'critical';
    else if (formScore < 75) rating = 'needs_attention';
    else if (formScore < 90) rating = 'good';

    const positiveFeedback =
      issues.length === 0
        ? 'Outstanding squat mechanics! Symmetrical depth and stable knee alignment maintained.'
        : 'Good eccentric control and balance across the mid-foot.';

    const primaryCorrection = issues.length > 0 ? issues[0].correctiveCue : null;

    return {
      exerciseId,
      exerciseName: 'Barbell Back Squat',
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
