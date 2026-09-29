/**
 * FitNova AI — ProgressionSuggestion Component
 * Real-time progressive overload decision card displaying previous performance,
 * current performance, recommended next weight/reps, Nova explanation, and accept/modify actions.
 */

import React from 'react';
import type { ProgressionRecommendation } from '../intelligence/types.ts';
import { NovaAvatar } from '../../../design-system/ai/NovaAvatar/index.tsx';
import {
  TrendingUp,
  ArrowUpRight,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export interface ProgressionSuggestionProps {
  exerciseName: string;
  previousPerformance: {
    weight: number;
    reps: number;
    rpe?: number;
  };
  currentPerformance: {
    weight: number;
    reps: number;
    rpe?: number;
  };
  recommendation: ProgressionRecommendation;
  onAccept: (weight: number, reps: number) => void;
  onDismiss?: () => void;
  className?: string;
}

export const ProgressionSuggestion: React.FC<ProgressionSuggestionProps> = ({
  exerciseName,
  previousPerformance,
  currentPerformance,
  recommendation,
  onAccept,
  onDismiss,
  className = '',
}) => {
  const isWeightIncrease = recommendation.action === 'weight_increase';
  const isRepIncrease = recommendation.action === 'rep_increase';
  const isDeload = recommendation.action === 'deload' || recommendation.action === 'weight_decrease';

  const deltaText = isWeightIncrease
    ? `+${recommendation.weightDeltaKg} kg`
    : isRepIncrease
    ? `+${recommendation.repsDelta} reps`
    : isDeload
    ? `${recommendation.weightDeltaKg} kg`
    : 'Maintain';

  const deltaBadgeColor = isWeightIncrease
    ? 'text-neonLime bg-neonLime/10 border-neonLime/30'
    : isRepIncrease
    ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
    : isDeload
    ? 'text-rose-400 bg-rose-400/10 border-rose-400/30'
    : 'text-zinc-400 bg-zinc-800 border-zinc-700';

  return (
    <div
      role="region"
      aria-label={`Progressive overload recommendation for ${exerciseName}`}
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/95 border border-neonLime/40 p-4 sm:p-5 shadow-[0_0_20px_rgba(204,255,0,0.12)] backdrop-blur-md space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-neonLime/20 text-neonLime flex items-center justify-center font-black" aria-hidden="true">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-neonLime">
                Progressive Overload
              </span>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                {Math.round(recommendation.confidence * 100)}% Confidence
              </span>
            </div>
            <h4 className="text-sm font-black text-white">{exerciseName}</h4>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss recommendation"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
            title="Dismiss Suggestion"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Comparison Grid: Previous vs Today vs Next Recommendation */}
      <div className="grid grid-cols-3 gap-2 py-1">
        {/* Previous */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
            Previous
          </span>
          <span className="text-sm font-black text-zinc-300 font-mono block mt-0.5">
            {previousPerformance.weight}kg × {previousPerformance.reps}
          </span>
          {previousPerformance.rpe && (
            <span className="text-[10px] text-zinc-500">@ RPE {previousPerformance.rpe}</span>
          )}
        </div>

        {/* Today */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">
            Today
          </span>
          <span className="text-sm font-black text-white font-mono block mt-0.5">
            {currentPerformance.weight}kg × {currentPerformance.reps}
          </span>
          {currentPerformance.rpe && (
            <span className="text-[10px] text-amber-400">@ RPE {currentPerformance.rpe}</span>
          )}
        </div>

        {/* Next Recommendation */}
        <div className="bg-neonLime/10 border border-neonLime/30 rounded-xl p-2.5 text-center relative overflow-hidden">
          <span className="text-[10px] text-neonLime font-bold block uppercase tracking-wider">
            Next Target
          </span>
          <span className="text-sm font-black text-neonLime font-mono block mt-0.5">
            {recommendation.recommendedWeightKg}kg × {recommendation.recommendedReps}
          </span>
          <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${deltaBadgeColor} inline-block mt-0.5`}>
            {deltaText}
          </span>
        </div>
      </div>

      {/* Nova Explanation speech callout */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
        <NovaAvatar size="sm" state="coaching" className="shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-black text-neonLime">Nova Rationale</span>
            <Sparkles className="w-3 h-3 text-neonLime" aria-hidden="true" />
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-medium">
            "{recommendation.reason}"
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Keep current target"
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
          >
            Keep Current
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            onAccept(
              recommendation.recommendedWeightKg,
              recommendation.recommendedReps
            )
          }
          aria-label={`Accept recommendation of ${recommendation.recommendedWeightKg} kilograms for ${recommendation.recommendedReps} reps`}
          className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.25)] transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
          <span>Accept Recommendation ({recommendation.recommendedWeightKg}kg)</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
