/**
 * FitNova AI — ExerciseCard Component
 * Displays exercise details with expandable step-by-step instructions.
 */

import React, { useState } from 'react';
import type { Exercise } from '../models/Exercise.ts';
import { ChevronDown, ChevronUp, Timer, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface ExerciseCardProps {
  exercise: Exercise;
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  restSeconds?: number;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  targetSets,
  targetReps,
  targetWeight,
  restSeconds,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 transition-all hover:border-zinc-700/80">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-neonLime bg-neonLime/10 border border-neonLime/20 px-2 py-0.5 rounded">
              {exercise.primaryMuscleGroup}
            </span>
            <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded">
              {exercise.equipment}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              {exercise.difficulty}
            </span>
          </div>

          <h4 className="text-base font-bold text-slate-100">{exercise.name}</h4>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{exercise.description}</p>
        </div>

        <div className="flex items-center gap-3">
          {(targetSets || targetReps) && (
            <div className="text-right">
              <span className="text-sm font-extrabold text-slate-100 block">
                {targetSets ?? 3} × {targetReps ?? 10}
              </span>
              {targetWeight !== undefined && targetWeight > 0 && (
                <span className="text-[11px] text-zinc-400 font-medium">
                  {targetWeight} kg
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            className="p-1 text-zinc-400 hover:text-slate-100 transition-colors"
            aria-label={isExpanded ? 'Collapse exercise details' : 'Expand exercise details'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Rest Duration Bar */}
      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-zinc-800/40 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <Timer className="w-3.5 h-3.5 text-zinc-500" />
          Rest: {restSeconds ?? exercise.defaultRestSeconds}s
        </span>
        {exercise.secondaryMuscleGroups.length > 0 && (
          <span className="text-[11px] text-zinc-500">
            Also targets: {exercise.secondaryMuscleGroups.join(', ')}
          </span>
        )}
      </div>

      {/* Expandable Instructions & Tips */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-3 animate-fadeIn">
          {exercise.instructions.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Execution Steps
              </h5>
              <ol className="space-y-1.5 list-decimal list-inside text-xs text-zinc-400 leading-relaxed">
                {exercise.instructions.map((step, idx) => (
                  <li key={idx} className="pl-1">
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {exercise.tips.length > 0 && (
            <div className="bg-zinc-950/60 rounded-lg p-2.5 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Form Tips
              </div>
              <ul className="space-y-1 text-xs text-zinc-400">
                {exercise.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-neonLime mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
