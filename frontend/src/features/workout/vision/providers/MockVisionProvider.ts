/**
 * FitNova AI — Mock Vision Provider
 * Deterministic computer vision simulator producing kinematic pose frames.
 * Supports configurable biomechanical fault scenarios for automated testing and local development.
 */

import type { VisionProvider, VisionCameraPermissionStatus } from './VisionProvider.ts';
import type { PoseFrame, LandmarkName, PoseLandmark } from '../models/PoseLandmark.ts';

export type MockVisionScenario =
  | 'optimal'
  | 'knee_valgus'
  | 'shallow_depth'
  | 'elbow_flare'
  | 'lumbar_rounding';

export class MockVisionProvider implements VisionProvider {
  private status: VisionCameraPermissionStatus = 'granted';
  private analyzing: boolean = false;
  private scenario: MockVisionScenario = 'optimal';
  private frameListeners: Array<(frame: PoseFrame) => void> = [];
  private timerId: ReturnType<typeof setInterval> | null = null;

  setScenario(scenario: MockVisionScenario): void {
    this.scenario = scenario;
  }

  setPermissionStatus(status: VisionCameraPermissionStatus): void {
    this.status = status;
    if (status !== 'analyzing') {
      this.stopCamera();
    }
  }

  async initialize(): Promise<boolean> {
    return true;
  }

  async getPermissionStatus(): Promise<VisionCameraPermissionStatus> {
    return this.status;
  }

  async startCamera(_videoElement?: HTMLVideoElement): Promise<VisionCameraPermissionStatus> {
    if (this.status === 'denied' || this.status === 'unavailable') {
      return this.status;
    }

    this.status = 'analyzing';
    this.analyzing = true;

    // Start 10 FPS simulated frame loop
    if (!this.timerId) {
      this.timerId = setInterval(() => {
        if (!this.analyzing) return;
        const frame = this.generateSimulatedFrame(this.scenario);
        for (const listener of this.frameListeners) {
          listener(frame);
        }
      }, 100);
    }

    return 'analyzing';
  }

  async stopCamera(): Promise<void> {
    this.analyzing = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.status === 'analyzing') {
      this.status = 'granted';
    }
  }

  onFrame(callback: (frame: PoseFrame) => void): () => void {
    this.frameListeners.push(callback);
    return () => {
      this.frameListeners = this.frameListeners.filter((cb) => cb !== callback);
    };
  }

  isAnalyzing(): boolean {
    return this.analyzing;
  }

  /**
   * Generates a single deterministic pose frame according to the active scenario.
   */
  generateSimulatedFrame(scenario: MockVisionScenario): PoseFrame {
    const now = Date.now();
    const landmarks: Record<LandmarkName, PoseLandmark> = {
      nose: { name: 'nose', x: 0.5, y: 0.2, visibility: 0.98 },
      left_eye: { name: 'left_eye', x: 0.48, y: 0.18, visibility: 0.95 },
      right_eye: { name: 'right_eye', x: 0.52, y: 0.18, visibility: 0.95 },
      left_ear: { name: 'left_ear', x: 0.45, y: 0.19, visibility: 0.9 },
      right_ear: { name: 'right_ear', x: 0.55, y: 0.19, visibility: 0.9 },

      // Shoulders
      left_shoulder: { name: 'left_shoulder', x: 0.42, y: 0.32, visibility: 0.98 },
      right_shoulder: { name: 'right_shoulder', x: 0.58, y: 0.32, visibility: 0.98 },

      // Elbows (Scenario-dependent)
      left_elbow: {
        name: 'left_elbow',
        x: scenario === 'elbow_flare' ? 0.28 : 0.38,
        y: 0.44,
        visibility: 0.95,
      },
      right_elbow: {
        name: 'right_elbow',
        x: scenario === 'elbow_flare' ? 0.72 : 0.62,
        y: 0.44,
        visibility: 0.95,
      },

      // Wrists
      left_wrist: { name: 'left_wrist', x: 0.38, y: 0.32, visibility: 0.95 },
      right_wrist: { name: 'right_wrist', x: 0.62, y: 0.32, visibility: 0.95 },

      // Hips (Scenario-dependent for deadlift rounding)
      left_hip: { name: 'left_hip', x: 0.45, y: scenario === 'lumbar_rounding' ? 0.62 : 0.58, visibility: 0.98 },
      right_hip: { name: 'right_hip', x: 0.55, y: scenario === 'lumbar_rounding' ? 0.62 : 0.58, visibility: 0.98 },

      // Knees (Scenario-dependent for depth and valgus)
      left_knee: {
        name: 'left_knee',
        x: scenario === 'knee_valgus' ? 0.49 : 0.44,
        y: scenario === 'shallow_depth' ? 0.7 : 0.76, // 0.76 represents deep 90 deg parallel
        visibility: 0.96,
      },
      right_knee: {
        name: 'right_knee',
        x: scenario === 'knee_valgus' ? 0.51 : 0.56,
        y: scenario === 'shallow_depth' ? 0.7 : 0.76,
        visibility: 0.96,
      },

      // Ankles & Feet
      left_ankle: { name: 'left_ankle', x: 0.43, y: 0.92, visibility: 0.96 },
      right_ankle: { name: 'right_ankle', x: 0.57, y: 0.92, visibility: 0.96 },
      left_heel: { name: 'left_heel', x: 0.42, y: 0.94, visibility: 0.9 },
      right_heel: { name: 'right_heel', x: 0.58, y: 0.94, visibility: 0.9 },
      left_foot_index: { name: 'left_foot_index', x: 0.41, y: 0.96, visibility: 0.9 },
      right_foot_index: { name: 'right_foot_index', x: 0.59, y: 0.96, visibility: 0.9 },
    };

    return {
      timestamp: now,
      landmarks,
      overallConfidence: 0.95,
    };
  }
}
