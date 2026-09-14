/**
 * FitNova AI — WorkoutControls Component
 * Big, touch-friendly primary action controls for live session navigation and completion.
 */

import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Flag } from 'lucide-react';

export interface WorkoutControlsProps {
  hasPreviousExercise: boolean;
  hasNextExercise: boolean;
  onPreviousExercise: () => void;
  onNextExercise: () => void;
  onFinishWorkout: () => void;
  allExercisesCompleted?: boolean;
}

export const WorkoutControls: React.FC<WorkoutControlsProps> = ({
  hasPreviousExercise,
  hasNextExercise,
  onPreviousExercise,
  onNextExercise,
  onFinishWorkout,
  allExercisesCompleted = false,
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
      {/* Previous Exercise Button */}
      <button
        type="button"
        disabled={!hasPreviousExercise}
        onClick={onPreviousExercise}
        className="h-12 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev Exercise</span>
      </button>

      {/* Main Center / Action Button */}
      {hasNextExercise ? (
        <button
          type="button"
          onClick={onNextExercise}
          className="h-12 flex-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-slate-100 font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span>Next Exercise</span>
          <ChevronRight className="w-4 h-4 text-neonLime" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onFinishWorkout}
          className="h-12 flex-1 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>{allExercisesCompleted ? 'Finish & Log Workout' : 'Finish Session'}</span>
        </button>
      )}

      {/* Direct Finish CTA if not on last exercise */}
      {hasNextExercise && (
        <button
          type="button"
          onClick={onFinishWorkout}
          className="h-12 px-4 rounded-xl bg-neonLime/10 hover:bg-neonLime/20 border border-neonLime/30 text-neonLime font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
          title="Finish Workout Early"
        >
          <Flag className="w-4 h-4" />
          <span className="hidden md:inline">Finish</span>
        </button>
      )}
    </div>
  );
};
