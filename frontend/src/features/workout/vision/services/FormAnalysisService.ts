/**
 * FitNova AI — Form Analysis Service
 * Coordinates real-time pose frames, kinematic angle computation,
 * exercise-specific biomechanical rule sets, and debounced EventBus notifications.
 * Pure TypeScript. Zero UI/React dependencies.
 */

import type { VisionProvider } from '../providers/VisionProvider.ts';
import { MockVisionProvider } from '../providers/MockVisionProvider.ts';
import type { PoseFrame } from '../models/PoseLandmark.ts';
import type { FormAssessment, FormIssue } from '../models/FormAssessment.ts';
import type { EventBus } from '../../../../platform/events/EventBus.ts';
import type { AnalyticsService } from '../../../../platform/analytics/AnalyticsService.ts';
import { PoseAnalysisService } from './PoseAnalysisService.ts';
import { SquatFormRules } from '../rules/SquatFormRules.ts';
import { BenchPressFormRules } from '../rules/BenchPressFormRules.ts';
import { DeadliftFormRules } from '../rules/DeadliftFormRules.ts';

export interface FormAnalysisServiceConfig {
  provider?: VisionProvider;
  eventBus?: EventBus;
  analytics?: AnalyticsService;
  debounceMs?: number; // Defaults to 600ms to avoid overwhelming feedback
}

export class FormAnalysisService {
  private provider: VisionProvider;
  private readonly eventBus?: EventBus;
  private readonly analytics?: AnalyticsService;
  private readonly poseAnalysis: PoseAnalysisService;
  private readonly squatRules = new SquatFormRules();
  private readonly benchRules = new BenchPressFormRules();
  private readonly deadliftRules = new DeadliftFormRules();

  private currentExerciseId: string = 'ex_squat';
  private currentExerciseName: string = 'Squat';
  private latestAssessment: FormAssessment | null = null;
  private lastEmittedAt: number = 0;
  private lastWarningIssueId: string | null = null;
  private unsubscribeFrame?: () => void;
  private readonly debounceMs: number;

  constructor(config: FormAnalysisServiceConfig = {}) {
    this.provider = config.provider ?? new MockVisionProvider();
    this.eventBus = config.eventBus;
    this.analytics = config.analytics;
    this.poseAnalysis = new PoseAnalysisService();
    this.debounceMs = config.debounceMs ?? 600;
  }

  setProvider(provider: VisionProvider): void {
    this.provider = provider;
  }

  setCurrentExercise(exerciseId: string, exerciseName: string): void {
    this.currentExerciseId = exerciseId;
    this.currentExerciseName = exerciseName;
  }

  getLatestAssessment(): FormAssessment | null {
    return this.latestAssessment;
  }

  async startAnalysis(videoElement?: HTMLVideoElement): Promise<void> {
    await this.provider.startCamera(videoElement);

    if (this.eventBus) {
      this.eventBus.emit('FORM_ANALYSIS_STARTED', {
        exerciseId: this.currentExerciseId,
        exerciseName: this.currentExerciseName,
        timestamp: Date.now(),
      });
    }

    if (this.analytics) {
      this.analytics.track('FORM_ANALYSIS_STARTED', {
        exerciseId: this.currentExerciseId,
        exerciseName: this.currentExerciseName,
      });
    }

    this.unsubscribeFrame = this.provider.onFrame((frame) => {
      this.processFrame(frame);
    });
  }

  async stopAnalysis(): Promise<void> {
    if (this.unsubscribeFrame) {
      this.unsubscribeFrame();
      this.unsubscribeFrame = undefined;
    }
    await this.provider.stopCamera();

    if (this.eventBus) {
      this.eventBus.emit('FORM_ANALYSIS_STOPPED', {
        exerciseId: this.currentExerciseId,
        exerciseName: this.currentExerciseName,
        averageFormScore: this.latestAssessment?.formScore ?? 90,
        timestamp: Date.now(),
      });
    }

    if (this.analytics) {
      this.analytics.track('FORM_ANALYSIS_STOPPED', {
        exerciseId: this.currentExerciseId,
        averageFormScore: this.latestAssessment?.formScore ?? 90,
      });
    }
  }

  /**
   * Evaluates a single pose frame and returns the immediate assessment.
   */
  processFrame(frame: PoseFrame): FormAssessment {
    const kinematics = this.poseAnalysis.computeKinematics(frame);
    const exNameLower = this.currentExerciseName.toLowerCase();

    let assessment: FormAssessment;

    if (exNameLower.includes('bench') || exNameLower.includes('press')) {
      assessment = this.benchRules.evaluate(kinematics, this.currentExerciseId);
    } else if (exNameLower.includes('deadlift') || exNameLower.includes('hinge')) {
      assessment = this.deadliftRules.evaluate(kinematics, this.currentExerciseId);
    } else {
      // Default to Squat rules
      assessment = this.squatRules.evaluate(kinematics, this.currentExerciseId);
    }

    this.latestAssessment = assessment;
    this.handleEventEmission(assessment);

    return assessment;
  }

  private handleEventEmission(assessment: FormAssessment): void {
    const now = Date.now();
    if (now - this.lastEmittedAt < this.debounceMs) {
      return;
    }

    this.lastEmittedAt = now;

    if (this.eventBus) {
      this.eventBus.emit('FORM_ANALYSIS_UPDATED', {
        exerciseId: assessment.exerciseId,
        exerciseName: assessment.exerciseName,
        formScore: assessment.formScore,
        confidence: assessment.confidence,
        detectedIssuesCount: assessment.detectedIssues.length,
        primaryCorrection: assessment.primaryCorrection ?? undefined,
        timestamp: now,
      });

      // Emit high-priority warning only if a new issue arises or severity is high
      if (assessment.detectedIssues.length > 0) {
        const topIssue: FormIssue = assessment.detectedIssues[0];
        if (topIssue.id !== this.lastWarningIssueId || topIssue.severity === 'high') {
          this.lastWarningIssueId = topIssue.id;
          this.eventBus.emit('FORM_WARNING_DETECTED', {
            exerciseId: assessment.exerciseId,
            exerciseName: assessment.exerciseName,
            issue: topIssue.name,
            severity: topIssue.severity,
            correctiveCue: topIssue.correctiveCue,
            timestamp: now,
          });

          if (this.analytics) {
            this.analytics.track('FORM_WARNING_DETECTED', {
              exerciseId: assessment.exerciseId,
              issue: topIssue.name,
              severity: topIssue.severity,
            });
          }
        }
      } else {
        this.lastWarningIssueId = null;
      }
    }
  }
}
