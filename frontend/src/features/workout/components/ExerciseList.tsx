/**
 * FitNova AI — ExerciseList Component
 * Displays an ordered sequence of exercises within a workout, with sets, reps, and targets.
 */

import React from 'react';
import type { WorkoutExercise } from '../models/WorkoutExercise.ts';
import type { Exercise } from '../models/Exercise.ts';
import { Dumbbell, Timer, CheckCircle, ChevronRight } from 'lucide-react';

export interface ExerciseListProps {
  exercises: WorkoutExercise[];
  activeExerciseIndex?: number;
  onSelectExercise?: (index: number) => void;
  exercisesMap?: Map<string, Exercise>;
  interactive?: boolean;
}

export const ExerciseList: React.FC<ExerciseListProps> = ({
  exercises,
  activeExerciseIndex,
  onSelectExercise,
  exercisesMap,
  interactive = false,
}) => {
  return (
    <div className="space-y-3">
      {exercises.map((workoutExercise, index) => {
        const exerciseDetail = exercisesMap?.get(workoutExercise.exerciseId);
        const isActive = activeExerciseIndex === index;
        const allSetsCompleted =
          workoutExercise.sets.length > 0 &&
          workoutExercise.sets.every((s) => s.completed || s.skipped);
        const completedSetsCount = workoutExercise.sets.filter((s) => s.completed).length;

        return (
          <div
            key={workoutExercise.id || `${workoutExercise.exerciseId}-${index}`}
            onClick={() => interactive && onSelectExercise && onSelectExercise(index)}
            className={`group rounded-xl border p-4 transition-all duration-200 ${
              interactive ? 'cursor-pointer' : ''
            } ${
              isActive
                ? 'bg-zinc-900/90 border-neonLime/60 shadow-[0_0_15px_rgba(204,255,0,0.1)] ring-1 ring-neonLime/30'
                : allSetsCompleted
                ? 'bg-zinc-900/40 border-zinc-800/60 opacity-80'
                : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Exercise Index / Status Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    allSetsCompleted
                      ? 'bg-neonLime text-black font-extrabold'
                      : isActive
                      ? 'bg-neonLime/20 text-neonLime border border-neonLime/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {allSetsCompleted ? (
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`text-sm md:text-base font-bold transition-colors ${
                        isActive ? 'text-neonLime' : 'text-slate-100 group-hover:text-white'
                      }`}
                    >
                      {workoutExercise.exerciseName}
                    </h4>

                    {isActive && (
                      <span className="text-[10px] uppercase font-extrabold bg-neonLime/20 text-neonLime px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                        Active
                      </span>
                    )}

                    {exerciseDetail?.primaryMuscleGroup && (
                      <span className="text-[11px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                        {exerciseDetail.primaryMuscleGroup}
                      </span>
                    )}
                  </div>

                  {exerciseDetail?.equipment && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{exerciseDetail.equipment}</span>
                      {workoutExercise.notes && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400 italic line-clamp-1">
                            {workoutExercise.notes}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Target & Rest Summary */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs md:text-sm font-bold text-zinc-200">
                    {workoutExercise.sets.length > 0
                      ? `${completedSetsCount}/${workoutExercise.sets.length} Sets`
                      : `${workoutExercise.targetSets} × ${workoutExercise.targetReps}`}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-zinc-400">
                    <Timer className="w-3 h-3 text-zinc-500" />
                    <span>{workoutExercise.restSeconds}s rest</span>
                  </div>
                </div>

                {interactive && (
                  <ChevronRight
                    className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-transform ${
                      isActive ? 'translate-x-0.5 text-neonLime' : ''
                    }`}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
