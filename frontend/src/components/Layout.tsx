/**
 * FitNova AI — Application Layout
 * Integrated with Platform StorageService, OfflineIndicator, and NotificationToastContainer.
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator.tsx';
import { NotificationToastContainer } from './NotificationToastContainer.tsx';
import { useStorage } from '../platform/container/PlatformContext.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const storage = useStorage();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    // 1. Try platform storage
    const stored = storage.getJSON<boolean>('sidebar_collapsed');
    if (stored !== null) return stored;

    // 2. Backward compatibility: check legacy localStorage key
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('sidebar-collapsed');
        if (saved) {
          const parsed = JSON.parse(saved);
          storage.setJSON('sidebar_collapsed', parsed);
          return parsed;
        }
      } catch {
        // Safe fallback
      }
    }
    return false;
  });

  const handleSetCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    setIsCollapsed((prev: boolean) => {
      const next = typeof val === 'function' ? val(prev) : val;
      storage.setJSON('sidebar_collapsed', next);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sidebar-collapsed', JSON.stringify(next));
        } catch {
          // Safe swallow
        }
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-darkBg text-slate-100 relative overflow-hidden">
      {/* Platform Offline Warning Banner */}
      <OfflineIndicator />

      {/* Platform Centralized Notification Toasts */}
      <NotificationToastContainer />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-neonLime to-neonCyan rounded-lg flex items-center justify-center neon-glow-lime">
            <span className="text-black font-black text-sm">F</span>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            FITNOVA <span className="text-neonLime">AI</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar Navigation Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:static lg:flex-shrink-0 transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-64 lg:w-20' : 'w-64'}`}
      >
        <Sidebar
          onClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isCollapsed}
          setIsCollapsed={handleSetCollapsed}
        />
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full px-4 py-6 pt-20 lg:pt-8 lg:px-10 relative">
          {/* Background glow dots for premium startup vibe */}
          <div
            className="fixed top-0 right-0 w-96 h-96 bg-neonLime/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 w-96 h-96 bg-neonCyan/5 rounded-full blur-3xl pointer-events-none pulse-glow-bg"
            aria-hidden="true"
          />

          <div className="w-full max-w-7xl mx-auto relative z-10">{children}</div>
        </div>
      </main>
    </div>
  );
};
