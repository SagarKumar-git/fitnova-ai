/**
 * FitNova AI — RestTimer Component
 * Intelligent countdown rest interval with AI-adjusted durations based on RPE,
 * exercise-specific recovery recommendations, Nova explanations, and quick adjust/extend controls.
 */

import React, { useState, useEffect } from 'react';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { NovaAvatar } from '../../../design-system/ai/NovaAvatar/index.tsx';
import {
  Plus,
  Minus,
  X,
  Pause,
  Play,
  Bell,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface RestTimerProps {
  className?: string;
  onDismiss?: () => void;
  lastRpe?: number;
  exerciseName?: string;
  isCompound?: boolean;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  className = '',
  onDismiss,
  lastRpe,
  exerciseName,
  isCompound = true,
}) => {
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

  const isHighExertion = lastRpe !== undefined && lastRpe >= 9.0;

  // Contextual Nova Rest Rationale
  const restExplanation = isHighExertion
    ? `High exertion logged (RPE ${lastRpe}). Rest interval prolonged to resynthesize cellular ATP and restore maximum motor unit recruitment.`
    : isCompound
    ? 'Heavy compound movement: Full 90-120s recovery allows the central nervous system to clear lactate and maximize power output.'
    : 'Isolation exercise: 60-75s rest keeps target motor unit tension high while allowing heart rate recovery.';

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
      role="region"
      aria-label="Rest interval timer"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-zinc-900/95 backdrop-blur-md border border-neonLime/50 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(204,255,0,0.18)] ${className}`}
    >
      {/* Top bar with Nova recovery indicator & Adjusters */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <NovaAvatar size="sm" state="recovery" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-neonLime block leading-tight">
                Intelligent Rest Interval
              </span>
              {isHighExertion && (
                <span className="text-[10px] font-extrabold text-amber-300 bg-amber-400/20 px-1.5 py-0.2 rounded border border-amber-400/40 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 fill-amber-300" aria-hidden="true" /> +30s AI Added
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400">
              {exerciseName ? `Recovering for ${exerciseName}` : 'Catch breath & hydrate'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleAdjustTime(-15)}
            aria-label="Subtract 15 seconds from rest timer"
            className="min-h-[36px] text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
            title="Subtract 15s"
          >
            <Minus className="w-3 h-3" aria-hidden="true" />
            <span>15s</span>
          </button>

          <button
            type="button"
            onClick={() => handleAdjustTime(30)}
            aria-label="Add 30 seconds to rest timer"
            className="min-h-[36px] text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
            title="Add 30s"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
            <span>30s</span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            aria-label="Dismiss rest timer"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
            title="Skip Rest"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Center Countdown Display */}
      <div className="flex items-center justify-between my-2 px-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-white font-mono" role="timer" aria-live="off">
            {formattedTime}
          </span>
          <span className="text-[11px] text-zinc-500 font-semibold">Remaining</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAdjustTime(45)}
            aria-label="Extend rest by 45 seconds"
            className="min-h-[36px] px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
            title="Extend Rest by 45 seconds"
          >
            +45s
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            aria-label={isPaused ? 'Resume rest timer' : 'Pause rest timer'}
            className="min-h-[36px] px-3.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Pause
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip rest and start next set"
            className="min-h-[36px] px-3.5 rounded-lg bg-neonLime hover:bg-neonLime/90 text-black text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" aria-hidden="true" /> Skip
          </button>
        </div>
      </div>

      {/* Nova Rest Explanation Callout */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 my-2 flex items-start gap-2">
        <Sparkles className="w-3 h-3 text-neonLime shrink-0 mt-0.5" />
        <p className="text-[11px] text-zinc-300 leading-tight">
          {restExplanation}
        </p>
      </div>

      {/* Animated Timer Progress Bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mt-1">
        <div
          className="bg-neonLime h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(204,255,0,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

