import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionExpiredBanner } from '../components/ProtectedRoute';
import { Activity, Mail, Lock, ShieldAlert, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.has_profile) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/profile-setup', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      // Success redirection is handled by the useEffect above
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neonLime/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-neonCyan/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-neonLime to-neonCyan rounded-2xl flex items-center justify-center neon-glow-lime mb-3">
            <Activity className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FITNOVA <span className="text-neonLime">AI</span>
          </h1>
          <p className="text-xs text-zinc-400 font-semibold tracking-wider mt-1 uppercase">Your intelligent athletic partner</p>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl relative">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Sign in to FitNova</h2>

          {/* Session expired banner — shown when redirected from a protected route */}
          <SessionExpiredBanner />

          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-200">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-600 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-600 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-neonLime to-neonCyan text-black font-bold tracking-wide uppercase rounded-xl hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Redirection */}
          <div className="text-center mt-6">
            <p className="text-xs text-zinc-500">
              New to FitNova?{' '}
              <Link to="/register" className="text-neonLime font-semibold hover:underline">
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
