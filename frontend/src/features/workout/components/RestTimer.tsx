/**
 * FitNova AI — RestTimer Component
 * Live countdown rest interval with quick-adjust steppers (+30s / -15s), pause, and skip controls.
 */

import React, { useState, useEffect } from 'react';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { Timer, Plus, Minus, X, Pause, Play, Bell } from 'lucide-react';

export interface RestTimerProps {
  className?: string;
  onDismiss?: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ className = '', onDismiss }) => {
  const {
    restSecondsRemaining,
    isRestTimerActive,
    startRestTimer,
    stopRestTimer,
  } = useWorkout();

  const [initialDuration, setInitialDuration] = useState<number>(
    restSecondsRemaining > 0 ? restSecondsRemaining : 90
  );
  const [isPaused, setIsPaused] = useState(false);

  // Update initialDuration whenever a new timer starts
  useEffect(() => {
    if (restSecondsRemaining > initialDuration) {
      setInitialDuration(restSecondsRemaining);
    }
  }, [restSecondsRemaining, initialDuration]);

  if (!isRestTimerActive && restSecondsRemaining <= 0) {
    return null;
  }

  const minutes = Math.floor(restSecondsRemaining / 60);
  const seconds = restSecondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress =
    initialDuration > 0
      ? Math.min(100, Math.max(0, ((initialDuration - restSecondsRemaining) / initialDuration) * 100))
      : 100;

  const handleAdjustTime = (delta: number) => {
    const newSeconds = Math.max(5, restSecondsRemaining + delta);
    startRestTimer(newSeconds);
    if (newSeconds > initialDuration) {
      setInitialDuration(newSeconds);
    }
  };

  const handleSkip = () => {
    stopRestTimer();
    if (onDismiss) onDismiss();
  };

  const handleTogglePause = () => {
    if (isPaused) {
      startRestTimer(restSecondsRemaining);
      setIsPaused(false);
    } else {
      stopRestTimer();
      setIsPaused(true);
    }
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-zinc-900/95 backdrop-blur-md border border-neonLime/50 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(204,255,0,0.15)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neonLime/20 text-neonLime flex items-center justify-center animate-pulse">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neonLime block leading-tight">
              Rest Interval
            </span>
            <span className="text-[11px] text-zinc-400">Catch your breath & hydrate</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleAdjustTime(-15)}
            className="text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md transition-colors flex items-center gap-0.5"
            title="Subtract 15s"
          >
            <Minus className="w-3 h-3" />
            <span>15s</span>
          </button>

          <button
            type="button"
            onClick={() => handleAdjustTime(30)}
            className="text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md transition-colors flex items-center gap-0.5"
            title="Add 30s"
          >
            <Plus className="w-3 h-3" />
            <span>30s</span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-zinc-800 transition-colors ml-1"
            title="Skip Rest"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Countdown Display */}
      <div className="flex items-center justify-between my-2 px-2">
        <div className="text-3xl font-black tracking-tight text-white font-mono">
          {formattedTime}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePause}
            className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="h-8 px-3 rounded-lg bg-neonLime hover:bg-neonLime/90 text-black text-xs font-black flex items-center gap-1 shadow-sm transition-all"
          >
            <Bell className="w-3.5 h-3.5" /> Skip Rest
          </button>
        </div>
      </div>

      {/* Animated Timer Progress Bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-neonLime h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(204,255,0,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
