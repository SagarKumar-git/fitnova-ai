import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionExpiredBanner } from '../components/ProtectedRoute';
import { Mail, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  InteractiveBackground,
  ClickRipple,
  CursorGlow,
  AuthBranding,
  AuthCard,
  AuthInput,
  AuthButton,
  type AuthButtonStatus,
} from '../components/auth';

export const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<AuthButtonStatus>('idle');
  const [isNavigatingOut, setIsNavigatingOut] = useState(false);

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Check state passed from registration or session expiry
  useEffect(() => {
    const state = location.state as { registered?: boolean; email?: string; sessionExpiredMessage?: string } | null;
    if (state?.registered) {
      setSuccess('Account created successfully! Please sign in.');
      if (state.email) {
        setEmail(state.email);
      }
    }
  }, [location]);

  // If already authenticated and not in an active login flow, redirect immediately
  useEffect(() => {
    if (isAuthenticated && user && loginStatus === 'idle') {
      if (user.has_profile) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/profile-setup', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, loginStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginStatus === 'submitting' || loginStatus === 'success') {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoginStatus('submitting');

    try {
      await login(email.trim(), password);
      // Login successful: show success state briefly then trigger smooth exit transition
      setLoginStatus('success');

      exitTimerRef.current = setTimeout(() => {
        setIsNavigatingOut(true);

        exitTimerRef.current = setTimeout(() => {
          const storedUserStr = localStorage.getItem('fitnova_user');
          let hasProfile = false;
          if (storedUserStr) {
            try {
              const parsed = JSON.parse(storedUserStr);
              hasProfile = Boolean(parsed.has_profile);
            } catch {
              hasProfile = Boolean(user?.has_profile);
            }
          } else {
            hasProfile = Boolean(user?.has_profile);
          }

          if (hasProfile) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/profile-setup', { replace: true });
          }
        }, 300);
      }, 550);

    } catch (err: unknown) {
      setLoginStatus('failed');
      const rawMessage = err instanceof Error ? err.message : 'Invalid email or password. Please try again.';

      // User-friendly error message sanitization: do not expose internal/backend traces
      let sanitized = 'Invalid email or password. Please try again.';
      if (
        rawMessage.toLowerCase().includes('failed to fetch') ||
        rawMessage.toLowerCase().includes('network') ||
        rawMessage.toLowerCase().includes('load failed')
      ) {
        sanitized = 'Unable to connect to the authentication server. Please check your connection and try again.';
      } else if (
        rawMessage &&
        !rawMessage.toLowerCase().includes('internal') &&
        !rawMessage.toLowerCase().includes('traceback') &&
        !rawMessage.toLowerCase().includes('500')
      ) {
        sanitized = rawMessage;
      }

      setError(sanitized);

      // Revert button state back to idle after a brief indicator
      resetTimerRef.current = setTimeout(() => {
        setLoginStatus('idle');
      }, 2200);
    }
  };

  const isSubmitting = loginStatus === 'submitting';

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-[#39FF14]/30 selection:text-white">
      {/* Live GPU-accelerated interactive canvas background */}
      <InteractiveBackground />

      {/* Click neon energy ripple effect */}
      <ClickRipple />

      {/* Subtle cursor follower and ambient trailing glow (desktop only) */}
      <CursorGlow />

      {/* Main Auth Content Container */}
      <div className="w-full flex flex-col items-center justify-center relative z-10 my-auto">
        {/* Top Branding */}
        <AuthBranding subtitle="Your intelligent athletic partner" />

        {/* Glassmorphism Auth Card */}
        <AuthCard hasError={Boolean(error)} isNavigatingOut={isNavigatingOut}>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sign in to FitNova
            </h2>
            <p className="text-xs text-[#94A3B8] font-medium mt-1">
              Access your intelligent training and nutrition metrics
            </p>
          </div>

          {/* Session expired banner — shown when redirected from a protected route */}
          <SessionExpiredBanner />

          {/* Registration Success Notification */}
          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-[#39FF14]/30 flex items-start gap-3 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
              <CheckCircle2 className="w-5 h-5 text-[#39FF14] shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-emerald-200 font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email Address */}
            <AuthInput
              id="email"
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="athlete@fitnova.ai"
              value={email}
              disabled={isSubmitting || loginStatus === 'success'}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            {/* Password */}
            <AuthInput
              id="password"
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              disabled={isSubmitting || loginStatus === 'success'}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
            />

            {/* Error Message Callout */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 shadow-[0_0_15px_rgba(244,63,94,0.15)] flex items-start gap-3 animate-fade-in"
              >
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-rose-200 font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <AuthButton
                id="login-submit-btn"
                type="submit"
                status={loginStatus}
                submittingText="Signing in..."
                successText="Welcome back!"
                failedText="Sign In Failed"
              >
                SIGN IN
              </AuthButton>
            </div>
          </form>

          {/* Redirection */}
          <div className="text-center mt-6 pt-5 border-t border-[rgba(163,255,0,0.12)]">
            <p className="text-xs text-[#94A3B8]">
              New to FitNova?{' '}
              <Link
                to="/register"
                className="text-[#39FF14] hover:text-[#DFFF00] font-bold transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(57,255,20,0.5)] underline underline-offset-4"
              >
                Create an Account
              </Link>
            </p>
          </div>
        </AuthCard>
      </div>
    </div>
  );
};
