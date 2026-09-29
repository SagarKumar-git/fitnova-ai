/**
 * FitNova AI — SetRow Component
 * Highly responsive, touch-friendly set logging row with steppers, RPE, and completion status.
 */

import React, { useState } from 'react';
import type { WorkoutSet } from '../models/WorkoutSet.ts';
import { Check, SkipForward, Plus, Minus, Flame } from 'lucide-react';

export interface SetRowProps {
  set: WorkoutSet;
  exerciseId: string;
  previousBest?: { reps: number; weight: number };
  onComplete: (reps: number, weight: number, rpe?: number) => Promise<void> | void;
  onSkip?: () => void;
  isCurrent?: boolean;
}

const SetRowComponent: React.FC<SetRowProps> = ({
  set,
  previousBest,
  onComplete,
  onSkip,
  isCurrent = false,
}) => {
  const [reps, setReps] = useState<number>(
    set.actualReps ?? set.targetReps ?? 10
  );
  const [weight, setWeight] = useState<number>(
    set.actualWeight ?? set.targetWeight ?? 0
  );
  const [rpe, setRpe] = useState<number | undefined>(set.rpe);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAdjustWeight = (delta: number) => {
    if (set.completed || isSubmitting) return;
    setWeight((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  const handleAdjustReps = (delta: number) => {
    if (set.completed || isSubmitting) return;
    setReps((prev) => Math.max(1, prev + delta));
  };

  const handleComplete = async () => {
    if (isSubmitting || set.completed || set.skipped) return;
    setIsSubmitting(true);
    try {
      await onComplete(reps, weight, rpe);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = () => {
    switch (set.type) {
      case 'warmup':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            Warmup
          </span>
        );
      case 'drop':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
            Drop
          </span>
        );
      case 'failure':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" /> Fail
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
        set.completed
          ? 'bg-neonLime/5 border-neonLime/40 text-zinc-300'
          : set.skipped
          ? 'bg-zinc-900/30 border-zinc-800/40 opacity-50 line-through'
          : isCurrent
          ? 'bg-zinc-900/90 border-neonLime/60 shadow-[0_0_12px_rgba(204,255,0,0.08)]'
          : 'bg-zinc-900/50 border-zinc-800/70 hover:border-zinc-700'
      }`}
    >
      {/* Left Column: Set Number & Previous Best */}
      <div className="flex items-center gap-2.5 min-w-[110px]">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
            set.completed
              ? 'bg-neonLime text-black font-black'
              : isCurrent
              ? 'bg-neonLime/20 text-neonLime border border-neonLime/50'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {set.completed ? <Check className="w-4 h-4 stroke-[3]" /> : set.setNumber}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-300">Set {set.setNumber}</span>
            {getTypeBadge()}
          </div>
          {previousBest && (
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              Prev: {previousBest.weight}kg × {previousBest.reps}
            </span>
          )}
        </div>
      </div>

      {/* Middle Column: Weight & Reps Steppers */}
      <div className="flex items-center justify-between sm:justify-center gap-3 flex-1">
        {/* Weight Adjuster */}
        <div className="flex items-center gap-1 bg-zinc-800/60 p-1 rounded-xl border border-zinc-700/50">
          <button
            type="button"
            disabled={set.completed || set.skipped}
            onClick={() => handleAdjustWeight(-2.5)}
            aria-label="Decrease weight by 2.5 kg"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-zinc-700/60 hover:bg-zinc-600 disabled:opacity-30 text-zinc-200 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neonLime cursor-pointer"
            title="-2.5 kg"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-baseline gap-1 px-1 min-w-[54px] justify-center">
            <input
              type="number"
              disabled={set.completed || set.skipped}
              value={weight}
              aria-label="Weight in kilograms"
              onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-12 bg-transparent text-center font-black text-sm text-slate-100 focus:outline-none focus:text-neonLime"
              step="2.5"
            />
            <span className="text-[10px] text-zinc-400 font-semibold" aria-hidden="true">kg</span>
          </div>

          <button
            type="button"
            disabled={set.completed || set.skipped}
            onClick={() => handleAdjustWeight(2.5)}
            aria-label="Increase weight by 2.5 kg"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-zinc-700/60 hover:bg-zinc-600 disabled:opacity-30 text-zinc-200 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neonLime cursor-pointer"
            title="+2.5 kg"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Reps Adjuster */}
        <div className="flex items-center gap-1 bg-zinc-800/60 p-1 rounded-xl border border-zinc-700/50">
          <button
            type="button"
            disabled={set.completed || set.skipped}
            onClick={() => handleAdjustReps(-1)}
            aria-label="Decrease reps by 1"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-zinc-700/60 hover:bg-zinc-600 disabled:opacity-30 text-zinc-200 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neonLime cursor-pointer"
            title="-1 rep"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-baseline gap-1 px-1 min-w-[48px] justify-center">
            <input
              type="number"
              disabled={set.completed || set.skipped}
              value={reps}
              aria-label="Reps completed"
              onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-10 bg-transparent text-center font-black text-sm text-slate-100 focus:outline-none focus:text-neonLime"
            />
            <span className="text-[10px] text-zinc-400 font-semibold" aria-hidden="true">reps</span>
          </div>

          <button
            type="button"
            disabled={set.completed || set.skipped}
            onClick={() => handleAdjustReps(1)}
            aria-label="Increase reps by 1"
            className="min-h-[36px] min-w-[36px] rounded-lg bg-zinc-700/60 hover:bg-zinc-600 disabled:opacity-30 text-zinc-200 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neonLime cursor-pointer"
            title="+1 rep"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Optional RPE Selector */}
        <div className="hidden md:flex items-center gap-1">
          <select
            disabled={set.completed || set.skipped}
            value={rpe ?? ''}
            aria-label="Rate of Perceived Exertion (RPE)"
            onChange={(e) =>
              setRpe(e.target.value ? parseInt(e.target.value) : undefined)
            }
            className="bg-zinc-800/80 text-zinc-300 text-xs rounded-lg border border-zinc-700/60 px-2 py-1.5 focus:outline-none focus:border-neonLime"
          >
            <option value="">RPE</option>
            {[6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num}>
                RPE {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Column: Actions (Complete / Skip) */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {!set.completed && !set.skipped && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            aria-label={`Skip set ${set.setNumber}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
            title="Skip Set"
          >
            <SkipForward className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          disabled={set.completed || set.skipped || isSubmitting}
          onClick={handleComplete}
          aria-label={
            set.completed
              ? `Set ${set.setNumber} completed`
              : isSubmitting
              ? `Saving set ${set.setNumber}...`
              : `Complete set ${set.setNumber}`
          }
          className={`min-h-[44px] px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime ${
            set.completed
              ? 'bg-neonLime/20 text-neonLime border border-neonLime/40 cursor-default'
              : isSubmitting
              ? 'bg-neonLime/50 text-black cursor-wait opacity-80'
              : 'bg-neonLime hover:bg-neonLime/90 text-black shadow-[0_0_10px_rgba(204,255,0,0.2)] active:scale-95 cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          )}
          <span>{set.completed ? 'Done' : isSubmitting ? 'Saving...' : 'Complete'}</span>
        </button>
      </div>
    </div>
  );
};

export const SetRow = React.memo<SetRowProps>(SetRowComponent, (prev, next) => {
  return (
    prev.set.id === next.set.id &&
    prev.set.completed === next.set.completed &&
    prev.set.skipped === next.set.skipped &&
    prev.set.actualReps === next.set.actualReps &&
    prev.set.actualWeight === next.set.actualWeight &&
    prev.set.targetReps === next.set.targetReps &&
    prev.set.targetWeight === next.set.targetWeight &&
    prev.set.rpe === next.set.rpe &&
    prev.isCurrent === next.isCurrent &&
    prev.exerciseId === next.exerciseId &&
    prev.previousBest?.reps === next.previousBest?.reps &&
    prev.previousBest?.weight === next.previousBest?.weight
  );
});
SetRow.displayName = 'SetRow';
