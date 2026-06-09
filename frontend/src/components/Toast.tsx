import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;  // ms, default 4000
  onDismiss?: () => void;
}

const VARIANT_CONFIG: Record<ToastVariant, {
  icon: React.ReactNode;
  classes: string;
  barClass: string;
}> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 text-neonLime shrink-0" />,
    classes: 'bg-zinc-950 border-neonLime/40 text-slate-100',
    barClass: 'bg-neonLime',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
    classes: 'bg-zinc-950 border-red-500/40 text-slate-100',
    barClass: 'bg-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    classes: 'bg-zinc-950 border-amber-500/40 text-slate-100',
    barClass: 'bg-amber-400',
  },
  info: {
    icon: <Info className="w-4 h-4 text-neonCyan shrink-0" />,
    classes: 'bg-zinc-950 border-neonCyan/40 text-slate-100',
    barClass: 'bg-neonCyan',
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const config = VARIANT_CONFIG[variant];

  const dismiss = useCallback(() => {
    setVisible(false);
    // Wait for exit animation before calling onDismiss
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  useEffect(() => {
    // Trigger enter animation on mount
    const enterTimer = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(dismiss, duration);
    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [dismiss, duration]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed bottom-6 right-4 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm
        flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl
        transition-all duration-300 ease-out
        ${config.classes}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="mt-0.5">{config.icon}</div>
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={dismiss}
        className="p-0.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${config.barClass}`}
        style={{
          animation: `shrinkBar ${duration}ms linear forwards`,
          width: '100%',
        }}
      />

      <style>{`
        @keyframes shrinkBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Hook — useToast
// Manages a queue of toasts. Import and use anywhere.
// ---------------------------------------------------------------------------
interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ToastContainer: React.FC = useCallback(() => (
    <div className="fixed bottom-0 right-0 z-[9999] p-4 sm:p-6 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t, idx) => (
        <div key={t.id} style={{ transform: `translateY(-${idx * 4}px)` }} className="pointer-events-auto">
          <Toast
            message={t.message}
            variant={t.variant}
            onDismiss={() => dismissToast(t.id)}
          />
        </div>
      ))}
    </div>
  ), [toasts, dismissToast]) as React.FC;

  return { showToast, ToastContainer };
}
