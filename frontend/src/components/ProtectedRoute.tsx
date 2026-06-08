import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireProfile = true,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, user, sessionExpired, clearSessionExpired } = useAuth();
  const location = useLocation();

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          {/* Glowing ring */}
          <div className="absolute -inset-1 bg-gradient-to-r from-neonLime to-neonCyan rounded-full blur opacity-30 animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-zinc-900 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-neonLime border-r-neonCyan rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-zinc-400 font-semibold tracking-wider uppercase text-xs">Initializing FitNova AI</p>
      </div>
    );
  }

  // ── Session expired — redirect to /login with banner state ─────────────────
  if (!isAuthenticated && sessionExpired) {
    clearSessionExpired();
    return (
      <Navigate
        to="/login"
        state={{ from: location, sessionExpiredMessage: 'Your session has expired. Please log in again.' }}
        replace
      />
    );
  }

  // ── Not authenticated — redirect to /login ─────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Profile required but not set up ───────────────────────────────────────
  if (requireProfile && user && !user.has_profile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // ── Admin required but user is not admin ──────────────────────────────────
  if (requireAdmin && user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// SessionExpiredBanner — import and render inside Login page
// Reads the message from react-router location state and auto-dismisses.
// ---------------------------------------------------------------------------
export const SessionExpiredBanner: React.FC = () => {
  const location = useLocation();
  const message: string | undefined = (location.state as { sessionExpiredMessage?: string })?.sessionExpiredMessage;

  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-700/40 bg-amber-950/40 animate-fade-in"
    >
      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-200 font-medium">{message}</p>
    </div>
  );
};
