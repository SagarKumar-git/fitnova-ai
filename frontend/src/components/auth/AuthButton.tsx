import React from 'react';
import { LoadingSpinner } from '../../design-system/feedback/LoadingSpinner';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export type AuthButtonStatus = 'idle' | 'submitting' | 'success' | 'failed';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: AuthButtonStatus;
  submittingText?: string;
  successText?: string;
  failedText?: string;
  children: React.ReactNode;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  status = 'idle',
  submittingText = 'Signing in...',
  successText = 'Welcome back!',
  failedText = 'Sign In Failed',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const isBusy = status === 'submitting';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  return (
    <button
      {...props}
      disabled={disabled || isBusy || isSuccess}
      aria-busy={isBusy}
      className={`w-full h-12 px-6 rounded-xl font-black tracking-wider uppercase text-sm flex items-center justify-center relative overflow-hidden select-none transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39FF14] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817] cursor-pointer ${
        isBusy
          ? 'bg-gradient-to-r from-[#39FF14]/90 via-[#A8FF00]/90 to-[#DFFF00]/90 text-[#020817] opacity-90 cursor-wait shadow-[0_0_20px_rgba(57,255,20,0.3)]'
          : isSuccess
          ? 'bg-gradient-to-r from-[#10B981] to-[#39FF14] text-[#020817] shadow-[0_0_30px_rgba(57,255,20,0.5)] scale-[1.015]'
          : isFailed
          ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
          : 'bg-gradient-to-r from-[#39FF14] via-[#A8FF00] to-[#DFFF00] text-[#020817] hover:brightness-105 hover:shadow-[0_0_25px_rgba(57,255,20,0.45)] hover:-translate-y-0.5 hover:scale-[1.015] active:scale-[0.98]'
      } ${className}`}
    >
      {/* Subtle sweeping sheen shimmer */}
      {!isBusy && !isSuccess && !isFailed && <span className="btn-shimmer-sweep" />}

      {/* Button Content Based on Status */}
      {isBusy && (
        <span className="flex items-center justify-center gap-2.5 text-[#020817] font-bold" role="status" aria-live="polite">
          <LoadingSpinner size="sm" className="text-[#020817] shrink-0 border-[#020817] border-r-transparent" />
          <span className="tracking-normal normal-case font-extrabold">{submittingText}</span>
        </span>
      )}

      {isSuccess && (
        <span className="flex items-center justify-center gap-2 text-[#020817] font-black" role="status" aria-live="polite">
          <CheckCircle2 className="w-5 h-5 text-[#020817] shrink-0 animate-bounce" />
          <span className="tracking-normal normal-case">{successText}</span>
        </span>
      )}

      {isFailed && (
        <span className="flex items-center justify-center gap-2 text-white font-bold" role="alert" aria-live="assertive">
          <AlertTriangle className="w-5 h-5 text-white shrink-0" />
          <span className="tracking-normal normal-case">{failedText}</span>
        </span>
      )}

      {status === 'idle' && children}
    </button>
  );
};
