import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../hooks/usePWA';
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
  Shield,
  Lightbulb,
  Camera,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onClose, 
  isCollapsed = false, 
  setIsCollapsed 
}) => {
  const { user, logout } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ text: string; top: number } | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinkClass = (isActive: boolean) => {
    const base = "flex items-center rounded-lg text-sm transition-all duration-200 border-l-2 w-full cursor-pointer";
    const status = isActive 
      ? "font-semibold bg-gradient-to-r from-zinc-900 to-zinc-900 border-neonLime text-neonLime neon-glow-lime" 
      : "font-medium text-zinc-400 hover:text-slate-100 hover:bg-zinc-900/50 border-transparent";
    // On mobile, always expanded. On desktop, center icon if collapsed.
    const layout = isCollapsed 
      ? "gap-3 px-4 py-3 lg:justify-center lg:py-3 lg:px-0 lg:gap-0" 
      : "gap-3 px-4 py-3";
    return `${base} ${status} ${layout}`;
  };

  const handleShowTooltip = (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, text: string) => {
    if (isCollapsed && sidebarRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const topOffset = rect.top - sidebarRect.top + rect.height / 2;
      setActiveTooltip({ text, top: topOffset });
    }
  };

  const handleHideTooltip = () => {
    setActiveTooltip(null);
  };

  return (
    <aside 
      ref={sidebarRef}
      className={`bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-64 lg:w-20' : 'w-64'}`}
    >
      {/* Brand Logo */}
      <div className={`p-6 pb-2 flex ${isCollapsed ? 'flex-col gap-4 items-center' : 'items-center justify-between'}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-tr from-neonLime to-neonCyan rounded-xl flex items-center justify-center neon-glow-lime flex-shrink-0">
            <Activity className="w-6 h-6 text-black stroke-[2.5]" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-100 to-zinc-400 bg-clip-text text-transparent">
                FITNOVA <span className="text-neonLime">AI</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">v1.0 Production</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : ''}`}>
          {/* Toggle Button for Desktop */}
          {setIsCollapsed && (
            <button
              onClick={() => {
                const nextState = !isCollapsed;
                setIsCollapsed(nextState);
                localStorage.setItem('sidebar-collapsed', JSON.stringify(nextState));
              }}
              className="hidden lg:flex p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Close button for Mobile drawer */}
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Close navigation sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Section */}
      <nav 
        className={`space-y-1 overflow-y-auto overflow-x-hidden flex-1 py-4 custom-sidebar-scrollbar transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-6'}`} 
        aria-label="Main navigation"
      >
        <p className={`px-4 text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
          Core Platform
        </p>
        
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Dashboard"
          onMouseEnter={(e) => handleShowTooltip(e, "Dashboard")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Dashboard")}
          onBlur={handleHideTooltip}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/profile-setup"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Profile"
          onMouseEnter={(e) => handleShowTooltip(e, "Profile")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Profile")}
          onBlur={handleHideTooltip}
        >
          <User className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Profile</span>
        </NavLink>

        <NavLink 
          to="/nutrition"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Nutrition"
          onMouseEnter={(e) => handleShowTooltip(e, "Nutrition")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Nutrition")}
          onBlur={handleHideTooltip}
        >
          <Apple className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Nutrition</span>
        </NavLink>

        <NavLink 
          to="/food-ai-scanner"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Food Scanner"
          onMouseEnter={(e) => handleShowTooltip(e, "Food Scanner")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Food Scanner")}
          onBlur={handleHideTooltip}
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Food Scanner</span>
        </NavLink>

        <NavLink 
          to="/meal-plans"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Meal Plans"
          onMouseEnter={(e) => handleShowTooltip(e, "Meal Plans")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Meal Plans")}
          onBlur={handleHideTooltip}
        >
          <Coffee className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Meal Plans</span>
        </NavLink>

        <NavLink 
          to="/workouts"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Workouts"
          onMouseEnter={(e) => handleShowTooltip(e, "Workouts")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Workouts")}
          onBlur={handleHideTooltip}
        >
          <Dumbbell className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Workouts</span>
        </NavLink>

        <NavLink 
          to="/exercises"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Exercise Library"
          onMouseEnter={(e) => handleShowTooltip(e, "Exercise Library")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Exercise Library")}
          onBlur={handleHideTooltip}
        >
          <Activity className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Exercise Library</span>
        </NavLink>

        <NavLink 
          to="/analytics"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Weight Analytics"
          onMouseEnter={(e) => handleShowTooltip(e, "Weight Analytics")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Weight Analytics")}
          onBlur={handleHideTooltip}
        >
          <LineChart className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Weight Analytics</span>
        </NavLink>

        <NavLink 
          to="/workout-analytics"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="Workout Analytics"
          onMouseEnter={(e) => handleShowTooltip(e, "Workout Analytics")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "Workout Analytics")}
          onBlur={handleHideTooltip}
        >
          <LineChart className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>Workout Analytics</span>
        </NavLink>

        {user?.role === 'admin' && (
          <>
            <div className={`pt-6 pb-2 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="px-4 text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2">Admin Panel</p>
            </div>
            <NavLink 
              to="/admin"
              className={({ isActive }) => getLinkClass(isActive)}
              onClick={onClose}
              aria-label="Admin Dashboard"
              onMouseEnter={(e) => handleShowTooltip(e, "Admin Dashboard")}
              onMouseLeave={handleHideTooltip}
              onFocus={(e) => handleShowTooltip(e, "Admin Dashboard")}
              onBlur={handleHideTooltip}
            >
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span className={isCollapsed ? 'lg:hidden' : 'block'}>Admin Dashboard</span>
            </NavLink>
          </>
        )}

        <NavLink 
          to="/ai-coach"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="AI Coach"
          onMouseEnter={(e) => handleShowTooltip(e, "AI Coach")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "AI Coach")}
          onBlur={handleHideTooltip}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>AI Coach</span>
        </NavLink>

        <NavLink 
          to="/ai-insights"
          className={({ isActive }) => getLinkClass(isActive)}
          onClick={onClose}
          aria-label="AI Insights"
          onMouseEnter={(e) => handleShowTooltip(e, "AI Insights")}
          onMouseLeave={handleHideTooltip}
          onFocus={(e) => handleShowTooltip(e, "AI Insights")}
          onBlur={handleHideTooltip}
        >
          <Lightbulb className="w-4 h-4" aria-hidden="true" />
          <span className={isCollapsed ? 'lg:hidden' : 'block'}>AI Insights</span>
        </NavLink>

        {/* Install App Link */}
        {isInstallable && (
          <div className={`pt-4 ${isCollapsed ? 'px-0' : 'px-2'}`}>
            <button
              onClick={installApp}
              className={`w-full flex items-center justify-center rounded-xl text-xs font-bold text-neonCyan hover:bg-neonCyan/10 border border-dashed border-neonCyan/30 bg-neonCyan/5 transition-all duration-200 cursor-pointer ${isCollapsed ? 'w-10 h-10 p-0 lg:w-10 lg:h-10 lg:p-0' : 'px-3 py-2.5 text-left gap-3'}`}
              aria-label="Install FitNova AI"
              onMouseEnter={(e) => handleShowTooltip(e, "Install App")}
              onMouseLeave={handleHideTooltip}
              onFocus={(e) => handleShowTooltip(e, "Install App")}
              onBlur={handleHideTooltip}
            >
              <Download className="w-4 h-4 text-neonCyan animate-bounce flex-shrink-0" aria-hidden="true" />
              {!isCollapsed && <span>Install FitNova AI</span>}
            </button>
          </div>
        )}
      </nav>

      {/* User Footer Profile & Logout */}
      <div className={`p-4 border-t border-zinc-900 bg-zinc-950/80 sticky bottom-0 z-10 flex flex-col gap-4 ${isCollapsed ? 'items-center' : ''}`}>
        <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-800 font-bold text-sm text-neonLime flex-shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="truncate flex-1">
              <h2 className="text-sm font-semibold text-slate-100 truncate">{user?.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-400 truncate">{user?.email}</span>
                <span className="inline-block px-1.5 py-0.5 rounded bg-neonLime/10 text-neonLime text-[9px] font-bold uppercase border border-neonLime/20">
                  {user?.role}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex justify-center">
          <button 
            onClick={handleLogout}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${isCollapsed ? 'w-10 h-10 p-0 rounded-xl' : 'w-full'}`}
            aria-label="Sign Out"
            onMouseEnter={(e) => handleShowTooltip(e, "Sign Out")}
            onMouseLeave={handleHideTooltip}
            onFocus={(e) => handleShowTooltip(e, "Sign Out")}
            onBlur={handleHideTooltip}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Non-clipped Tooltip Element */}
      {isCollapsed && activeTooltip && (
        <div 
          className="hidden lg:block absolute left-22 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-slate-100 text-xs font-semibold rounded-lg shadow-xl pointer-events-none z-50 transition-all duration-200 whitespace-nowrap"
          style={{ top: `${activeTooltip.top}px` }}
        >
          {activeTooltip.text}
        </div>
      )}
    </aside>
  );
};
