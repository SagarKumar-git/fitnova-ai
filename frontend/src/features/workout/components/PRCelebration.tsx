/**
 * FitNova AI — PRCelebration Component
 * High-dopamine gamified achievement card celebrating newly unlocked Personal Records
 * with previous performance comparisons, percentage improvements, Nova congratulations,
 * and EventBus ACHIEVEMENT_UNLOCKED integration.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { PersonalRecord } from '../models/PersonalRecord.ts';
import { useEventBus } from '../../../platform/container/PlatformContext.tsx';
import { NovaAvatar } from '../../../design-system/ai/NovaAvatar/index.tsx';
import { Trophy, Flame, X, Sparkles, TrendingUp } from 'lucide-react';

export interface PRCelebrationProps {
  record: PersonalRecord;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const PRCelebration: React.FC<PRCelebrationProps> = ({
  record,
  onDismiss,
  autoDismissMs = 8000,
}) => {
  const eventBus = useEventBus();
  const hasEmittedRef = useRef<boolean>(false);

  // Auto-dismiss countdown
  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  // Percentage improvement & diff calculation
  const { pctImprovement, diffKg, metricLabel } = useMemo(() => {
    const label =
      record.metric === '1rm'
        ? 'Estimated 1RM'
        : record.metric === 'max_weight'
        ? 'Max Weight'
        : record.metric === 'max_volume'
        ? 'Max Volume'
        : 'Max Reps';

    if (record.previousValue && record.previousValue > 0) {
      const diff = Math.round((record.value - record.previousValue) * 10) / 10;
      const pct = Math.round(((record.value - record.previousValue) / record.previousValue) * 1000) / 10;
      return { pctImprovement: pct, diffKg: diff, metricLabel: label };
    }

    return { pctImprovement: undefined, diffKg: undefined, metricLabel: label };
  }, [record]);

  // Emit platform ACHIEVEMENT_UNLOCKED event once
  useEffect(() => {
    if (!hasEmittedRef.current) {
      hasEmittedRef.current = true;
      eventBus.emit('ACHIEVEMENT_UNLOCKED', {
        achievementId: `pr_${record.exerciseId}_${Date.now()}`,
        title: `Personal Record: ${record.exerciseName} (${record.value}kg)`,
        category: 'strength',
        timestamp: Date.now(),
      });
    }
  }, [record, eventBus]);

  // Contextual Nova Congratulatory Remark
  const novaRemark = useMemo(() => {
    if (pctImprovement && pctImprovement >= 5.0) {
      return `That's your strongest ${record.exerciseName.toLowerCase()} session yet. A massive +${pctImprovement}% jump in output!`;
    }
    return `Phenomenal milestone on ${record.exerciseName}. Progressive overload is compounding exactly as planned.`;
  }, [record.exerciseName, pctImprovement]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-in fade-in zoom-in-95 duration-300"
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-zinc-900/95 to-amber-500/20 border-2 border-amber-400 rounded-3xl p-5 shadow-[0_15px_50px_rgba(245,158,11,0.35),0_0_30px_rgba(204,255,0,0.2)] backdrop-blur-xl">
        {/* Particle / Sparkles background effect */}
        <div className="absolute top-2 right-12 w-2 h-2 rounded-full bg-amber-300 animate-ping motion-reduce:animate-none opacity-75" aria-hidden="true" />
        <div className="absolute bottom-4 left-10 w-2.5 h-2.5 rounded-full bg-neonLime animate-ping motion-reduce:animate-none opacity-60" aria-hidden="true" />

        {/* Top bar: Trophy icon, title, dismiss button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shrink-0 animate-bounce motion-reduce:animate-none" aria-hidden="true">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase text-amber-400 flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-amber-400" aria-hidden="true" /> New Personal Record
                </span>
                <Sparkles className="w-4 h-4 text-neonLime animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                {record.exerciseName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss personal record notification"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            title="Dismiss PR"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Performance Comparison Ribbon */}
        <div className="grid grid-cols-2 gap-3 my-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3.5">
          <div>
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">
              Previous Record
            </span>
            <span className="text-sm font-black text-zinc-400 font-mono">
              {record.previousValue !== undefined ? `${record.previousValue} kg` : 'Baseline'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">
              Today's Record
            </span>
            <span className="text-base font-black text-white font-mono">
              {record.value} kg
            </span>
          </div>
        </div>

        {/* Improvement Percentage Pill */}
        {pctImprovement !== undefined && pctImprovement > 0 && (
          <div className="flex items-center justify-between bg-amber-400/10 border border-amber-400/30 rounded-xl px-3.5 py-2 mb-3">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> {metricLabel}
            </span>
            <span className="text-xs font-black text-neonLime bg-neonLime/10 border border-neonLime/30 px-2 py-0.5 rounded-full font-mono">
              +{pctImprovement}% {diffKg !== undefined && `(+${diffKg} kg)`}
            </span>
          </div>
        )}

        {/* Nova Congratulation Callout */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3">
          <NovaAvatar size="sm" state="celebrating" className="shrink-0" />
          <p className="text-xs text-zinc-200 font-medium leading-relaxed italic">
            "{novaRemark}"
          </p>
        </div>
      </div>
    </div>
  );
};

