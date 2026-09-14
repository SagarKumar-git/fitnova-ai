/**
 * FitNova AI — ActiveWorkout Page
 * Core live execution mode orchestrating live timer, set completion, steppers,
 * rest countdown timer, PR celebration banner, and post-session summary modal.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../state/WorkoutContext.tsx';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import type { Exercise } from '../models/Exercise.ts';
import { WorkoutHeader } from '../components/WorkoutHeader.tsx';
import { WorkoutProgress } from '../components/WorkoutProgress.tsx';
import { SetRow } from '../components/SetRow.tsx';
import { RestTimer } from '../components/RestTimer.tsx';
import { WorkoutControls } from '../components/WorkoutControls.tsx';
import { SessionSummary } from '../components/SessionSummary.tsx';
import { PRCelebration } from '../components/PRCelebration.tsx';
import { WorkoutEmptyState } from '../components/WorkoutEmptyState.tsx';
import { CheckCircle2 } from 'lucide-react';

export const ActiveWorkout: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSession,
    isLoading,
    completeSet,
    skipSet,
    finishWorkout,
    service,
  } = useWorkout();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [exercisesMap, setExercisesMap] = useState<Map<string, Exercise>>(new Map());
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [latestPR, setLatestPR] = useState<PersonalRecord | null>(null);
  const [seenPRCount, setSeenPRCount] = useState<number>(0);

  // Sync exercises metadata
  useEffect(() => {
    let mounted = true;
    service
      .getExercises()
      .then((list) => {
        if (mounted) {
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

  const handleNextExercise = () => {
    if (hasNextExercise) {
      setActiveExerciseIndex((prev) => prev + 1);
    }
  };

  const handlePreviousExercise = () => {
    if (hasPreviousExercise) {
      setActiveExerciseIndex((prev) => prev - 1);
    }
  };

  const handleFinishClick = () => {
    setShowSummary(true);
  };

  const handleDoneSummary = async (notes?: string, rating?: number) => {
    await finishWorkout(notes, rating);
    navigate('/workouts/history');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 flex flex-col pb-32">
      {/* Sticky Active Workout Header */}
      <WorkoutHeader session={activeSession} onFinish={handleFinishClick} />

      {/* PR Celebration Banner */}
      {latestPR && (
        <PRCelebration record={latestPR} onDismiss={() => setLatestPR(null)} />
      )}

      {/* Main Active Workout View */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Live Progress Bar */}
        <WorkoutProgress
          exercises={activeSession.exercises}
          totalVolumeKg={activeSession.totalVolume}
        />

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
                onClick={() => setActiveExerciseIndex(idx)}
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

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {currentExercise.exerciseName}
                </h3>

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

      {/* Floating Rest Timer Widget */}
      <RestTimer />

      {/* Post-Session Summary Dialog */}
      {showSummary && (
        <SessionSummary
          session={activeSession}
          onDone={handleDoneSummary}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
};
