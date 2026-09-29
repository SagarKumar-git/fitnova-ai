/**
 * FitNova AI — SubstituteExerciseDialog Component
 * Adaptive exercise substitution modal allowing users to filter by unavailable equipment
 * or injury restrictions and select biomechanically compatible alternatives with compatibility scores.
 */

import React, { useState, useMemo } from 'react';
import type { Exercise } from '../models/Exercise.ts';
import type { Equipment } from '../types/enums.ts';
import { ExerciseSubstitutionEngine } from '../intelligence/ExerciseSubstitutionEngine.ts';
import { NovaAvatar } from '../../../design-system/ai/NovaAvatar/index.tsx';
import {
  X,
  Shuffle,
  AlertCircle,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export interface SubstituteExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalExercise: Exercise;
  allExercises: Exercise[];
  onConfirmSubstitute: (substitute: Exercise) => Promise<void> | void;
}

const ALL_EQUIPMENT_OPTIONS: Equipment[] = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Bands',
];

const INJURY_RESTRICTION_OPTIONS = [
  { id: 'Shoulders', label: 'Shoulders / Delts' },
  { id: 'Lower Back', label: 'Lower Back / Spine' },
  { id: 'Knees', label: 'Knees / Patella' },
  { id: 'Elbows', label: 'Elbows / Triceps' },
  { id: 'Wrists', label: 'Wrists' },
];

export const SubstituteExerciseDialog: React.FC<SubstituteExerciseDialogProps> = ({
  isOpen,
  onClose,
  originalExercise,
  allExercises,
  onConfirmSubstitute,
}) => {
  // Available equipment selection (defaults to all)
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>(ALL_EQUIPMENT_OPTIONS);
  // Injury/fatigue muscle exclusions
  const [excludedMuscles, setExcludedMuscles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const substitutionEngine = useMemo(() => new ExerciseSubstitutionEngine(), []);

  // Compute matching substitutes dynamically
  const substitutes = useMemo(() => {
    if (!originalExercise) return [];
    return substitutionEngine.findSubstitutes(originalExercise, allExercises, {
      availableEquipment,
      excludeInjuredMuscles: excludedMuscles,
    });
  }, [substitutionEngine, originalExercise, allExercises, availableEquipment, excludedMuscles]);

  // Handle Escape key to close dialog
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleEquipment = (eq: Equipment) => {
    setAvailableEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]
    );
  };

  const toggleMuscleExclusion = (muscle: string) => {
    setExcludedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((item) => item !== muscle) : [...prev, muscle]
    );
  };

  const handleSelectSubstitute = async (substitute: Exercise) => {
    try {
      setIsSubmitting(true);
      await onConfirmSubstitute(substitute);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitute-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neonLime/10 text-neonLime flex items-center justify-center font-black shrink-0" aria-hidden="true">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-neonLime">
                  Adaptive Movement Replacement
                </span>
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                  Zero Progress Loss
                </span>
              </div>
              <h3 id="substitute-dialog-title" className="text-xl font-black text-white">
                Substitute {originalExercise.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
            aria-label="Close substitute exercise dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Filters Section */}
        <div className="p-4 sm:px-6 bg-zinc-950/40 border-b border-zinc-800/60 space-y-3">
          {/* Equipment Availability Filter */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-neonLime" /> Available Equipment in Gym
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ALL_EQUIPMENT_OPTIONS.map((eq) => {
                const isActive = availableEquipment.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    aria-pressed={isActive}
                    className={`min-h-[36px] text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime ${
                      isActive
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-500 hover:text-zinc-400 line-through opacity-60'
                    }`}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Injury / Fatigue Restriction Filter */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" /> Fatigue / Joint Discomfort Exclusions
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {INJURY_RESTRICTION_OPTIONS.map((opt) => {
                const isExcluded = excludedMuscles.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleMuscleExclusion(opt.id)}
                    aria-pressed={isExcluded}
                    className={`min-h-[36px] text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isExcluded
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isExcluded ? `Excluding ${opt.label}` : `Exclude ${opt.label}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Substitutes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
            <span>
              Found <strong className="text-white">{substitutes.length}</strong> compatible movements
            </span>
            <span className="flex items-center gap-1 text-[11px] text-neonLime font-bold">
              <Sparkles className="w-3 h-3" /> Biomechanically Ranked
            </span>
          </div>

          {substitutes.length === 0 ? (
            <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-800">
              <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-300">
                No substitutes found matching your current equipment & restriction filters.
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Try enabling more equipment options or clearing joint exclusions.
              </p>
            </div>
          ) : (
            substitutes.map((sub) => {
              const scorePct = Math.round(sub.matchScore * 100);
              const scoreColor =
                scorePct >= 80
                  ? 'text-neonLime bg-neonLime/10 border-neonLime/30'
                  : scorePct >= 60
                  ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/30';

              return (
                <div
                  key={sub.substituteExercise.id}
                  className="group bg-zinc-950/60 hover:bg-zinc-950/90 border border-zinc-800 hover:border-neonLime/50 rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-full border ${scoreColor}`}
                      >
                        {scorePct}% Match
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                        {sub.substituteExercise.equipment}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                        {sub.substituteExercise.primaryMuscleGroup}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white group-hover:text-neonLime transition-colors">
                      {sub.substituteExercise.name}
                    </h4>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {sub.reason}
                    </p>

                    <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <span>Shared Target Muscles:</span>
                      <span className="text-zinc-400 font-semibold">
                        {sub.sharedMuscles.join(', ')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSelectSubstitute(sub.substituteExercise)}
                    aria-label={`Replace exercise with ${sub.substituteExercise.name}`}
                    className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-neonLime hover:bg-neonLime/90 disabled:opacity-50 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.2)] transition-all active:scale-95 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-neonLime cursor-pointer"
                  >
                    <span>Replace Exercise</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <NovaAvatar size="sm" state="coaching" />
            <span>Nova will update remaining working sets while keeping logged progress intact.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-bold hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
            aria-label="Cancel exercise substitution"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
