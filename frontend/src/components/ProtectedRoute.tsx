import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireProfile = true,
  requireAdmin = false
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile setup is required but user has not done it, force redirect to profile-setup
  if (requireProfile && user && !user.has_profile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // If admin is required but user is not an admin, redirect to dashboard
  if (requireAdmin && user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
