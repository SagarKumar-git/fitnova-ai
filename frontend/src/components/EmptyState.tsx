import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState — reusable component for zero-data states across all pages.
 * Shows an icon, title, optional description, and optional CTA button.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-zinc-600" aria-hidden="true" />
        </div>
      )}

      <h3 className="text-sm font-bold text-zinc-300 mb-1">{title}</h3>

      {description && (
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">{description}</p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 min-h-[44px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-neonLime/40 text-zinc-300 hover:text-neonLime font-semibold text-xs uppercase tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
