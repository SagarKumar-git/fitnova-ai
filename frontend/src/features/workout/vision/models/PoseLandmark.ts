/**
 * FitNova AI — Pose Landmark Domain Model
 * Strongly typed 3D normalized body coordinate landmark representation.
 * Aligned with standard 33-point biomechanical kinematic skeletons (MediaPipe compatible).
 * Zero UI/React code.
 */

export type LandmarkName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_ear'
  | 'right_ear'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle'
  | 'left_heel'
  | 'right_heel'
  | 'left_foot_index'
  | 'right_foot_index';

export interface PoseLandmark {
  name: LandmarkName;
  x: number; // Normalized 0.0 to 1.0 (horizontal position)
  y: number; // Normalized 0.0 to 1.0 (vertical position)
  z?: number; // Normalized depth relative to hips
  visibility: number; // Confidence 0.0 to 1.0
}

export interface PoseFrame {
  timestamp: number;
  landmarks: Record<LandmarkName, PoseLandmark>;
  overallConfidence: number;
}
