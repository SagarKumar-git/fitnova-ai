import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  Dumbbell, 
  Apple, 
  LineChart, 
  Sparkles, 
  LogOut, 
  Activity,
  Coffee,
  X,
  Shield
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeLinkClass = "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-zinc-900 to-zinc-900 border-l-2 border-neonLime text-neonLime neon-glow-lime";
  const normalLinkClass = "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-slate-100 hover:bg-zinc-900/50 border-l-2 border-transparent transition-all duration-200";

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between h-screen sticky top-0">
      <div className="p-6">
        {/* Brand Logo */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-neonLime to-neonCyan rounded-xl flex items-center justify-center neon-glow-lime">
              <Activity className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-zinc-400 bg-clip-text text-transparent">
                FITNOVA <span className="text-neonLime">AI</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Phase 2 Active</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2">Core Platform</p>
          
          <NavLink 
            to="/dashboard"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/profile-setup"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </NavLink>

          <NavLink 
            to="/nutrition"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <Apple className="w-4 h-4" />
            <span>Nutrition</span>
          </NavLink>

          <NavLink 
            to="/meal-plans"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <Coffee className="w-4 h-4" />
            <span>Meal Plans</span>
          </NavLink>

          <NavLink 
            to="/workouts"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Workouts</span>
          </NavLink>

          <NavLink 
            to="/exercises"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <Activity className="w-4 h-4" />
            <span>Exercise Library</span>
          </NavLink>

          <NavLink 
            to="/analytics"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <LineChart className="w-4 h-4" />
            <span>Weight Analytics</span>
          </NavLink>

          <NavLink 
            to="/workout-analytics"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <LineChart className="w-4 h-4" />
            <span>Workout Analytics</span>
          </NavLink>

          {user?.role === 'admin' && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-4 text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2">Admin Panel</p>
              </div>
              <NavLink 
                to="/admin"
                className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
                onClick={onClose}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </NavLink>
            </>
          )}

          <NavLink 
            to="/ai-coach"
            className={({ isActive }) => isActive ? activeLinkClass : normalLinkClass}
            onClick={onClose}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Coach</span>
          </NavLink>
        </nav>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/80">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-800 font-bold text-sm text-neonLime">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="truncate flex-1">
            <h2 className="text-sm font-semibold text-slate-100 truncate">{user?.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-zinc-400 truncate">{user?.email}</span>
              <span className="inline-block px-1.5 py-0.5 rounded bg-neonLime/10 text-neonLime text-[9px] font-bold uppercase border border-neonLime/20">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 text-xs font-semibold tracking-wide uppercase transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
