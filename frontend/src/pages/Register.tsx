import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Mail, Lock, User, ShieldAlert, Award } from 'lucide-react';

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
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password, confirmPassword, role);
      // Registration successful, redirect with state
      navigate('/login', { state: { registered: true, email } });
    } catch (err: any) {
      setError(err.message || "Registration failed. Email might already be in use.");
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
          <p className="text-xs text-zinc-400 font-semibold tracking-wider mt-1 uppercase">Join the athletic generation</p>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl relative">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Create your account</h2>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1.5" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 placeholder-zinc-600 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime transition-all duration-200"
                />
              </div>
            </div>

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

            {/* System Role */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1.5" htmlFor="role">
                Account Role
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Award className="w-4 h-4" />
                </span>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-slate-100 focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime transition-all duration-200 appearance-none"
                >
                  <option value="user">User (Standard Client)</option>
                  <option value="trainer">Trainer (Fitness Professional)</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1.5" htmlFor="password">
                Password (min 8 chars)
              </label>
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1.5" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Redirection */}
          <div className="text-center mt-6">
            <p className="text-xs text-zinc-500">
              Already have an account?{' '}
              <Link to="/login" className="text-neonLime font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
