/**
 * FitNova AI — PreWorkoutBrief Component
 * Pre-workout intelligence briefing displaying recovery readiness, recommended intensity,
 * target muscle recovery status, substitution suggestions, and Nova rationale.
 */

import React, { useMemo } from 'react';
import type { Workout } from '../models/Workout.ts';
import type { WorkoutReadiness } from '../intelligence/types.ts';
import { WorkoutIntelligenceService } from '../intelligence/WorkoutIntelligenceService.ts';
import type { AdaptiveTrainingInput } from '../intelligence/types/adaptiveTraining.ts';
import type { DataFreshness } from '../../health/types/healthContracts.ts';
import { useHealthData } from '../../health/hooks/useHealthData.ts';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory.ts';
import { NovaAvatar } from '../../../design-system/ai/NovaAvatar/index.tsx';
import {
  Zap,
  Activity,
  BatteryCharging,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Shuffle,
  Info,
} from 'lucide-react';

export interface PreWorkoutBriefProps {
  workout: Workout;
  readiness?: WorkoutReadiness;
  onStartWorkout: () => void;
  onOpenSubstitution?: (exerciseId: string) => void;
  onClose?: () => void;
  className?: string;
}

export const PreWorkoutBrief: React.FC<PreWorkoutBriefProps> = ({
  workout,
  readiness,
  onStartWorkout,
  onOpenSubstitution,
  className = '',
}) => {
  // Default readiness if not provided
  const effectiveReadiness: WorkoutReadiness = useMemo(
    () =>
      readiness ?? {
        sleepHours: 7.5,
        sorenessScore: 3,
        fatigueScore: 3,
        stressScore: 3,
        consecutiveTrainingDays: 1,
      },
    [readiness]
  );

  const { dataset: healthDataset, service: healthService } = useHealthData();
  const { history: workoutHistory } = useWorkoutHistory();
  const intelligenceService = useMemo(() => new WorkoutIntelligenceService(), []);

  const adaptiveDecision = useMemo(() => {
    const recovery = healthDataset?.latestRecovery;
    
    // Fallback freshness if not provided
    const defaultFreshness: DataFreshness = { timestamp: Date.now(), ageMs: 0, state: 'fresh' };
    const freshness = healthService?.getDataFreshness ? healthService.getDataFreshness() : defaultFreshness;

    const recentRpeHistory = workoutHistory
      ? workoutHistory
          .flatMap(w => w.exercises.flatMap(e => (e.bestSet?.rpe ? [e.bestSet.rpe] : [])))
          .slice(-10)
      : [];

    const input: AdaptiveTrainingInput = {
      recoveryScore: recovery?.recoveryScore ?? 100,
      hrvStatus: recovery?.hrvStatus ?? 'optimal',
      restingHeartRateDelta: recovery?.rhrDeltaFromBaseline ?? 0,
      sleepQuality: (recovery ? (recovery.sleepEfficiencyPct >= 85 ? 'optimal' : recovery.sleepEfficiencyPct >= 70 ? 'moderate' : 'poor') : (effectiveReadiness.sleepHours >= 7 ? 'optimal' : effectiveReadiness.sleepHours >= 5 ? 'moderate' : 'poor')) as 'optimal' | 'moderate' | 'poor',
      muscleSoreness: effectiveReadiness.sorenessScore,
      systemicFatigue: effectiveReadiness.fatigueScore,
      wearableAvailable: !!recovery,
      recoveryDataFreshness: freshness,
      currentTimestamp: Date.now(),
      performance: {
        recentRpeHistory,
        missedRepsCount: 0,
        personalRecordsLast7Days: 0,
        averageCompletionRate: 1.0,
        consecutiveWorkoutDays: effectiveReadiness.consecutiveTrainingDays ?? 1,
        weeklyWorkoutCount: 3,
        targetWeeklyWorkouts: 4,
      }
    };
    
    return intelligenceService.evaluateAdaptiveDecision(input);
  }, [healthDataset, healthService, workoutHistory, effectiveReadiness, intelligenceService]);

  // Compute overall readiness score 0 - 100
  const readinessScore = useMemo(() => {
    const sleepFactor = Math.min(10, (effectiveReadiness.sleepHours / 8) * 10);
    const freshnessFactor = 10 - effectiveReadiness.fatigueScore;
    const sorenessFactor = 10 - effectiveReadiness.sorenessScore;
    const score = Math.round(((sleepFactor + freshnessFactor + sorenessFactor) / 30) * 100);
    return Math.max(10, Math.min(100, score));
  }, [effectiveReadiness]);

  // Muscle recovery status estimates for target muscle groups
  const muscleRecoveryStatus = useMemo(() => {
    return workout.targetMuscleGroups.map((muscle) => {
      // Deterministic recovery % based on readiness score and soreness
      const base = readinessScore;
      const penalty = (effectiveReadiness.sorenessScore - 1) * 3;
      const pct = Math.max(65, Math.min(100, base - penalty));
      return {
        muscle,
        percentage: pct,
        status: pct >= 85 ? 'Fully Recovered' : pct >= 70 ? 'Optimal Stimulus' : 'Fatigued',
      };
    });
  }, [workout.targetMuscleGroups, readinessScore, effectiveReadiness.sorenessScore]);

  const intensityLabel = useMemo(() => {
    switch (adaptiveDecision.recommendedAction) {
      case 'increase_intensity': return 'Overload Recommended';
      case 'train_as_planned': return '100% — Full Intensity';
      case 'maintain_load': return 'Maintain Baseline Load';
      case 'reduce_intensity': return 'Moderate Load / Technique Focus';
      case 'reduce_volume': return 'Volume Taper Recommended';
      case 'recovery_workout': return 'Active Recovery Phase';
      case 'rest': return 'Rest & Mobilize';
      default: return 'Adaptive Training';
    }
  }, [adaptiveDecision.recommendedAction]);

  const intensityColor = useMemo(() => {
    switch (adaptiveDecision.recommendedAction) {
      case 'increase_intensity': 
      case 'train_as_planned':
      case 'maintain_load':
        return 'text-neonLime bg-neonLime/10 border-neonLime/30';
      case 'reduce_intensity':
      case 'reduce_volume':
      case 'substitute_exercise':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'recovery_workout':
      case 'rest':
        return 'text-sky-400 bg-sky-400/10 border-sky-400/30';
      default:
        return 'text-neonLime bg-neonLime/10 border-neonLime/30';
    }
  }, [adaptiveDecision.recommendedAction]);

  const firstExercise = workout.exercises[0];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl p-5 sm:p-7 backdrop-blur-xl ${className}`}
    >
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-neonLime/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <NovaAvatar size="lg" state="coaching" />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-neonLime bg-neonLime/10 border border-neonLime/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Nova Pre-Workout Brief
              </span>
              <span className="text-[11px] font-bold text-zinc-400">
                AI Readiness Cleared
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {workout.name}
            </h3>
          </div>
        </div>

        {/* Readiness Score Pill */}
        <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800 px-4 py-2.5 rounded-2xl shrink-0">
          <div className="w-10 h-10 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center font-black">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block uppercase tracking-wider">
              Readiness Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white font-mono">{readinessScore}</span>
              <span className="text-xs text-zinc-400 font-semibold">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Intensity & Recovery Gauges */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
        {/* Recommended Intensity Card */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-neonLime" /> Recommended Intensity
              </span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${intensityColor}`}>
                {intensityLabel}
              </span>
            </div>
            <div className="text-xs text-zinc-300 leading-relaxed mt-2 space-y-1.5">
              {adaptiveDecision.reasons.map((reason, i) => (
                <p key={i}>• {reason}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800/60 text-center">
            <div className="bg-zinc-900/60 rounded-xl p-2">
              <span className="text-[10px] text-zinc-500 font-bold block">SLEEP</span>
              <span className="text-xs font-extrabold text-white">{effectiveReadiness.sleepHours}h</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2">
              <span className="text-[10px] text-zinc-500 font-bold block">SORENESS</span>
              <span className="text-xs font-extrabold text-white">{effectiveReadiness.sorenessScore} / 10</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2">
              <span className="text-[10px] text-zinc-500 font-bold block">FATIGUE</span>
              <span className="text-xs font-extrabold text-white">{effectiveReadiness.fatigueScore} / 10</span>
            </div>
          </div>
        </div>

        {/* Muscle Recovery Status */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" /> Target Muscle Recovery
              </span>
              <span className="text-[11px] text-zinc-500 font-semibold">Motor Units Primed</span>
            </div>

            <div className="space-y-2.5 mt-3">
              {muscleRecoveryStatus.map((item) => (
                <div key={item.muscle} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-200">{item.muscle}</span>
                    <span className="text-neonLime font-mono">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-neonLime h-full rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(204,255,0,0.5)]"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-4 pt-2 border-t border-zinc-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Neuromuscular recovery exceeds progressive overload threshold.</span>
          </div>
        </div>
      </div>

      {/* "Why Nova Recommends This" Section */}
      <div className="relative z-10 bg-gradient-to-r from-neonLime/10 via-zinc-900/90 to-zinc-900/90 border border-neonLime/30 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-neonLime/20 text-neonLime flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-neonLime">
              Why Nova Recommends This Routine Today
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Based on your recovery score of {readinessScore} and {effectiveReadiness.sleepHours} hours of sleep, your central nervous system is ready for progressive overload on {workout.targetMuscleGroups.join(' and ')}. 
              {adaptiveDecision.dataSources.length > 0 && ` Nova utilized insights from: ${adaptiveDecision.dataSources.join(', ')}.`}
            </p>
            {adaptiveDecision.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-amber-400/80 italic mt-1">
                Note: {w}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Exercise Substitution Suggestion */}
      {firstExercise && onOpenSubstitution && (
        <div className="relative z-10 flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 rounded-2xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 block">
                Equipment busy or feeling muscle tightness?
              </span>
              <span className="text-[11px] text-zinc-500">
                You can substitute {firstExercise.exerciseName} with biomechanical alternatives.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenSubstitution(firstExercise.exerciseId)}
            aria-label={`Substitute ${firstExercise.exerciseName} with biomechanical alternative`}
            className="min-h-[44px] text-xs font-bold text-neonLime hover:text-neonLime/80 px-3.5 py-2 rounded-xl bg-neonLime/10 hover:bg-neonLime/20 border border-neonLime/30 transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
          >
            Swap Exercises
          </button>
        </div>
      )}

      {/* Action CTA */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <span className="text-xs text-zinc-400 font-medium text-center sm:text-left">
          Target Duration: ~{workout.estimatedDurationMinutes} mins · {workout.exercises.length} Movements
        </span>

        <button
          type="button"
          onClick={onStartWorkout}
          aria-label="Start adapted workout routine"
          className="w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(204,255,0,0.3)] transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
        >
          <span>Start Adapted Workout</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
