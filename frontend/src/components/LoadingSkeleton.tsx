import React from 'react';

// ─── Shimmer base ─────────────────────────────────────────────────────────────

const shimmer =
  'animate-pulse bg-zinc-900 border border-zinc-800/60';

// ─── Variants ─────────────────────────────────────────────────────────────────

/**
 * Stat card skeleton — matches the glass-panel stat cards across the app.
 */
export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${shimmer} rounded-2xl p-5 flex flex-col gap-3 ${className}`}>
    <div className="h-3 w-24 rounded bg-zinc-800" />
    <div className="h-7 w-16 rounded bg-zinc-800" />
    <div className="h-2 w-full rounded bg-zinc-800/60 mt-1" />
  </div>
);

/**
 * Row skeleton — matches a list / history row item.
 */
export const RowSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${shimmer} rounded-xl p-3 flex items-center gap-3 ${className}`}>
    <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/2 rounded bg-zinc-800" />
      <div className="h-2 w-1/3 rounded bg-zinc-800/60" />
    </div>
    <div className="w-8 h-8 rounded-lg bg-zinc-800 shrink-0" />
  </div>
);

/**
 * Card skeleton — generic panel placeholder.
 */
export const CardSkeleton: React.FC<{ height?: string; className?: string }> = ({
  height = 'h-40',
  className = '',
}) => (
  <div className={`${shimmer} rounded-2xl ${height} ${className}`} />
);

/**
 * Inline text skeleton — for replacing text lines during loading.
 */
export const TextSkeleton: React.FC<{ width?: string; className?: string }> = ({
  width = 'w-32',
  className = '',
}) => (
  <span className={`inline-block h-4 rounded ${shimmer} ${width} ${className}`} />
);

/**
 * Page-level skeleton grid — for full-page stat dashboards.
 */
export const StatGridSkeleton: React.FC<{ count?: number; cols?: string }> = ({
  count = 4,
  cols = 'grid-cols-2 lg:grid-cols-4',
}) => (
  <div className={`grid ${cols} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);
