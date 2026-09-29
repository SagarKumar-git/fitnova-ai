/**
 * FitNova AI — Pose Analysis Service
 * Kinematic calculation engine converting 2D/3D skeletal landmark coordinates
 * into biomechanical joint angles, flexion vectors, and alignment indices.
 * Pure TypeScript. Zero UI/React code.
 */

import type { PoseFrame, PoseLandmark } from '../models/PoseLandmark.ts';
import type { BiomechanicalKinematics, JointAngle, JointType } from '../models/JointAngle.ts';

export class PoseAnalysisService {
  /**
   * Calculates kinematic joint angles and biomechanical metrics from a single pose frame.
   */
  computeKinematics(frame: PoseFrame): BiomechanicalKinematics {
    const { landmarks, timestamp } = frame;

    const leftKneeAngle = this.calculateAngle(
      landmarks.left_hip,
      landmarks.left_knee,
      landmarks.left_ankle,
      'left_knee'
    );

    const rightKneeAngle = this.calculateAngle(
      landmarks.right_hip,
      landmarks.right_knee,
      landmarks.right_ankle,
      'right_knee'
    );

    const leftHipAngle = this.calculateAngle(
      landmarks.left_shoulder,
      landmarks.left_hip,
      landmarks.left_knee,
      'left_hip'
    );

    const rightHipAngle = this.calculateAngle(
      landmarks.right_shoulder,
      landmarks.right_hip,
      landmarks.right_knee,
      'right_hip'
    );

    const leftElbowAngle = this.calculateAngle(
      landmarks.left_shoulder,
      landmarks.left_elbow,
      landmarks.left_wrist,
      'left_elbow'
    );

    const rightElbowAngle = this.calculateAngle(
      landmarks.right_shoulder,
      landmarks.right_elbow,
      landmarks.right_wrist,
      'right_elbow'
    );

    const leftShoulderAngle = this.calculateAngle(
      landmarks.left_hip,
      landmarks.left_shoulder,
      landmarks.left_elbow,
      'left_shoulder'
    );

    const rightShoulderAngle = this.calculateAngle(
      landmarks.right_hip,
      landmarks.right_shoulder,
      landmarks.right_elbow,
      'right_shoulder'
    );

    // Torso inclination relative to vertical axis (shoulder midpoint to hip midpoint)
    const midShoulderX = (landmarks.left_shoulder.x + landmarks.right_shoulder.x) / 2;
    const midShoulderY = (landmarks.left_shoulder.y + landmarks.right_shoulder.y) / 2;
    const midHipX = (landmarks.left_hip.x + landmarks.right_hip.x) / 2;
    const midHipY = (landmarks.left_hip.y + landmarks.right_hip.y) / 2;

    const torsoDx = Math.abs(midShoulderX - midHipX);
    const torsoDy = Math.abs(midShoulderY - midHipY);
    const torsoAngleDegrees =
      torsoDy > 0 ? Math.round((Math.atan2(torsoDx, torsoDy) * 180) / Math.PI) : 0;

    const torsoAngle: JointAngle = {
      joint: 'torso_inclination',
      degrees: torsoAngleDegrees,
      confidence: (landmarks.left_shoulder.visibility + landmarks.left_hip.visibility) / 2,
      pointA: 'mid_shoulder',
      vertexB: 'mid_hip',
      pointC: 'vertical_axis',
    };

    // Knee Valgus Index: Knee width vs Ankle width
    const kneeDistance = Math.abs(landmarks.left_knee.x - landmarks.right_knee.x);
    const ankleDistance = Math.abs(landmarks.left_ankle.x - landmarks.right_ankle.x);
    // If knees are narrower than ankles, kneeValgusIndex is negative
    const kneeValgusIndex =
      ankleDistance > 0 ? Math.round((kneeDistance - ankleDistance) * 100) / 100 : 0;

    const angles: Record<JointType, JointAngle> = {
      left_knee: leftKneeAngle,
      right_knee: rightKneeAngle,
      left_hip: leftHipAngle,
      right_hip: rightHipAngle,
      left_elbow: leftElbowAngle,
      right_elbow: rightElbowAngle,
      left_shoulder: leftShoulderAngle,
      right_shoulder: rightShoulderAngle,
      torso_inclination: torsoAngle,
    };

    return {
      timestamp,
      angles,
      kneeFlexionAvgDegrees: Math.round((leftKneeAngle.degrees + rightKneeAngle.degrees) / 2),
      hipFlexionAvgDegrees: Math.round((leftHipAngle.degrees + rightHipAngle.degrees) / 2),
      elbowFlexionAvgDegrees: Math.round((leftElbowAngle.degrees + rightElbowAngle.degrees) / 2),
      torsoAngleDegrees,
      kneeValgusIndex,
    };
  }

  /**
   * Trigonometric 3-point angle calculation using arctan2 between vector BA and vector BC.
   * Returns degrees in range [0, 180].
   */
  calculateAngle(
    a: PoseLandmark,
    b: PoseLandmark,
    c: PoseLandmark,
    joint: JointType
  ): JointAngle {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let degrees = Math.abs((radians * 180.0) / Math.PI);

    if (degrees > 180.0) {
      degrees = 360.0 - degrees;
    }

    const confidence = Math.min(a.visibility, b.visibility, c.visibility);

    return {
      joint,
      degrees: Math.round(degrees * 10) / 10,
      confidence,
      pointA: a.name,
      vertexB: b.name,
      pointC: c.name,
    };
  }
}
