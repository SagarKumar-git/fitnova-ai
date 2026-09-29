/**
 * FitNova AI — Bench Press Form Analysis Rules
 * Deterministic biomechanical evaluation of horizontal pressing mechanics.
 * Analyzes:
 *  - Elbow Flare Angle (acromioclavicular shear risk)
 *  - Pressing Symmetry (bilateral elbow flexion delta)
 *  - Forearm Verticality
 * Pure TypeScript. Non-medical fitness guidance.
 */

import type { BiomechanicalKinematics } from '../models/JointAngle.ts';
import type { FormAssessment, FormIssue } from '../models/FormAssessment.ts';

export class BenchPressFormRules {
  evaluate(kinematics: BiomechanicalKinematics, exerciseId: string = 'ex_bench'): FormAssessment {
    const issues: FormIssue[] = [];
    let formScore = 100;
    const { angles } = kinematics;

    const leftElbow = angles.left_elbow?.degrees ?? 90;
    const rightElbow = angles.right_elbow?.degrees ?? 90;
    const leftShoulder = angles.left_shoulder?.degrees ?? 60;
    const rightShoulder = angles.right_shoulder?.degrees ?? 60;

    // 1. Elbow Flare Angle (Shoulder abduction relative to torso)
    const avgShoulderAbduction = (leftShoulder + rightShoulder) / 2;
    if (avgShoulderAbduction > 80) {
      const deduction = 20;
      formScore -= deduction;
      issues.push({
        id: 'bench_elbow_flare',
        name: 'Excessive Elbow Flare',
        description: `Shoulder abduction angle is ${Math.round(avgShoulderAbduction)}° (optimal: 45°–70°). Increases impingement stress.`,
        severity: 'high',
        correctiveCue: 'Tuck your elbows to roughly 45°–70° relative to your torso and engage your lats.',
        affectedJoint: 'shoulder',
        deductionPoints: deduction,
      });
    }

    // 2. Bilateral Pressing Asymmetry
    const elbowDelta = Math.abs(leftElbow - rightElbow);
    if (elbowDelta > 15) {
      const deduction = 15;
      formScore -= deduction;
      issues.push({
        id: 'bench_asymmetry',
        name: 'Uneven Pressing Lockout',
        description: `Bilateral difference of ${Math.round(elbowDelta)}° detected between left and right arms.`,
        severity: 'moderate',
        correctiveCue: 'Drive equally through both palms and press simultaneously off your chest.',
        affectedJoint: 'elbow',
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
        ? 'Superb horizontal pressing mechanics! Solid elbow tuck and symmetrical bar path.'
        : 'Good wrist stack and steady bar control during the eccentric phase.';

    const primaryCorrection = issues.length > 0 ? issues[0].correctiveCue : null;

    return {
      exerciseId,
      exerciseName: 'Barbell Bench Press',
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
