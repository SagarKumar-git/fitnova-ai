/**
 * FitNova AI — Joint Angle Domain Model
 * Calculated geometric 3-point joint angles representing flexion, extension, and alignment.
 * Zero UI/React code.
 */

export type JointType =
  | 'left_knee'
  | 'right_knee'
  | 'left_hip'
  | 'right_hip'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'torso_inclination';

export interface JointAngle {
  joint: JointType;
  degrees: number; // 0 to 180
  confidence: number; // 0.0 to 1.0
  pointA: string;
  vertexB: string;
  pointC: string;
}

export interface BiomechanicalKinematics {
  timestamp: number;
  angles: Partial<Record<JointType, JointAngle>>;
  kneeFlexionAvgDegrees: number;
  hipFlexionAvgDegrees: number;
  elbowFlexionAvgDegrees: number;
  torsoAngleDegrees: number;
  kneeValgusIndex: number; // Negative = inward collapse, positive = neutral/outward
}
