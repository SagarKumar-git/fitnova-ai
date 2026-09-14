/**
 * FitNova AI — WorkoutDetails Page
 * In-depth preview of a workout routine, target muscles, equipment, exercises, and Start CTA.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkoutDetails } from '../hooks/useWorkoutDetails.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';
import type { Exercise } from '../models/Exercise.ts';
import { ExerciseCard } from '../components/ExerciseCard.tsx';
import { WorkoutEmptyState } from '../components/WorkoutEmptyState.tsx';
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Flame,
  Play,
} from 'lucide-react';

export const WorkoutDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { startWorkout } = useWorkout();
  const { workout, isLoading, error } = useWorkoutDetails(id);

  const [exercisesMap, setExercisesMap] = useState<Map<string, Exercise>>(new Map());
  const { service } = useWorkout();

  useEffect(() => {
    let mounted = true;
    service
      .getExercises()
      .then((exercises) => {
        if (mounted) {
          const map = new Map<string, Exercise>();
          for (const ex of exercises) {
            map.set(ex.id, ex);
          }
          setExercisesMap(map);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [service]);

  const handleStartWorkout = async () => {
    if (!workout) return;
    await startWorkout(workout.id);
    navigate('/workouts/active');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-neonLime border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            Loading Routine...
          </span>
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-zinc-950 text-slate-100 p-6 flex items-center justify-center">
        <WorkoutEmptyState
          title="Routine Not Found"
          description="The requested workout routine does not exist or has been removed."
          actionLabel="Back to Workouts"
          onAction={() => navigate('/workouts')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-4 sm:p-6 lg:p-8 pb-28">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/workouts')}
            className="h-10 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              {workout.difficulty}
            </span>
          </div>
        </div>

        {/* Hero Details Card */}
        <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neonLime/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neonLime bg-neonLime/10 border border-neonLime/30 px-3 py-1 rounded-full">
                {workout.goal}
              </span>
              <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/60 px-3 py-1 rounded-full">
                {workout.tags.length > 0 ? workout.tags[0] : workout.difficulty}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {workout.name}
            </h1>

            <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
              {workout.description}
            </p>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-semibold block">Duration</span>
                  <span className="text-sm font-extrabold text-white">
                    {workout.estimatedDurationMinutes} mins
                  </span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-semibold block">Exercises</span>
                  <span className="text-sm font-extrabold text-white">
                    {workout.exercises.length} Movements
                  </span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-zinc-500 font-semibold block">Total Sets</span>
                  <span className="text-sm font-extrabold text-white">
                    {workout.exercises.reduce((acc, e) => acc + e.targetSets, 0)} Sets
                  </span>
                </div>
              </div>
            </div>

            {/* Target Muscle Groups */}
            <div className="pt-2">
              <span className="text-xs font-bold text-zinc-400 block mb-2">
                Target Muscle Groups
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {workout.targetMuscleGroups.map((muscle) => (
                  <span
                    key={muscle}
                    className="text-xs font-semibold text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-1 rounded-lg"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white">Exercise Sequence</h2>
            <span className="text-xs text-zinc-400">
              Click any movement to view instructions
            </span>
          </div>

          <div className="space-y-3">
            {workout.exercises.map((workoutExercise, idx) => {
              const fullExercise: Exercise = exercisesMap.get(workoutExercise.exerciseId) || {
                id: workoutExercise.exerciseId,
                name: workoutExercise.exerciseName,
                description: 'Targeted compound movement.',
                primaryMuscleGroup: workout.targetMuscleGroups[0] || 'Full Body',
                secondaryMuscleGroups: [],
                equipment: 'Barbell',
                difficulty: workout.difficulty,
                instructions: ['Maintain proper form and brace your core.'],
                tips: ['Control the eccentric tempo.'],
                defaultRestSeconds: workoutExercise.restSeconds || 90,
                isCustom: false,
              };

              return (
                <div key={workoutExercise.id || idx} className="relative">
                  <div className="absolute -left-2 top-4 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[11px] font-bold hidden md:flex items-center justify-center z-10">
                    {idx + 1}
                  </div>
                  <div className="md:pl-6">
                    <ExerciseCard
                      exercise={fullExercise}
                      targetSets={workoutExercise.targetSets}
                      targetReps={workoutExercise.targetReps}
                      targetWeight={workoutExercise.targetWeight}
                      restSeconds={workoutExercise.restSeconds}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-400 font-semibold block">Ready to train?</span>
            <span className="text-sm font-bold text-white">{workout.name}</span>
          </div>

          <button
            type="button"
            onClick={handleStartWorkout}
            className="h-12 px-8 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Workout Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
