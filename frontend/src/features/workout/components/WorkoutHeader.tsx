/**
 * FitNova AI — WorkoutHeader Component
 * Sticky top navigation bar for active workout sessions with live timer, volume, and control dialogs.
 */

import React, { useState } from 'react';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { Clock, Dumbbell, Pause, Play, X, AlertTriangle, Heart } from 'lucide-react';
import type { AdaptiveSafetyUiState } from '../hooks/useAdaptiveWorkout.ts';

export interface WorkoutHeaderProps {
  session: WorkoutSession;
  onFinish?: () => void;
  isFinishing?: boolean;
  heartRate?: number | null;
  safetyState?: AdaptiveSafetyUiState;
}

const WorkoutHeaderComponent: React.FC<WorkoutHeaderProps> = ({
  session,
  onFinish,
  isFinishing = false,
  heartRate,
  safetyState,
}) => {
  const { pauseWorkout, resumeWorkout, cancelWorkout, syncStatus, syncPendingOperations } =
    useWorkout();
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
    if (isFinishing) return;
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
                isPaused
                  ? 'bg-amber-400 animate-pulse'
                  : session.status === 'recovered'
                  ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                  : session.status === 'offline'
                  ? 'bg-zinc-500'
                  : 'bg-neonLime shadow-[0_0_8px_#ccff00]'
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
                {session.status === 'recovered' && (
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded">
                    Recovered
                  </span>
                )}
                {session.status === 'offline' && (
                  <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-400/10 border border-rose-400/30 px-1.5 py-0.5 rounded">
                    Offline
                  </span>
                )}
                {/* Sync Status Badge */}
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : syncStatus === 'syncing'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                      : syncStatus === 'offline'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20'
                  }`}
                  onClick={syncStatus === 'pending' ? () => syncPendingOperations() : undefined}
                  title={
                    syncStatus === 'synced'
                      ? 'All sets synced to cloud'
                      : syncStatus === 'syncing'
                      ? 'Synchronizing sets with server...'
                      : syncStatus === 'offline'
                      ? 'Offline mode: all sets saved locally on device'
                      : 'Unsynced changes: tap to sync now'
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-400'
                        : syncStatus === 'syncing'
                        ? 'bg-cyan-400 animate-ping'
                        : syncStatus === 'offline'
                        ? 'bg-amber-400'
                        : 'bg-indigo-400'
                    }`}
                  />
                  <span>
                    {syncStatus === 'synced'
                      ? 'Synced'
                      : syncStatus === 'syncing'
                      ? 'Syncing'
                      : syncStatus === 'offline'
                      ? 'Offline'
                      : 'Sync Pending'}
                  </span>
                </div>

                {/* Live Biometric & Safety State Chip */}
                {heartRate !== undefined && heartRate !== null && heartRate > 0 ? (
                  <div
                    className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      safetyState === 'stop_and_recover'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : safetyState === 'reduce_intensity'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : safetyState === 'heart_rate_elevated'
                        ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${safetyState === 'stop_and_recover' ? 'text-rose-400 fill-rose-400' : 'text-neonLime fill-neonLime'}`} />
                    <span>{heartRate} BPM</span>
                  </div>
                ) : safetyState === 'wearable_disconnected' ? (
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    <span>HR Disconnected</span>
                  </div>
                ) : safetyState === 'biometric_data_stale' ? (
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>HR Stale</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Controls: Pause / Finish / Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isFinishing}
              onClick={handleTogglePause}
              aria-label={isPaused ? 'Resume workout session' : 'Pause workout session'}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer ${
                isPaused
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              title={isPaused ? 'Resume Workout' : 'Pause Workout'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>

            {onFinish && (
              <button
                type="button"
                disabled={isFinishing}
                onClick={onFinish}
                aria-label="Finish workout session"
                className="min-h-[44px] px-4 rounded-xl text-xs font-extrabold bg-neonLime hover:bg-neonLime/90 text-black shadow-[0_0_12px_rgba(204,255,0,0.25)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
              >
                {isFinishing ? 'Finishing...' : 'Finish'}
              </button>
            )}

            <button
              type="button"
              disabled={isFinishing}
              onClick={() => setShowExitConfirm(true)}
              aria-label="Cancel and discard workout"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 flex items-center justify-center transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
              title="Cancel Workout"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Cancel Confirmation Modal */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-workout-title"
          aria-describedby="discard-workout-desc"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowExitConfirm(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 id="discard-workout-title" className="text-lg font-bold text-slate-100">Discard Workout?</h3>
            <p id="discard-workout-desc" className="text-xs text-zinc-400 mt-2">
              Are you sure you want to cancel this session? Your current progress and uncompleted sets will be discarded.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
              >
                Keep Going
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
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

export const WorkoutHeader = React.memo<WorkoutHeaderProps>(WorkoutHeaderComponent, (prev, next) => {
  return (
    prev.session.id === next.session.id &&
    prev.session.status === next.session.status &&
    prev.session.durationSeconds === next.session.durationSeconds &&
    prev.session.totalVolume === next.session.totalVolume &&
    prev.isFinishing === next.isFinishing &&
    prev.heartRate === next.heartRate &&
    prev.safetyState === next.safetyState
  );
});
WorkoutHeader.displayName = 'WorkoutHeader';
