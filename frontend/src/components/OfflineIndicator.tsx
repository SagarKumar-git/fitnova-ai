/**
 * FitNova AI — Offline Indicator
 * Subtle, non-blocking banner that alerts users to connectivity loss
 * and informs them that changes are queued locally, with manual retry check.
 */

import React, { useState } from 'react';
import { useNetworkStatus, useNetworkService } from '../platform/container/PlatformContext.tsx';
import { WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator: React.FC = () => {
  const network = useNetworkStatus();
  const networkService = useNetworkService();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = () => {
    setIsChecking(true);
    if (typeof navigator !== 'undefined' && networkService) {
      networkService.setOnline(navigator.onLine);
    }
    setTimeout(() => setIsChecking(false), 500);
  };

  return (
    <AnimatePresence>
      {!network.isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 backdrop-blur-md text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-lg border-b border-amber-600 flex items-center justify-between"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-zinc-950" aria-hidden="true" />
              <span>
                You are currently offline. Local changes will queue and sync when connection is restored.
              </span>
              <div className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-zinc-950/20 px-2 py-0.5 rounded-full font-mono">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                Offline Mode
              </div>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              disabled={isChecking}
              className="min-h-[44px] px-3.5 py-1 bg-zinc-950 hover:bg-zinc-900 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 cursor-pointer shrink-0"
              aria-label="Check internet connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
