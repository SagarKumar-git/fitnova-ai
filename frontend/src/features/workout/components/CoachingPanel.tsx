/**
 * FitNova AI — CoachingPanel Component
 * Smart active workout AI panel providing live exercise guidance, set recommendations,
 * RPE targets, rest recommendations, and exercise completion debrief.
 */

import React from 'react';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { WorkoutSet } from '../models/WorkoutSet.ts';
import { NovaAvatar } from '../../../design-system/ai/NovaAvatar/index.tsx';
import type { NovaWorkoutState } from '../hooks/useNovaWorkoutCoach.ts';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Mic,
  Dumbbell,
  Timer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

import type { FormAssessment } from '../vision/models/FormAssessment.ts';
import type { AdaptiveRecommendationEvent } from '../intelligence/types/adaptiveTraining.ts';
import type { AdaptiveSafetyUiState } from '../hooks/useAdaptiveWorkout.ts';
import { HeartPulse, ShieldAlert, WifiOff } from 'lucide-react';

export interface CoachingPanelProps {
  currentExercise: WorkoutExercise;
  currentSet?: WorkoutSet;
  activeSetIndex?: number;
  novaState: NovaWorkoutState;
  coachMessage: string;
  coachSubMessage?: string;
  isExerciseCompleted?: boolean;
  onApplyRecommendation?: (weight: number, reps: number) => void;
  onTriggerVoice?: () => void;
  formAssessment?: FormAssessment | null;
  // Sprint 3.8 — Adaptive Recommendation Props
  adaptiveRecommendation?: AdaptiveRecommendationEvent | null;
  onApplyAdaptive?: () => void;
  onRejectAdaptive?: () => void;
  // Sprint 4.6 — Safety UI Props
  safetyState?: AdaptiveSafetyUiState;
  onOverrideSafety?: () => void;
  className?: string;
}

export const CoachingPanel: React.FC<CoachingPanelProps> = React.memo(({
  currentExercise,
  currentSet,
  activeSetIndex = 0,
  novaState,
  coachMessage,
  coachSubMessage,
  isExerciseCompleted = false,
  onApplyRecommendation,
  onTriggerVoice,
  formAssessment,
  adaptiveRecommendation,
  onApplyAdaptive,
  onRejectAdaptive,
  safetyState,
  onOverrideSafety,
  className = '',
}) => {
  // Compute contextual set recommendation
  const targetWeight = currentSet?.targetWeight ?? currentExercise.targetWeight ?? 0;
  const targetReps = currentSet?.targetReps ?? currentExercise.targetReps ?? 8;
  const recommendedRpe = 8.0;
  const recommendedRest = currentExercise.restSeconds || 90;

  // Derive live exercise guidance cues based on exercise name
  const formGuidance = React.useMemo(() => {
    const lower = currentExercise.exerciseName.toLowerCase();
    if (lower.includes('bench') || lower.includes('press')) {
      return {
        cue: 'Tuck shoulder blades back and down. Maintain slight arch and drive heels through floor.',
        tempo: '3-0-1-0 (3s eccentric, explosive press)',
        focus: 'Pectoral recruitment & sternal stability',
      };
    }
    if (lower.includes('squat')) {
      return {
        cue: 'Deep diaphragmatic breath at top, push knees outward over toes, hit parallel depth.',
        tempo: '3-1-1-0 (Controlled descent, pause in hole)',
        focus: 'Quad drive & hip extension',
      };
    }
    if (lower.includes('deadlift')) {
      return {
        cue: 'Take slack out of bar, wedge hips into position, drag bar along shins.',
        tempo: 'Explosive concentric, controlled reset',
        focus: 'Posterior chain & spinal rigidity',
      };
    }
    if (lower.includes('row') || lower.includes('pull')) {
      return {
        cue: 'Lead the movement with your elbows, pinch scaps together at peak contraction.',
        tempo: '2-1-2-0 (Squeeze 1s at top)',
        focus: 'Latissimus dorsi & rhomboid contraction',
      };
    }
    return {
      cue: 'Maintain locked core, control the eccentric tempo, and maintain joint alignment.',
      tempo: '2-0-1-0 (Controlled cadence)',
      focus: 'Target motor unit recruitment',
    };
  }, [currentExercise.exerciseName]);

  const getStateBadge = () => {
    switch (novaState) {
      case 'coaching':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-neonLime bg-neonLime/10 border border-neonLime/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Live Coaching
          </span>
        );
      case 'celebrating':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> Milestone Unlocked
          </span>
        );
      case 'warning':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            Exertion Warning
          </span>
        );
      case 'recovery':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            Rest Recovery
          </span>
        );
      case 'thinking':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            Analyzing Overload
          </span>
        );
      case 'listening':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            Listening...
          </span>
        );
      case 'intervention':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-white bg-red-600/80 border border-red-500/50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
            Safety Intervention
          </span>
        );
      case 'observing':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded-full flex items-center gap-1">
            Observing
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
            AI Active
          </span>
        );
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 shadow-lg backdrop-blur-md space-y-4 ${className}`}
    >
      {/* Top Bar: Nova Avatar + Live Speech */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <NovaAvatar size="md" state={novaState} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-white">Nova AI Coach</span>
              {getStateBadge()}
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
              {coachMessage}
            </p>
            {coachSubMessage && (
              <p className="text-[11px] text-zinc-400 mt-0.5 italic">
                {coachSubMessage}
              </p>
            )}
          </div>
        </div>

        {onTriggerVoice && (
          <button
            type="button"
            onClick={onTriggerVoice}
            aria-label="Voice coaching command"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
            title="Voice Coaching"
          >
            <Mic className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Sprint 4.6 Live Adaptive Safety Observability Banner */}
      {safetyState === 'stop_and_recover' && (
        <div className="bg-rose-950/70 border border-rose-600/80 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-[0_0_15px_rgba(225,29,72,0.25)]">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
            <div>
              <span className="font-black text-rose-400 text-xs uppercase tracking-wider block">
                Safety Intervention: Critical Zone
              </span>
              <p className="text-xs text-white font-semibold mt-0.5">
                Heart rate remains in the critical zone. Stop the exercise and recover.
              </p>
            </div>
          </div>
          {onOverrideSafety && (
            <button
              type="button"
              onClick={onOverrideSafety}
              aria-label="Override safety intervention"
              className="min-h-[36px] text-[10px] font-bold uppercase tracking-wider bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 px-3 py-1.5 rounded-lg shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
            >
              Override
            </button>
          )}
        </div>
      )}

      {safetyState === 'reduce_intensity' && (
        <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 flex items-start gap-2.5">
          <HeartPulse className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-400 block text-[10px] uppercase tracking-wider">
              Safety Recommendation
            </span>
            <p className="text-white font-medium">
              Heart rate remains elevated. Nova recommends reducing workout volume.
            </p>
          </div>
        </div>
      )}

      {safetyState === 'wearable_disconnected' && (
        <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 flex items-start gap-2.5">
          <WifiOff className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-zinc-300 block text-[10px] uppercase tracking-wider">
              Wearable Disconnected
            </span>
            <p className="text-zinc-300 font-medium">
              Heart-rate monitor disconnected. Adaptive safety monitoring is temporarily limited.
            </p>
          </div>
        </div>
      )}

      {safetyState === 'biometric_data_stale' && (
        <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 flex items-start gap-2.5">
          <HeartPulse className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-400 block text-[10px] uppercase tracking-wider">
              Biometric Data Stale
            </span>
            <p className="text-zinc-300 font-medium">
              Live biometric signals are aging. Progression decisions are safely held until fresh signals arrive.
            </p>
          </div>
        </div>
      )}

      {/* Live AI Form Assessment Banner */}
      {formAssessment && formAssessment.primaryCorrection && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-neonLime shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-400 block text-[10px] uppercase tracking-wider">
              AI Form Observation ({formAssessment.formScore}/100)
            </span>
            <p className="text-white font-medium">{formAssessment.primaryCorrection}</p>
          </div>
        </div>
      )}

      {/* Exercise Completion Feedback Banner */}
      {isExerciseCompleted ? (
        <div className="bg-neonLime/10 border border-neonLime/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neonLime text-black flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-black text-white block">
              {currentExercise.exerciseName} Completed!
            </span>
            <span className="text-[11px] text-zinc-300">
              Outstanding consistency across all working sets. Recover and proceed to the next movement.
            </span>
          </div>
        </div>
      ) : (
        /* Live Set Recommendation Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Target Recommendation Box */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5 text-neonLime" /> Set {activeSetIndex + 1} Target
              </span>
              <span className="text-[10px] font-bold text-neonLime bg-neonLime/10 px-1.5 py-0.5 rounded">
                Recommended
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="text-xl font-black text-white font-mono">
                  {targetWeight > 0 ? `${targetWeight} kg` : 'Bodyweight'}
                </span>
                <span className="text-xs text-zinc-400 font-semibold ml-1.5">
                  × {targetReps} reps
                </span>
              </div>
              <span className="text-xs font-bold text-amber-400 font-mono">
                @ RPE {recommendedRpe}
              </span>
            </div>

            {onApplyRecommendation && targetWeight > 0 && (
              <button
                type="button"
                onClick={() => onApplyRecommendation(targetWeight, targetReps)}
                className="mt-2 text-[11px] font-bold text-neonLime hover:underline flex items-center gap-1"
              >
                <span>Apply this target to current set</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Rest & Tempo Guidance Box */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-teal-400" /> Rest Target
                </span>
                <span className="text-xs font-black text-white font-mono">
                  {recommendedRest}s
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 line-clamp-2">
                <strong className="text-zinc-200">Form Cue:</strong> {formGuidance.cue}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800/60 mt-1">
              <span>Tempo: {formGuidance.tempo}</span>
              <span className="text-neonLime flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Overload Ready
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sprint 3.8 — Nova Adaptive Recommendation */}
      {adaptiveRecommendation && !adaptiveRecommendation.dismissed && !adaptiveRecommendation.accepted && (
        <div className="mt-4 bg-amber-950/40 border border-amber-900/60 rounded-xl p-3 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  Nova Adaptation
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-900/60 text-[9px] font-mono text-amber-400">
                  {Math.round(adaptiveRecommendation.confidenceScore * 100)}% CONFIDENCE
                </span>
              </div>
              <p className="text-sm font-medium text-amber-50 mb-1">
                Change {adaptiveRecommendation.exerciseName} to <span className="text-amber-400 font-bold">{adaptiveRecommendation.recommendedValue} {adaptiveRecommendation.unit}</span>
              </p>
              <p className="text-xs text-amber-200/80 mb-3 leading-relaxed">
                {adaptiveRecommendation.reason}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-2">
                {onApplyAdaptive && (
                  <button
                    type="button"
                    onClick={onApplyAdaptive}
                    aria-label={`Apply change: ${adaptiveRecommendation.exerciseName} to ${adaptiveRecommendation.recommendedValue} ${adaptiveRecommendation.unit}`}
                    className="w-full sm:flex-1 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                  >
                    Apply Change
                  </button>
                )}
                {onRejectAdaptive && (
                  <button
                    type="button"
                    onClick={onRejectAdaptive}
                    aria-label="Keep planned exercise target"
                    className="w-full sm:flex-1 min-h-[44px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold py-2 rounded-xl border border-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
                  >
                    Keep Planned
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
CoachingPanel.displayName = 'CoachingPanel';
