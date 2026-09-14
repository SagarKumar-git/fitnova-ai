import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  useEventBus,
  useAnalytics,
  useTelemetry,
  useNotificationService,
} from '../platform/container/PlatformContext.tsx';
import { normalizeError, getUserSafeMessage } from '../platform/errors/index.ts';
import { logger } from '../utils/logger.ts';
import { 
  Flame, 
  Droplet, 
  Dumbbell, 
  Apple, 
  Activity, 
  TrendingUp, 
  Scale, 
  Compass, 
  Award,
  Zap,
  Info,
  Plus,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface DashboardData {
  name: string;
  goal: string;
  weight: number;
  height: number;
  experience_level: string;
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_water_target: number;
  workout_plan: { title: string; status: string; message: string };
  nutrition_plan: { title: string; status: string; message: string };
  calories_consumed: number;
  protein_consumed: number;
  carbs_consumed: number;
  fats_consumed: number;
  water_consumed_ml: number;
}

export const Dashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const eventBus = useEventBus();
  const analytics = useAnalytics();
  const telemetry = useTelemetry();
  const notifications = useNotificationService();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWaterLogging, setIsWaterLogging] = useState(false);

  const fetchDashboardData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const start = performance.now();

    try {
      const response = await apiFetch(`${API_BASE_URL}/dashboard`);

      if (response.status === 401 || response.status === 403) return;

      if (!response.ok) {
        throw new Error('Failed to load dashboard data.');
      }

      const result = await response.json();
      const durationMs = Math.round(performance.now() - start);
      telemetry.recordLatency('API_LATENCY', 'Dashboard', durationMs, { status: response.status });

      setData(result);
      setError(null);
    } catch (err: unknown) {
      const normErr = normalizeError(err);
      setError(getUserSafeMessage(normErr));
      logger.error('[Dashboard] Fetch dashboard error', { error: normErr.message, code: normErr.code });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, telemetry]);

  useEffect(() => {
    fetchDashboardData(true);
    analytics.track('DASHBOARD_VIEWED');

    // Subscribe to EventBus for cross-feature reactivity
    const unsubWater = eventBus.subscribe('WATER_LOGGED', () => {
      fetchDashboardData(false);
    });
    const unsubMeal = eventBus.subscribe('MEAL_LOGGED', () => {
      fetchDashboardData(false);
    });
    const unsubWorkout = eventBus.subscribe('WORKOUT_COMPLETED', () => {
      fetchDashboardData(false);
    });
    const unsubProfile = eventBus.subscribe('PROFILE_UPDATED', () => {
      fetchDashboardData(false);
    });
    const unsubOnline = eventBus.subscribe('NETWORK_ONLINE', () => {
      fetchDashboardData(false);
    });
    const unsubSync = eventBus.subscribe('SYNC_COMPLETED', () => {
      fetchDashboardData(false);
    });

    return () => {
      unsubWater();
      unsubMeal();
      unsubWorkout();
      unsubProfile();
      unsubOnline();
      unsubSync();
    };
  }, [fetchDashboardData, analytics, eventBus]);

  const handleQuickLogWater = async (amountMl: number) => {
    setIsWaterLogging(true);
    try {
      const todayStr = new Date().toLocaleDateString('sv');
      const response = await apiFetch(`${API_BASE_URL}/logs/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_ml: amountMl,
          logged_date: todayStr
        })
      });

      if (response.status === 401 || response.status === 403) return;

      if (response.ok) {
        const newTotal = (data?.water_consumed_ml || 0) + amountMl;
        eventBus.emit('WATER_LOGGED', {
          amountMl,
          dailyTotalMl: newTotal,
          timestamp: Date.now(),
        });

        analytics.track('WATER_LOGGED', { amountMl, dailyTotalMl: newTotal });

        notifications.notify({
          type: 'nutrition',
          title: 'Hydration Logged',
          message: `Added ${amountMl}ml of water to today's intake.`,
          durationMs: 3500,
        });

        await fetchDashboardData(false);
      }
    } catch (err) {
      logger.error('[Dashboard] Failed to log water', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsWaterLogging(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-8 animate-pulse">
          {/* Skeleton Welcome */}
          <div className="space-y-3">
            <div className="h-10 bg-zinc-800/60 rounded-xl w-72"></div>
            <div className="h-4 bg-zinc-800/40 rounded-lg w-96"></div>
          </div>

          {/* Skeleton 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6"></div>
            <div className="h-64 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6"></div>
            <div className="h-64 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6"></div>
          </div>

          {/* Skeleton Macro Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl"></div>
            <div className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl"></div>
            <div className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl"></div>
            <div className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-8 bg-red-950/30 border border-red-800/40 rounded-3xl max-w-xl mx-auto mt-10 backdrop-blur-xl shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-900/40 border border-red-700/50 flex items-center justify-center text-red-400 mx-auto mb-4 shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="font-extrabold text-white text-xl mb-2 tracking-tight">Unable to Load Dashboard</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{error || "Please set up your profile to access dashboard calculations."}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              className="inline-flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-neonLime to-emerald-400 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-neonLime/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <Link to="/profile-setup" className="inline-flex items-center gap-2 py-3 px-6 bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold rounded-xl text-xs uppercase tracking-wider hover:border-zinc-700 transition-all">
              Go to Profile Setup
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate percentages
  const caloriePercent = Math.min(Math.round((data.calories_consumed / data.daily_calorie_target) * 100), 100);
  const proteinPercent = Math.min(Math.round((data.protein_consumed / data.daily_protein_target) * 100), 100);
  
  const waterConsumedL = data.water_consumed_ml / 1000;
  const waterPercent = Math.min(Math.round((waterConsumedL / data.daily_water_target) * 100), 100);

  return (
    <Layout>
      {/* Welcome Banner */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonLime to-neonCyan">{data.name}</span>!
        </h1>
        <p className="text-zinc-400 mt-2 text-sm md:text-base">
          Log food in the Nutrition section or quick-log water below to update your aggregates.
        </p>
      </div>

      {/* Grid: 3 columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Quick Profile Summary Card */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 lg:col-span-1 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-neonLime/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Compass className="w-5 h-5 text-neonLime" />
              <h3 className="font-extrabold text-zinc-300 uppercase tracking-widest text-xs">Profile Summary</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Fitness Goal</span>
                <span className="text-lg font-bold text-slate-100">{data.goal}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Weight</span>
                  <span className="text-lg font-bold text-slate-100">{data.weight} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Height</span>
                  <span className="text-lg font-bold text-slate-100">{data.height} cm</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Experience Level</span>
                <span className="text-base font-bold text-slate-100">{data.experience_level}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-zinc-900 flex items-center gap-2 text-zinc-500 text-xs">
            <Award className="w-4 h-4 text-neonCyan" />
            <span>Baselines computed by FitNova engine</span>
          </div>
        </div>

        {/* Metabolic Baselines Card */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 lg:col-span-2 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-neonCyan/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-neonCyan" />
            <h3 className="font-extrabold text-zinc-300 uppercase tracking-widest text-xs">Metabolic Baseline Stats</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BMR */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-900/60 flex items-start gap-4 hover:border-zinc-800 transition-all duration-300">
              <div className="p-3 bg-neonLime/10 text-neonLime rounded-xl shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">BMR (Mifflin-St Jeor)</span>
                <span className="text-2xl font-black text-slate-100">{data.bmr} <span className="text-xs font-normal text-zinc-400">kcal/day</span></span>
                <p className="text-[10px] text-zinc-400 mt-1">Energy burned at complete rest.</p>
              </div>
            </div>

            {/* TDEE */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-900/60 flex items-start gap-4 hover:border-zinc-800 transition-all duration-300">
              <div className="p-3 bg-neonCyan/10 text-neonCyan rounded-xl shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">TDEE (Active Burn)</span>
                <span className="text-2xl font-black text-slate-100">{data.tdee} <span className="text-xs font-normal text-zinc-400">kcal/day</span></span>
                <p className="text-[10px] text-zinc-400 mt-1">Energy burned including activity.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-zinc-900/30 rounded-xl border border-zinc-900 text-xs text-zinc-400 flex gap-2.5 items-start">
            <Info className="w-4 h-4 text-neonCyan shrink-0 mt-0.5" />
            <p>
              Your targets recalculate when you update your body weight. You can track body weight metrics in the Analytics page.
            </p>
          </div>
        </div>
      </div>

      {/* Target Calculations Grid */}
      <h2 className="text-xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-neonLime" />
        Daily Nutrition Progress
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Calories Card */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative hover:border-neonLime/30 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-neonLime/10 text-neonLime rounded-xl">
                <Flame className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold text-neonLime bg-neonLime/15 px-2 py-0.5 rounded border border-neonLime/25 uppercase">
                {caloriePercent}% logged
              </span>
            </div>
            
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Calories Target</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">
              {Math.round(data.calories_consumed)} <span className="text-xs font-semibold text-zinc-500">/ {data.daily_calorie_target} kcal</span>
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900">
            {/* Progress bar */}
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-neonLime h-full rounded-full transition-all duration-500" 
                style={{ width: `${caloriePercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-semibold">
              <span>Carbs: {Math.round(data.carbs_consumed)}g</span>
              <span>Fat: {Math.round(data.fats_consumed)}g</span>
            </div>
          </div>
        </div>

        {/* Protein Card */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative hover:border-neonCyan/30 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-neonCyan/10 text-neonCyan rounded-xl">
                <Dumbbell className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold text-neonCyan bg-neonCyan/15 px-2 py-0.5 rounded border border-neonCyan/25 uppercase">
                {proteinPercent}% logged
              </span>
            </div>
            
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Protein Target</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">
              {Math.round(data.protein_consumed)} <span className="text-xs font-semibold text-zinc-500">/ {data.daily_protein_target} g</span>
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900">
            {/* Progress bar */}
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-neonCyan h-full rounded-full transition-all duration-500" 
                style={{ width: `${proteinPercent}%` }}
              ></div>
            </div>
            <span className="text-[9px] text-zinc-500 block mt-2 text-center font-bold uppercase tracking-wider">
              {Math.max(0, Math.round(data.daily_protein_target - data.protein_consumed))}g remaining today
            </span>
          </div>
        </div>

        {/* Water Card */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 relative hover:border-sky-500/20 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-sky-950/40 text-sky-400 rounded-xl">
                <Droplet className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold text-sky-400 bg-sky-400/15 px-2 py-0.5 rounded border border-sky-400/25 uppercase">
                {waterPercent}% logged
              </span>
            </div>
            
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Water Hydration</span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">
              {waterConsumedL.toFixed(2)} <span className="text-xs font-semibold text-zinc-500">/ {data.daily_water_target} Liters</span>
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900">
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mb-3">
              <div 
                className="bg-sky-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${waterPercent}%` }}
              ></div>
            </div>
            
            {/* Quick Log Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => handleQuickLogWater(250)}
                disabled={isWaterLogging}
                className="py-1 bg-zinc-900 hover:bg-sky-950/20 border border-zinc-800 hover:border-sky-500/30 text-[10px] font-bold text-zinc-400 hover:text-sky-400 rounded-lg flex items-center justify-center gap-1 transition-all duration-150"
              >
                <Plus className="w-3 h-3" />
                <span>250ml</span>
              </button>
              <button 
                onClick={() => handleQuickLogWater(500)}
                disabled={isWaterLogging}
                className="py-1 bg-zinc-900 hover:bg-sky-950/20 border border-zinc-800 hover:border-sky-500/30 text-[10px] font-bold text-zinc-400 hover:text-sky-400 rounded-lg flex items-center justify-center gap-1 transition-all duration-150"
              >
                <Plus className="w-3 h-3" />
                <span>500ml</span>
              </button>
              <button 
                onClick={() => handleQuickLogWater(1000)}
                disabled={isWaterLogging}
                className="py-1 bg-zinc-900 hover:bg-sky-950/20 border border-zinc-800 hover:border-sky-500/30 text-[10px] font-bold text-zinc-400 hover:text-sky-400 rounded-lg flex items-center justify-center gap-1 transition-all duration-150"
              >
                <Plus className="w-3 h-3" />
                <span>1.0L</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feature Navigation Cards */}
      <h2 className="text-xl font-bold text-white tracking-tight mb-4">Explore FitNova</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* AI Coach Card */}
        <Link 
          to="/ai-coach"
          className="glass-panel p-6 rounded-2xl border border-zinc-800 hover:border-neonLime/40 hover:shadow-[0_0_20px_rgba(163,230,53,0.08)] transition-all duration-300 flex flex-col justify-between group"
        >
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neonLime/10 text-neonLime rounded-xl border border-neonLime/20">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-200">AI Coach</h4>
              </div>
              <span className="text-[9px] font-bold px-2.5 py-0.5 rounded bg-neonLime/10 text-neonLime border border-neonLime/20 uppercase tracking-widest">Live</span>
            </div>
            <p className="text-sm text-zinc-400">
              Generate personalized workout and meal plans tailored to your biometric baselines, fitness goal, and training experience.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-neonLime flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-200">
            <span>Open AI Coach</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Meal Plans Card */}
        <Link 
          to="/meal-plans"
          className="glass-panel p-6 rounded-2xl border border-zinc-800 hover:border-neonCyan/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.08)] transition-all duration-300 flex flex-col justify-between group"
        >
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neonCyan/10 text-neonCyan rounded-xl border border-neonCyan/20">
                  <Apple className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-200">Meal Plans</h4>
              </div>
              <span className="text-[9px] font-bold px-2.5 py-0.5 rounded bg-neonCyan/10 text-neonCyan border border-neonCyan/20 uppercase tracking-widest">Live</span>
            </div>
            <p className="text-sm text-zinc-400">
              Browse, save, and follow curated meal plans that match your calorie targets, macro splits, and dietary preferences.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-neonCyan flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-200">
            <span>Open Meal Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </Layout>
  );
};
