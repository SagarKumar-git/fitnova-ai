/**
 * FitNova AI — WorkoutHeader Component
 * Sticky top navigation bar for active workout sessions with live timer, volume, and control dialogs.
 */

import React, { useState } from 'react';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { Clock, Dumbbell, Pause, Play, X, AlertTriangle } from 'lucide-react';

export interface WorkoutHeaderProps {
  session: WorkoutSession;
  onFinish?: () => void;
}

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({ session, onFinish }) => {
  const { pauseWorkout, resumeWorkout, cancelWorkout } = useWorkout();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isPaused = session.status === 'paused';

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleTogglePause = async () => {
    if (isPaused) {
      await resumeWorkout();
    } else {
      await pauseWorkout();
    }
  };

  const handleConfirmExit = async () => {
    setShowExitConfirm(false);
    await cancelWorkout('Discarded by user');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Workout Title & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                isPaused ? 'bg-amber-400 animate-pulse' : 'bg-neonLime shadow-[0_0_8px_#ccff00]'
              }`}
            />
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-100 truncate">
                {session.workoutName}
              </h2>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-1 font-mono font-bold text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-neonLime" />
                  <span>{formatTimer(session.durationSeconds)}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-semibold text-zinc-300">
                    {Math.round(session.totalVolume).toLocaleString()} kg
                  </span>
                </div>
                {isPaused && (
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    Paused
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Pause / Finish / Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePause}
              className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                isPaused
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              title={isPaused ? 'Resume Workout' : 'Pause Workout'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>

            {onFinish && (
              <button
                type="button"
                onClick={onFinish}
                className="h-9 px-4 rounded-lg text-xs font-extrabold bg-neonLime hover:bg-neonLime/90 text-black shadow-[0_0_12px_rgba(204,255,0,0.25)] transition-all active:scale-95"
              >
                Finish
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 flex items-center justify-center transition-colors"
              title="Cancel Workout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Cancel Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-100">Discard Workout?</h3>
            <p className="text-xs text-zinc-400 mt-2">
              Are you sure you want to cancel this session? Your current progress and uncompleted sets will be discarded.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
              >
                Keep Going
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
