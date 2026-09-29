/**
 * FitNova AI — WorkoutProgress Component
 * Visual progress bar tracking completed sets, exercises, and volume.
 */

import React from 'react';
import { calculateWorkoutCompletionPercentage } from '../utils/workoutRules.ts';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import { Dumbbell, Trophy } from 'lucide-react';

export interface WorkoutProgressProps {
  exercises: WorkoutExercise[];
  totalVolumeKg?: number;
  className?: string;
}

export const WorkoutProgress: React.FC<WorkoutProgressProps> = React.memo(({
  exercises,
  totalVolumeKg = 0,
  className = '',
}) => {
  const percentage = React.useMemo(() => calculateWorkoutCompletionPercentage(exercises), [exercises]);

  const { totalSets, completedSets, totalExercises, completedExercises } = React.useMemo(() => {
    const tSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const cSets = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
    const tEx = exercises.length;
    const cEx = exercises.filter(
      (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed || s.skipped)
    ).length;
    return {
      totalSets: tSets,
      completedSets: cSets,
      totalExercises: tEx,
      completedExercises: cEx,
    };
  }, [exercises]);

  return (
    <div className={`bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 ${className}`}>
      {/* Top Header Information */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Overall Progress
          </span>
          <span className="text-xs font-black text-neonLime bg-neonLime/10 border border-neonLime/20 px-2 py-0.5 rounded-full">
            {percentage}%
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200 font-bold">{completedSets}</span>
            <span>/</span>
            <span>{totalSets} Sets</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-zinc-200 font-bold">{completedExercises}</span>
            <span>/</span>
            <span>{totalExercises} Exercises</span>
          </div>

          {totalVolumeKg > 0 && (
            <div className="flex items-center gap-1 text-zinc-300 font-bold">
              <Dumbbell className="w-3.5 h-3.5 text-neonLime" />
              <span>{Math.round(totalVolumeKg).toLocaleString()} kg</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-800/80 rounded-full h-2.5 overflow-hidden p-0.5">
        <div
          className="bg-neonLime h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(204,255,0,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage === 100 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-neonLime justify-center animate-bounce">
          <Trophy className="w-3.5 h-3.5" />
          <span>All sets completed! Ready to finish workout.</span>
        </div>
      )}
    </div>
  );
});
WorkoutProgress.displayName = 'WorkoutProgress';
