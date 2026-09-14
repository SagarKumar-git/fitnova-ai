/**
 * FitNova AI — WorkoutCard Component
 * Presents a workout routine card with goal badges, muscle tags, and action buttons.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Workout } from '../models/Workout.ts';
import { Clock, Dumbbell, Play, ChevronRight, Flame } from 'lucide-react';
import { useWorkout } from '../state/WorkoutContext.tsx';

export interface WorkoutCardProps {
  workout: Workout;
  onStart?: (workout: Workout) => void;
  isRecommended?: boolean;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onStart,
  isRecommended,
}) => {
  const navigate = useNavigate();
  const { startWorkout } = useWorkout();

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStart) {
      onStart(workout);
    } else {
      await startWorkout(workout.id);
      navigate('/workouts/active');
    }
  };

  const handleViewDetails = () => {
    navigate(`/workouts/${workout.id}`);
  };

  return (
    <div
      onClick={handleViewDetails}
      className={`group relative bg-zinc-900/70 hover:bg-zinc-900 border rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
        isRecommended
          ? 'border-neonLime/50 shadow-[0_0_20px_rgba(204,255,0,0.12)]'
          : 'border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Recommended Pill */}
      {isRecommended && (
        <div className="absolute -top-3 right-4 bg-neonLime text-black text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-sm">
          <Flame className="w-3.5 h-3.5 fill-black" />
          Recommended For You
        </div>
      )}

      <div>
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="bg-zinc-800/90 text-zinc-300 text-xs font-semibold px-2.5 py-1 rounded-md border border-zinc-700/50">
            {workout.goal}
          </span>
          <span className="bg-zinc-800/60 text-zinc-400 text-xs font-medium px-2 py-0.5 rounded">
            {workout.difficulty}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold text-slate-100 group-hover:text-neonLime transition-colors duration-200">
          {workout.name}
        </h3>
        <p className="text-sm text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
          {workout.description}
        </p>

        {/* Meta details */}
        <div className="flex items-center gap-4 mt-4 text-xs text-zinc-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            {workout.estimatedDurationMinutes} min
          </span>
          <span className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
            {workout.exercises.length} exercises
          </span>
        </div>

        {/* Target Muscles */}
        <div className="flex items-center gap-1.5 mt-3.5 flex-wrap">
          {workout.targetMuscleGroups.slice(0, 3).map((muscle) => (
            <span
              key={muscle}
              className="text-[11px] font-medium bg-zinc-950/80 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded"
            >
              {muscle}
            </span>
          ))}
          {workout.targetMuscleGroups.length > 3 && (
            <span className="text-[11px] text-zinc-500 font-medium">
              +{workout.targetMuscleGroups.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-800/60">
        <button
          onClick={handleStart}
          className="flex-1 bg-neonLime hover:bg-neonLime/90 text-black font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 fill-black" />
          Start
        </button>

        <button
          onClick={handleViewDetails}
          className="bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold p-2.5 rounded-xl flex items-center justify-center transition-colors"
          aria-label="View routine details"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
