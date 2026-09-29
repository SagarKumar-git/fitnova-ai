/**
 * FitNova AI — Sync Status Badge
 * Visual indicator for network/sync state during active workouts.
 * Shows: Online (green), Offline (amber), Syncing (blue), Recovered (purple), Sync Failed (red).
 * Sprint 3.6 — UI Observability.
 */

import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type WorkoutSyncState = 'online' | 'offline' | 'syncing' | 'recovered' | 'sync_failed';

export interface SyncStatusBadgeProps {
  syncState: WorkoutSyncState;
  pendingCount?: number;
  onRetry?: () => void;
}

const BADGE_CONFIG: Record<
  WorkoutSyncState,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
    Icon: React.FC<{ className?: string }>;
    animate?: boolean;
  }
> = {
  online: {
    label: 'Online',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    Icon: CheckCircle2,
  },
  offline: {
    label: 'Offline',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    dotClass: 'bg-amber-400',
    Icon: WifiOff,
  },
  syncing: {
    label: 'Syncing',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    dotClass: 'bg-blue-400',
    Icon: RefreshCw,
    animate: true,
  },
  recovered: {
    label: 'Recovered',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    dotClass: 'bg-purple-400',
    Icon: RefreshCw,
  },
  sync_failed: {
    label: 'Sync Failed',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-400',
    Icon: AlertTriangle,
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  syncState,
  pendingCount,
  onRetry,
}) => {
  const config = BADGE_CONFIG[syncState];
  const { Icon } = config;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${config.bgClass} ${config.textClass} ${config.borderClass} transition-all duration-300`}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${config.label}${pendingCount ? `, ${pendingCount} pending` : ''}`}
    >
      <Icon
        className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`}
      />
      <span>{config.label}</span>
      {pendingCount !== undefined && pendingCount > 0 && syncState === 'offline' && (
        <span className="ml-0.5 px-1.5 py-0.5 bg-amber-500/20 rounded-full text-[9px]">
          {pendingCount}
        </span>
      )}
      {syncState === 'sync_failed' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 px-1.5 py-0.5 bg-red-500/20 hover:bg-red-500/30 rounded text-[9px] transition-colors"
          aria-label="Retry sync"
        >
          Retry
        </button>
      )}
    </div>
  );
};
