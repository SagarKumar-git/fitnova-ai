/**
 * FitNova AI — ActiveWorkout Page
 * Core live execution mode orchestrating live timer, set completion, steppers,
 * rest countdown timer, PR celebration banner, and post-session summary modal.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../state/WorkoutContext.tsx';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import type { Exercise } from '../models/Exercise.ts';
import { WorkoutHeader } from '../components/WorkoutHeader.tsx';
import { WorkoutProgress } from '../components/WorkoutProgress.tsx';
import { SetRow } from '../components/SetRow.tsx';
import { RestTimer } from '../components/RestTimer.tsx';
import { WorkoutControls } from '../components/WorkoutControls.tsx';
import { WorkoutEmptyState } from '../components/WorkoutEmptyState.tsx';
import { CoachingPanel } from '../components/CoachingPanel.tsx';
import { ProgressionSuggestion } from '../components/ProgressionSuggestion.tsx';

// Lazy-loaded heavy modal components
const SessionSummary = React.lazy(() =>
  import('../components/SessionSummary.tsx').then((m) => ({ default: m.SessionSummary }))
);
const PRCelebration = React.lazy(() =>
  import('../components/PRCelebration.tsx').then((m) => ({ default: m.PRCelebration }))
);
const SubstituteExerciseDialog = React.lazy(() =>
  import('../components/SubstituteExerciseDialog.tsx').then((m) => ({
    default: m.SubstituteExerciseDialog,
  }))
);
import { SyncStatusBadge } from '../components/SyncStatusBadge.tsx';
import type { WorkoutSyncState } from '../components/SyncStatusBadge.tsx';
import { useNovaWorkoutCoach } from '../hooks/useNovaWorkoutCoach.ts';
import { useAdaptiveWorkout } from '../hooks/useAdaptiveWorkout.ts';
import { ProgressionEngine } from '../intelligence/ProgressionEngine.ts';
import type { ProgressionRecommendation } from '../intelligence/types.ts';
import { FormFeedbackCard } from '../components/FormFeedbackCard.tsx';
import { useFormAnalysis } from '../vision/hooks/useFormAnalysis.ts';
import { CheckCircle2, Shuffle, RotateCcw, AlertCircle, X } from 'lucide-react';

export const ActiveWorkout: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSession,
    isLoading,
    completeSet,
    skipSet,
    substituteExercise,
    finishWorkout,
    isRestTimerActive,
    service,
    setCurrentExerciseProgress,
  } = useWorkout();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [exercisesMap, setExercisesMap] = useState<Map<string, Exercise>>(new Map());
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [latestPR, setLatestPR] = useState<PersonalRecord | null>(null);
  const [seenPRCount, setSeenPRCount] = useState<number>(0);
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState<boolean>(false);
  const [dismissedProgressionForExId, setDismissedProgressionForExId] = useState<string | null>(null);
  const [appliedProgressionOverride, setAppliedProgressionOverride] = useState<{
    weight: number;
    reps: number;
  } | null>(null);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState<boolean>(false);
  const [dismissedRecoveryBanner, setDismissedRecoveryBanner] = useState<boolean>(false);
  const [pendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncFailed, setSyncFailed] = useState<boolean>(false);

  // Nova Real-Time Workout Coach Hook
  const {
    state: novaState,
    message: coachMessage,
    subMessage: coachSubMessage,
    triggerListening,
  } = useNovaWorkoutCoach({ isResting: isRestTimerActive });

  // Sprint 3.8 & 4.6 — Real-Time Adaptive Workout & Safety Hook
  const {
    currentRecommendation: adaptiveRecommendation,
    acceptRecommendation: acceptAdaptiveRecommendation,
    rejectRecommendation: rejectAdaptiveRecommendation,
    currentHeartRate,
    safetyState,
    overrideIntervention,
  } = useAdaptiveWorkout({ sessionId: activeSession?.id });

  // Sprint 3.7 AI Computer Vision Form Tracking
  const {
    isAnalyzing: isVisionAnalyzing,
    permissionStatus: visionPermissionStatus,
    assessment: visionAssessment,
    toggleAnalysis: toggleVisionAnalysis,
  } = useFormAnalysis({
    exerciseId: activeSession?.exercises[activeExerciseIndex]?.exerciseId,
    exerciseName: activeSession?.exercises[activeExerciseIndex]?.exerciseName,
  });

  // Derive effective NovaAvatar state reacting to safety interventions and vision analysis
  const effectiveNovaState = useMemo(() => {
    if (safetyState === 'stop_and_recover') return 'intervention';
    if (safetyState === 'reduce_intensity') return 'warning';
    if (!isVisionAnalyzing || !visionAssessment) return novaState;
    if (visionAssessment.detectedIssues.some((i) => i.severity === 'high' || i.severity === 'moderate')) {
      return 'warning';
    }
    if (visionAssessment.formScore >= 95) {
      return 'celebrating';
    }
    if (visionAssessment.confidence < 0.6) {
      return 'thinking';
    }
    return novaState;
  }, [safetyState, isVisionAnalyzing, visionAssessment, novaState]);

  const progressionEngine = useMemo(() => new ProgressionEngine(), []);

  // Sync exercises metadata
  useEffect(() => {
    let mounted = true;
    service
      .getExercises()
      .then((list) => {
        if (mounted) {
          setAllExercises(list);
          const map = new Map<string, Exercise>();
          for (const item of list) {
            map.set(item.id, item);
          }
          setExercisesMap(map);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [service]);

  // Network connectivity listener for SyncStatusBadge
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setSyncFailed(false); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Derive sync state for badge
  const workoutSyncState: WorkoutSyncState = useMemo(() => {
    if (syncFailed) return 'sync_failed';
    if (activeSession?.status === 'recovered') return 'recovered';
    if (activeSession?.status === 'syncing') return 'syncing';
    if (!isOnline) return 'offline';
    return 'online';
  }, [isOnline, syncFailed, activeSession?.status]);

  const handleSyncRetry = useCallback(async () => {
    try {
      setSyncFailed(false);
      await service.syncPendingOperations();
    } catch {
      setSyncFailed(true);
    }
  }, [service]);

  // Keep activeExerciseIndex in bounds
  useEffect(() => {
    if (activeSession && activeExerciseIndex >= activeSession.exercises.length) {
      setActiveExerciseIndex(Math.max(0, activeSession.exercises.length - 1));
    }
  }, [activeSession, activeExerciseIndex]);

  // Detect newly added PRs to trigger celebration
  useEffect(() => {
    if (!activeSession) return;
    const currentPRs = activeSession.personalRecords || [];
    if (currentPRs.length > seenPRCount) {
      const newest = currentPRs[currentPRs.length - 1];
      setLatestPR(newest);
      setSeenPRCount(currentPRs.length);
    }
  }, [activeSession, seenPRCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-neonLime border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            Loading Live Session...
          </span>
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-zinc-950 text-slate-100 flex items-center justify-center p-4">
        <WorkoutEmptyState
          title="No Active Workout Session"
          description="You don't currently have an active workout in progress. Choose a routine from the Training Center to begin logging sets."
          actionLabel="Choose a Routine"
          onAction={() => navigate('/workouts')}
        />
      </div>
    );
  }

  const currentExercise = activeSession.exercises[activeExerciseIndex];
  const exerciseDetail = currentExercise
    ? exercisesMap.get(currentExercise.exerciseId)
    : undefined;

  const hasPreviousExercise = activeExerciseIndex > 0;
  const hasNextExercise = activeExerciseIndex < activeSession.exercises.length - 1;

  const activeSetIdx = currentExercise?.sets.findIndex((s) => !s.completed && !s.skipped);
  const activeSetIndex = activeSetIdx !== undefined && activeSetIdx >= 0 ? activeSetIdx : 0;
  const currentSet = currentExercise?.sets[activeSetIndex];
  const isExerciseCompleted = currentExercise
    ? currentExercise.sets.length > 0 && currentExercise.sets.every((s) => s.completed || s.skipped)
    : false;

  // Last completed set in session for RestTimer and overload
  const allCompletedSets = activeSession.exercises.flatMap((e) =>
    e.sets.filter((s) => s.completed)
  );
  const lastCompletedSet =
    allCompletedSets.length > 0 ? allCompletedSets[allCompletedSets.length - 1] : undefined;

  // Progressive overload recommendation
  const progressionRecommendation: ProgressionRecommendation | null = useMemo(() => {
    if (!currentExercise) return null;
    const completedSets = currentExercise.sets.filter((s) => s.completed && !s.skipped);
    const prevWeight = currentExercise.targetWeight ?? (completedSets[0]?.actualWeight ?? 60);
    const prevReps = currentExercise.targetReps ?? (completedSets[0]?.actualReps ?? 8);
    const lastRpe = completedSets[completedSets.length - 1]?.rpe ?? 8.0;

    return progressionEngine.calculateProgression({
      exerciseId: currentExercise.exerciseId,
      exerciseName: currentExercise.exerciseName,
      previousWeightKg: prevWeight,
      previousReps: prevReps,
      targetReps: currentExercise.targetReps,
      completedSets,
      lastRpe,
      isCompound: true,
    });
  }, [currentExercise, progressionEngine]);

  const showProgressionCard =
    Boolean(progressionRecommendation) &&
    dismissedProgressionForExId !== currentExercise?.exerciseId &&
    (progressionRecommendation?.action === 'weight_increase' ||
      progressionRecommendation?.action === 'rep_increase');

  const handleAcceptProgression = (recommendedWeight: number, recommendedReps: number) => {
    setAppliedProgressionOverride({ weight: recommendedWeight, reps: recommendedReps });
    if (currentSet) {
      currentSet.targetWeight = recommendedWeight;
      currentSet.targetReps = recommendedReps;
    }
    setDismissedProgressionForExId(currentExercise?.exerciseId ?? null);
  };

  const handleNextExercise = () => {
    if (hasNextExercise) {
      const nextIdx = activeExerciseIndex + 1;
      setActiveExerciseIndex(nextIdx);
      setCurrentExerciseProgress(nextIdx).catch(() => {});
    }
  };

  const handlePreviousExercise = () => {
    if (hasPreviousExercise) {
      const prevIdx = activeExerciseIndex - 1;
      setActiveExerciseIndex(prevIdx);
      setCurrentExerciseProgress(prevIdx).catch(() => {});
    }
  };

  const handleFinishClick = () => {
    if (isFinishing) return;
    const hasIncompleteSets = activeSession.exercises.some((e) =>
      e.sets.some((s) => !s.completed && !s.skipped)
    );
    if (hasIncompleteSets) {
      setShowIncompleteConfirm(true);
    } else {
      setShowSummary(true);
    }
  };

  const handleDoneSummary = async (notes?: string, rating?: number) => {
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      await finishWorkout(notes, rating);
      navigate('/workouts/history');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 flex flex-col pb-32">
      {/* Sticky Active Workout Header */}
      <WorkoutHeader
        session={activeSession}
        onFinish={handleFinishClick}
        isFinishing={isFinishing}
        heartRate={currentHeartRate}
        safetyState={safetyState}
      />

      {/* Sync & Network Status Badge */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-2">
        <SyncStatusBadge
          syncState={workoutSyncState}
          pendingCount={pendingSyncCount}
          onRetry={handleSyncRetry}
        />
      </div>

      {/* PR Celebration Banner */}
      {latestPR && (
        <React.Suspense fallback={null}>
          <PRCelebration record={latestPR} onDismiss={() => setLatestPR(null)} />
        </React.Suspense>
      )}

      {/* Main Active Workout View */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Recovery State Banner */}
        {activeSession.status === 'recovered' && !dismissedRecoveryBanner && (
          <div className="bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Session Recovered
                </h4>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Session recovered from device storage. You can continue logging sets or finish your workout.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedRecoveryBanner(true)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Progress Bar */}
        <WorkoutProgress
          exercises={activeSession.exercises}
          totalVolumeKg={activeSession.totalVolume}
        />

        {/* AI Vision Form Feedback HUD (Sprint 3.7) */}
        {currentExercise && (
          <FormFeedbackCard
            assessment={visionAssessment}
            isAnalyzing={isVisionAnalyzing}
            permissionStatus={visionPermissionStatus}
            onToggleCamera={toggleVisionAnalysis}
            isCompact={true}
          />
        )}

        {/* AI Coaching Panel */}
        {currentExercise && (
          <CoachingPanel
            currentExercise={currentExercise}
            currentSet={currentSet}
            activeSetIndex={activeSetIndex}
            novaState={effectiveNovaState}
            coachMessage={coachMessage}
            coachSubMessage={coachSubMessage}
            isExerciseCompleted={isExerciseCompleted}
            onApplyRecommendation={handleAcceptProgression}
            onTriggerVoice={triggerListening}
            formAssessment={visionAssessment}
            adaptiveRecommendation={adaptiveRecommendation}
            safetyState={safetyState}
            onOverrideSafety={overrideIntervention}
            onApplyAdaptive={() => {
              if (adaptiveRecommendation && (adaptiveRecommendation.type === 'reduce_weight' || adaptiveRecommendation.type === 'increase_weight')) {
                handleAcceptProgression(adaptiveRecommendation.recommendedValue, currentExercise.targetReps ?? 8);
              }
              acceptAdaptiveRecommendation();
            }}
            onRejectAdaptive={rejectAdaptiveRecommendation}
          />
        )}

        {/* Progressive Overload Suggestion */}
        {showProgressionCard && progressionRecommendation && currentExercise && (
          <ProgressionSuggestion
            exerciseName={currentExercise.exerciseName}
            previousPerformance={{
              weight: currentExercise.targetWeight ?? 80,
              reps: currentExercise.targetReps ?? 8,
              rpe: 8.0,
            }}
            currentPerformance={{
              weight:
                appliedProgressionOverride?.weight ?? (currentExercise.targetWeight ?? 80),
              reps:
                appliedProgressionOverride?.reps ?? (currentExercise.targetReps ?? 8),
              rpe: lastCompletedSet?.rpe ?? 8.0,
            }}
            recommendation={progressionRecommendation}
            onAccept={handleAcceptProgression}
            onDismiss={() => setDismissedProgressionForExId(currentExercise.exerciseId)}
          />
        )}

        {/* Exercise Switcher Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {activeSession.exercises.map((ex, idx) => {
            const isSelected = idx === activeExerciseIndex;
            const isCompleted =
              ex.sets.length > 0 && ex.sets.every((s) => s.completed || s.skipped);

            return (
              <button
                key={ex.id || idx}
                type="button"
                onClick={() => {
                  setActiveExerciseIndex(idx);
                  setCurrentExerciseProgress(idx).catch(() => {});
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-neonLime text-white shadow-[0_0_12px_rgba(204,255,0,0.15)] ring-1 ring-neonLime/40'
                    : isCompleted
                    ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 opacity-70'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isCompleted
                      ? 'bg-neonLime text-black'
                      : isSelected
                      ? 'bg-neonLime/20 text-neonLime'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span>{ex.exerciseName}</span>
              </button>
            );
          })}
        </div>

        {/* Current Active Exercise Card */}
        {currentExercise && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
            {/* Header of the Active Exercise */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11px] font-extrabold text-neonLime bg-neonLime/10 border border-neonLime/30 px-2 py-0.5 rounded">
                    Exercise {activeExerciseIndex + 1} of {activeSession.exercises.length}
                  </span>
                  {exerciseDetail?.primaryMuscleGroup && (
                    <span className="text-[11px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                      {exerciseDetail.primaryMuscleGroup}
                    </span>
                  )}
                  {exerciseDetail?.equipment && (
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">
                      {exerciseDetail.equipment}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {currentExercise.exerciseName}
                  </h3>

                  <button
                    type="button"
                    onClick={() => setIsSubstituteModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-neonLime bg-zinc-800 hover:bg-zinc-700/80 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition-colors"
                    title="Substitute with alternative exercise"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Substitute</span>
                  </button>
                </div>

                {currentExercise.notes && (
                  <p className="text-xs text-zinc-400 mt-1 italic">
                    Note: {currentExercise.notes}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-zinc-500 font-semibold block">Target</span>
                <span className="text-sm font-extrabold text-white">
                  {currentExercise.targetSets} Sets × {currentExercise.targetReps} Reps
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  Rest: {currentExercise.restSeconds}s
                </span>
              </div>
            </div>

            {/* Set Rows Section */}
            <div className="space-y-2.5">
              <div className="hidden sm:flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-wider px-3">
                <span className="w-28">Set / Previous</span>
                <span className="flex-1 text-center">Weight & Reps</span>
                <span className="w-24 text-right">Log Status</span>
              </div>

              {currentExercise.sets.map((set, setIdx) => {
                const isCurrentSet =
                  !set.completed &&
                  !set.skipped &&
                  currentExercise.sets.slice(0, setIdx).every((s) => s.completed || s.skipped);

                return (
                  <SetRow
                    key={set.id || `${currentExercise.exerciseId}-set-${setIdx}`}
                    set={set}
                    exerciseId={currentExercise.exerciseId}
                    isCurrent={isCurrentSet}
                    onComplete={(reps, weight, rpe) =>
                      completeSet(currentExercise.exerciseId, set.id, reps, weight, rpe)
                    }
                    onSkip={() => skipSet(currentExercise.exerciseId, set.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Workout Navigation Controls */}
        <WorkoutControls
          hasPreviousExercise={hasPreviousExercise}
          hasNextExercise={hasNextExercise}
          onPreviousExercise={handlePreviousExercise}
          onNextExercise={handleNextExercise}
          onFinishWorkout={handleFinishClick}
          allExercisesCompleted={activeSession.exercises.every(
            (e) => e.sets.length > 0 && e.sets.every((s) => s.completed || s.skipped)
          )}
        />
      </main>

      {/* Floating Rest Timer Widget with AI RPE Intelligence */}
      <RestTimer
        lastRpe={lastCompletedSet?.rpe}
        exerciseName={currentExercise?.exerciseName}
        isCompound={true}
      />

      {/* Exercise Substitution Dialog */}
      {currentExercise && isSubstituteModalOpen && (
        <React.Suspense fallback={null}>
          <SubstituteExerciseDialog
            isOpen={isSubstituteModalOpen}
            onClose={() => setIsSubstituteModalOpen(false)}
            originalExercise={
              exerciseDetail ?? {
                id: currentExercise.exerciseId,
                name: currentExercise.exerciseName,
                description: 'Targeted strength movement.',
                primaryMuscleGroup: 'Full Body',
                secondaryMuscleGroups: [],
                equipment: 'Barbell',
                difficulty: 'Intermediate',
                instructions: [],
                tips: [],
                defaultRestSeconds: currentExercise.restSeconds,
                isCustom: false,
              }
            }
            allExercises={allExercises}
            onConfirmSubstitute={async (sub) => {
              await substituteExercise(currentExercise.exerciseId, sub);
            }}
          />
        </React.Suspense>
      )}

      {/* Post-Session Summary Dialog */}
      {showSummary && (
        <React.Suspense fallback={null}>
          <SessionSummary
            session={activeSession}
            onDone={handleDoneSummary}
            onClose={() => setShowSummary(false)}
          />
        </React.Suspense>
      )}

      {/* Incomplete Sets Warning Modal */}
      {showIncompleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">Unfinished Sets Remaining</h3>
              <p className="text-xs text-zinc-400 mt-1.5">
                You still have uncompleted sets in this workout. Are you sure you want to finalize and save this session now?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowIncompleteConfirm(false)}
                className="flex-1 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
              >
                Keep Logging
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIncompleteConfirm(false);
                  setShowSummary(true);
                }}
                className="flex-1 h-10 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black text-xs font-bold transition-colors shadow-sm"
              >
                Finish Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
