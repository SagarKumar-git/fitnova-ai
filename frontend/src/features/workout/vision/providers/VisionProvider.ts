/**
 * FitNova AI — Vision Provider Interface
 * Abstraction layer for computer vision camera input, pose landmark extraction,
 * and biomechanical kinematic processing.
 * Decouples future MediaPipe / TensorFlow.js / WebAssembly models from Workout UI.
 */

import type { PoseFrame } from '../models/PoseLandmark.ts';

export type VisionCameraPermissionStatus =
  | 'permission_required'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'analyzing';

export interface VisionProviderConfig {
  targetFps?: number; // Defaults to 15-30 fps
  facingMode?: 'user' | 'environment';
}

export interface VisionProvider {
  /**
   * Initializes vision engine and checks WebRTC/getUserMedia capabilities.
   */
  initialize(): Promise<boolean>;

  /**
   * Checks current camera permission status.
   */
  getPermissionStatus(): Promise<VisionCameraPermissionStatus>;

  /**
   * Requests camera permission and starts frame capture loop.
   */
  startCamera(videoElement?: HTMLVideoElement): Promise<VisionCameraPermissionStatus>;

  /**
   * Stops frame capture and releases camera streams safely.
   */
  stopCamera(): Promise<void>;

  /**
   * Subscribes to processed pose landmark frames.
   */
  onFrame(callback: (frame: PoseFrame) => void): () => void;

  /**
   * Returns current active camera status.
   */
  isAnalyzing(): boolean;
}
