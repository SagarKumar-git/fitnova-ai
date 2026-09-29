/**
 * FitNova AI — Sprint 3.7 AI Form Analysis Vision Test Suite
 * Validates PoseAnalysisService trigonometric angle calculation,
 * Squat, Bench Press, and Deadlift biomechanical rule engines,
 * MockVisionProvider simulated frame streams, and FormAnalysisService EventBus notifications.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../../platform/events/EventBus.ts';
import { AnalyticsService } from '../../../../platform/analytics/AnalyticsService.ts';
import { PoseAnalysisService } from '../services/PoseAnalysisService.ts';
import { FormAnalysisService } from '../services/FormAnalysisService.ts';
import { MockVisionProvider } from '../providers/MockVisionProvider.ts';
import { SquatFormRules } from '../rules/SquatFormRules.ts';
import { BenchPressFormRules } from '../rules/BenchPressFormRules.ts';
import { DeadliftFormRules } from '../rules/DeadliftFormRules.ts';
import type { PoseLandmark, PoseFrame } from '../models/PoseLandmark.ts';
import type { BiomechanicalKinematics } from '../models/JointAngle.ts';

describe('Sprint 3.7 — AI Form Analysis Vision Suite', () => {
  let eventBus: EventBus;
  let analytics: AnalyticsService;
  let poseService: PoseAnalysisService;
  let squatRules: SquatFormRules;
  let benchRules: BenchPressFormRules;
  let deadliftRules: DeadliftFormRules;
  let formService: FormAnalysisService;
  let mockVision: MockVisionProvider;

  beforeEach(() => {
    eventBus = new EventBus();
    analytics = new AnalyticsService({ enabled: false });
    poseService = new PoseAnalysisService();
    squatRules = new SquatFormRules();
    benchRules = new BenchPressFormRules();
    deadliftRules = new DeadliftFormRules();
    mockVision = new MockVisionProvider();
    formService = new FormAnalysisService({
      provider: mockVision,
      eventBus,
      analytics,
      debounceMs: 50, // Short debounce for testing
    });
  });

  // ==========================================================================
  // 1. POSE ANGLE KINEMATICS & TRIGONOMETRIC CALCULATION
  // ==========================================================================
  describe('1. 3-Point Angle Geometry & Kinematics', () => {
    it('accurately computes a 90-degree orthogonal angle between three landmarks', () => {
      const p1: PoseLandmark = { name: 'left_hip', x: 0, y: 1, visibility: 1.0 };
      const p2: PoseLandmark = { name: 'left_knee', x: 0, y: 0, visibility: 1.0 }; // vertex
      const p3: PoseLandmark = { name: 'left_ankle', x: 1, y: 0, visibility: 1.0 };

      const angle = poseService.calculateAngle(p1, p2, p3, 'left_knee');
      expect(Math.round(angle.degrees)).toBe(90);
      expect(angle.joint).toBe('left_knee');
      expect(angle.confidence).toBe(1.0);
    });

    it('accurately computes a 180-degree straight angle', () => {
      const p1: PoseLandmark = { name: 'left_shoulder', x: -1, y: 0, visibility: 1.0 };
      const p2: PoseLandmark = { name: 'left_elbow', x: 0, y: 0, visibility: 1.0 };
      const p3: PoseLandmark = { name: 'left_wrist', x: 1, y: 0, visibility: 1.0 };

      const angle = poseService.calculateAngle(p1, p2, p3, 'left_elbow');
      expect(Math.round(angle.degrees)).toBe(180);
    });

    it('computes full kinematic joint angles from a complete PoseFrame', () => {
      const frame: PoseFrame = mockVision.generateSimulatedFrame('optimal');

      const kinematics = poseService.computeKinematics(frame);
      expect(kinematics.angles.left_knee).toBeDefined();
      expect(kinematics.angles.right_knee).toBeDefined();
      expect(kinematics.kneeFlexionAvgDegrees).toBeGreaterThan(0);
      expect(kinematics.torsoAngleDegrees).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // 2. BIOMECHANICAL RULE ENGINES
  // ==========================================================================
  describe('2. Biomechanical Exercise Rules', () => {
    describe('Squat Rules', () => {
      it('awards an excellent score (100) for a deep, symmetrical, upright squat', () => {
        const kinematics: BiomechanicalKinematics = {
          timestamp: Date.now(),
          angles: {},
          torsoAngleDegrees: 25, // upright
          kneeFlexionAvgDegrees: 85, // deep parallel
          hipFlexionAvgDegrees: 80,
          elbowFlexionAvgDegrees: 90,
          kneeValgusIndex: 0.02, // neutral/outward knees
        };

        const assessment = squatRules.evaluate(kinematics, 'ex_squat');
        expect(assessment.formScore).toBe(100);
        expect(assessment.rating).toBe('excellent');
        expect(assessment.detectedIssues.length).toBe(0);
        expect(assessment.isRepValid).toBe(true);
      });

      it('detects shallow squat depth and assigns corrective cue', () => {
        const kinematics: BiomechanicalKinematics = {
          timestamp: Date.now(),
          angles: {},
          torsoAngleDegrees: 28,
          kneeFlexionAvgDegrees: 118, // shallow (target <= 95)
          hipFlexionAvgDegrees: 105,
          elbowFlexionAvgDegrees: 90,
          kneeValgusIndex: 0,
        };

        const assessment = squatRules.evaluate(kinematics, 'ex_squat');
        expect(assessment.formScore).toBeLessThan(90);
        expect(assessment.detectedIssues.some(i => i.id === 'squat_depth_shallow')).toBe(true);
        expect(assessment.primaryCorrection).toContain('Descend until hip crease is level');
      });

      it('detects knee valgus collapse and forward torso lean', () => {
        const kinematics: BiomechanicalKinematics = {
          timestamp: Date.now(),
          angles: {},
          torsoAngleDegrees: 52, // excessive forward lean (> 45)
          kneeFlexionAvgDegrees: 90,
          hipFlexionAvgDegrees: 75,
          elbowFlexionAvgDegrees: 90,
          kneeValgusIndex: -0.15, // severe inward knee collapse (< -0.12)
        };

        const assessment = squatRules.evaluate(kinematics, 'ex_squat');
        expect(assessment.formScore).toBeLessThanOrEqual(60);
        expect(assessment.detectedIssues.some(i => i.id === 'squat_knee_valgus')).toBe(true);
        expect(assessment.detectedIssues.some(i => i.id === 'squat_excessive_lean')).toBe(true);
      });
    });

    describe('Bench Press Rules', () => {
      it('detects excessive elbow flare and unilateral pressing asymmetry', () => {
        const kinematics: BiomechanicalKinematics = {
          timestamp: Date.now(),
          angles: {
            left_shoulder: { joint: 'left_shoulder', degrees: 88, confidence: 0.9, pointA: 'a', vertexB: 'b', pointC: 'c' },
            right_shoulder: { joint: 'right_shoulder', degrees: 86, confidence: 0.9, pointA: 'a', vertexB: 'b', pointC: 'c' },
            left_elbow: { joint: 'left_elbow', degrees: 110, confidence: 0.9, pointA: 'a', vertexB: 'b', pointC: 'c' },
            right_elbow: { joint: 'right_elbow', degrees: 85, confidence: 0.9, pointA: 'a', vertexB: 'b', pointC: 'c' },
          },
          torsoAngleDegrees: 0,
          kneeFlexionAvgDegrees: 90,
          hipFlexionAvgDegrees: 90,
          elbowFlexionAvgDegrees: 90,
          kneeValgusIndex: 0,
        };

        const assessment = benchRules.evaluate(kinematics, 'ex_bench');
        expect(assessment.detectedIssues.some(i => i.id === 'bench_elbow_flare')).toBe(true);
        expect(assessment.detectedIssues.some(i => i.id === 'bench_asymmetry')).toBe(true);
        expect(assessment.formScore).toBeLessThanOrEqual(70);
      });
    });

    describe('Deadlift Rules', () => {
      it('detects spinal lumbar flexion and premature hip rise', () => {
        const kinematics: BiomechanicalKinematics = {
          timestamp: Date.now(),
          angles: {},
          torsoAngleDegrees: 68, // high torso lean
          kneeFlexionAvgDegrees: 150,
          hipFlexionAvgDegrees: 65, // diverged hip angle
          elbowFlexionAvgDegrees: 90,
          kneeValgusIndex: 0,
        };

        const assessment = deadliftRules.evaluate(kinematics, 'ex_deadlift');
        expect(assessment.detectedIssues.some(i => i.id === 'deadlift_lumbar_rounding')).toBe(true);
        expect(assessment.detectedIssues.some(i => i.id === 'deadlift_hip_shoot')).toBe(true);
        expect(assessment.rating).toBe('critical');
      });
    });
  });

  // ==========================================================================
  // 3. SERVICE LIFECYCLE & EVENTBUS STREAMING
  // ==========================================================================
  describe('3. FormAnalysisService Lifecycle & Event Streaming', () => {
    it('starts and stops vision analysis emitting lifecycle events', async () => {
      const startedHandler = vi.fn();
      const stoppedHandler = vi.fn();

      eventBus.subscribe('FORM_ANALYSIS_STARTED', startedHandler);
      eventBus.subscribe('FORM_ANALYSIS_STOPPED', stoppedHandler);

      await formService.startAnalysis();
      expect(startedHandler).toHaveBeenCalled();
      expect(mockVision.isAnalyzing()).toBe(true);

      await formService.stopAnalysis();
      expect(stoppedHandler).toHaveBeenCalled();
      expect(mockVision.isAnalyzing()).toBe(false);
    });

    it('processes frames and emits debounced FORM_ANALYSIS_UPDATED and FORM_WARNING_DETECTED', async () => {
      const updatedHandler = vi.fn();
      const warningHandler = vi.fn();

      eventBus.subscribe('FORM_ANALYSIS_UPDATED', updatedHandler);
      eventBus.subscribe('FORM_WARNING_DETECTED', warningHandler);

      formService.setCurrentExercise('ex_squat', 'Barbell Back Squat');

      // Create a problematic frame (knee collapse scenario from MockVisionProvider)
      const badFrame: PoseFrame = mockVision.generateSimulatedFrame('knee_valgus');

      const assessment = formService.processFrame(badFrame);
      expect(assessment).toBeDefined();

      // Verify event emission occurred
      expect(updatedHandler).toHaveBeenCalled();
      const updateData = updatedHandler.mock.calls[0][0];
      expect(updateData.exerciseId).toBe('ex_squat');

      expect(warningHandler).toHaveBeenCalled();
      const warnData = warningHandler.mock.calls[0][0];
      expect(warnData.issue).toBeDefined();
      expect(warnData.correctiveCue).toBeDefined();
    });
  });
});
