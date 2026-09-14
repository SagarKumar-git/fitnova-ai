/**
 * FitNova AI — Notification Toast Container
 * Renders platform notifications from NotificationService with animations,
 * TTL auto-dismissal, accessible ARIA roles, and type-specific styling.
 */

import React from 'react';
import { useActiveNotifications, useNotificationService } from '../platform/container/PlatformContext.tsx';
import type { NotificationItem, NotificationType } from '../platform/types/index.ts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Award,
  Sparkles,
  Dumbbell,
  Apple,
  Cpu,
  X,
} from 'lucide-react';

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; border: string; bg: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-500/40',
    bg: 'bg-zinc-900/95',
    text: 'text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    border: 'border-red-500/40',
    bg: 'bg-zinc-900/95',
    text: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-500/40',
    bg: 'bg-zinc-900/95',
    text: 'text-amber-400',
  },
  info: {
    icon: Info,
    border: 'border-cyan-500/40',
    bg: 'bg-zinc-900/95',
    text: 'text-cyan-400',
  },
  achievement: {
    icon: Award,
    border: 'border-amber-400/50',
    bg: 'bg-zinc-900/95',
    text: 'text-amber-300',
  },
  ai: {
    icon: Sparkles,
    border: 'border-neonLime/50',
    bg: 'bg-zinc-900/95',
    text: 'text-neonLime',
  },
  workout: {
    icon: Dumbbell,
    border: 'border-indigo-500/40',
    bg: 'bg-zinc-900/95',
    text: 'text-indigo-400',
  },
  nutrition: {
    icon: Apple,
    border: 'border-emerald-400/40',
    bg: 'bg-zinc-900/95',
    text: 'text-emerald-300',
  },
  system: {
    icon: Cpu,
    border: 'border-zinc-700/50',
    bg: 'bg-zinc-900/95',
    text: 'text-zinc-300',
  },
};

export const NotificationToastContainer: React.FC = () => {
  const notifications = useActiveNotifications();
  const service = useNotificationService();

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {notifications.map((item: NotificationItem) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border ${config.border} ${config.bg} backdrop-blur-xl shadow-2xl relative overflow-hidden`}
              role="status"
            >
              <div className={`p-2 rounded-xl bg-zinc-950/60 shrink-0 ${config.text}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-extrabold text-sm text-white tracking-tight leading-snug">
                  {item.title}
                </h4>
                <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed break-words">
                  {item.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => service.dismiss(item.id)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
