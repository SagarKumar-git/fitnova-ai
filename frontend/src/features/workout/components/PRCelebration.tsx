/**
 * FitNova AI — PRCelebration Component
 * High-dopamine gamified banner celebrating newly unlocked Personal Records.
 */

import React, { useEffect } from 'react';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import { Trophy, Flame, X, Sparkles } from 'lucide-react';

export interface PRCelebrationProps {
  record: PersonalRecord;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const PRCelebration: React.FC<PRCelebrationProps> = ({
  record,
  onDismiss,
  autoDismissMs = 6000,
}) => {
  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  const metricLabel =
    record.metric === '1rm'
      ? 'Estimated 1RM'
      : record.metric === 'max_weight'
      ? 'Max Weight'
      : record.metric === 'max_volume'
      ? 'Volume Record'
      : 'Max Reps';

  const diff =
    record.previousValue !== undefined
      ? Math.round((record.value - record.previousValue) * 10) / 10
      : undefined;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-r from-amber-500/20 via-zinc-900 to-amber-500/20 border-2 border-amber-400/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(245,158,11,0.3),0_0_20px_rgba(204,255,0,0.15)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shrink-0 animate-bounce">
              <Trophy className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black tracking-wider uppercase text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" /> New PR Unlocked!
                </span>
                <Sparkles className="w-3.5 h-3.5 text-neonLime animate-pulse" />
              </div>

              <h4 className="text-base font-black text-white">{record.exerciseName}</h4>

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-300 font-semibold">{metricLabel}:</span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  {record.value} kg
                </span>
                {diff !== undefined && diff > 0 && (
                  <span className="text-[11px] font-bold text-neonLime bg-neonLime/10 px-1.5 py-0.2 rounded border border-neonLime/30">
                    +{diff} kg
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
            title="Dismiss PR"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
