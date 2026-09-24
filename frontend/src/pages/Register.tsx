import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ShieldAlert, Award } from 'lucide-react';
import {
  InteractiveBackground,
  ClickRipple,
  CursorGlow,
  AuthBranding,
  AuthCard,
  AuthInput,
  AuthButton,
} from '../components/auth';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Registrations validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill out all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password, confirmPassword, role);
      // Registration successful, redirect with state
      navigate('/login', { state: { registered: true, email } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Email might already be in use.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-[#39FF14]/30 selection:text-white">
      {/* Live GPU-accelerated interactive canvas background */}
      <InteractiveBackground />

      {/* Click neon energy ripple effect */}
      <ClickRipple />

      {/* Subtle cursor follower and ambient trailing glow (desktop only) */}
      <CursorGlow />

      {/* Main Content Container */}
      <div className="w-full flex flex-col items-center justify-center relative z-10 my-6">
        {/* Top Branding */}
        <AuthBranding subtitle="Join the athletic generation" />

        {/* Glassmorphism Auth Card */}
        <AuthCard hasError={Boolean(error)}>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Create your account
            </h2>
            <p className="text-xs text-[#94A3B8] font-medium mt-1">
              Start your personalized AI-driven athletic journey
            </p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 shadow-[0_0_15px_rgba(244,63,94,0.15)] flex items-start gap-3 animate-fade-in"
            >
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-rose-200 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <AuthInput
              id="name"
              label="Full Name"
              type="text"
              required
              autoComplete="name"
              placeholder="Alex Johnson"
              value={name}
              disabled={isSubmitting}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />

            {/* Email Address */}
            <AuthInput
              id="email"
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="athlete@fitnova.ai"
              value={email}
              disabled={isSubmitting}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            {/* System Role Selection */}
            <div>
              <label
                htmlFor="role"
                className="block text-xs font-bold text-[#94A3B8] tracking-wider uppercase mb-1.5"
              >
                Account Role
              </label>
              <div className="relative group">
                <span
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#94A3B8] group-focus-within:text-[#39FF14] group-focus-within:drop-shadow-[0_0_6px_rgba(57,255,20,0.6)] transition-all duration-200 pointer-events-none"
                  aria-hidden="true"
                >
                  <Award className="w-4 h-4" />
                </span>
                <select
                  id="role"
                  value={role}
                  disabled={isSubmitting}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[rgba(4,17,31,0.85)] border border-[rgba(148,163,184,0.20)] hover:border-[rgba(163,255,0,0.40)] focus:border-[#39FF14] focus:outline-none rounded-xl text-white text-sm font-medium transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(57,255,20,0.08),0_0_20px_rgba(57,255,20,0.10)] disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                >
                  <option value="user" className="bg-[#04111F] text-white">Athlete (Standard User)</option>
                  <option value="trainer" className="bg-[#04111F] text-white">Trainer (Fitness Professional)</option>
                  <option value="admin" className="bg-[#04111F] text-white">System Admin</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <AuthInput
              id="password"
              label="Password (min 8 chars)"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              disabled={isSubmitting}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
            />

            {/* Confirm Password */}
            <AuthInput
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
            />

            {/* Submit Button */}
            <div className="pt-2">
              <AuthButton
                id="register-submit-btn"
                type="submit"
                status={isSubmitting ? 'submitting' : 'idle'}
                submittingText="Creating Account..."
              >
                CREATE ACCOUNT
              </AuthButton>
            </div>
          </form>

          {/* Redirection */}
          <div className="text-center mt-6 pt-5 border-t border-[rgba(163,255,0,0.12)]">
            <p className="text-xs text-[#94A3B8]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#39FF14] hover:text-[#DFFF00] font-bold transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(57,255,20,0.5)] underline underline-offset-4"
              >
                Sign In
              </Link>
            </p>
          </div>
        </AuthCard>
      </div>
    </div>
  );
};
