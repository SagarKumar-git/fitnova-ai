/**
 * FitNova AI — Offline Indicator
 * Subtle, non-blocking banner that alerts users to connectivity loss
 * and informs them that changes are queued locally.
 */

import React from 'react';
import { useNetworkStatus } from '../platform/container/PlatformContext.tsx';
import { WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator: React.FC = () => {
  const network = useNetworkStatus();

  return (
    <AnimatePresence>
      {!network.isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-md text-zinc-950 px-4 py-2 text-xs font-bold shadow-lg border-b border-amber-600 flex items-center justify-between"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-center gap-2 text-center">
            <WifiOff className="w-4 h-4 shrink-0 text-zinc-950" />
            <span>
              You are currently offline. Local changes will queue and sync when connection is restored.
            </span>
            <div className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-zinc-950/20 px-2 py-0.5 rounded-full font-mono">
              <AlertCircle className="w-3 h-3" />
              Offline Mode
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
