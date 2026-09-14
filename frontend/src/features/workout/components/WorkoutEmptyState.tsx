/**
 * FitNova AI — WorkoutEmptyState Component
 * Clean, modern empty state for workout lists, filters, and history screens.
 */

import React from 'react';
import { Dumbbell } from 'lucide-react';

export interface WorkoutEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const WorkoutEmptyState: React.FC<WorkoutEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 flex items-center justify-center mb-4">
        {icon || <Dumbbell className="w-8 h-8 stroke-[1.5]" />}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="h-10 px-5 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black font-extrabold text-xs shadow-md transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
