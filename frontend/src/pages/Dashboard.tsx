import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
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
  Plus
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWaterLogging, setIsWaterLogging] = useState(false);

  const fetchDashboardData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard data.');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  const handleQuickLogWater = async (amountMl: number) => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    setIsWaterLogging(true);
    try {
      const todayStr = new Date().toLocaleDateString('sv'); // sv locale returns YYYY-MM-DD
      const response = await fetch('http://127.0.0.1:8000/api/logs/water', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount_ml: amountMl,
          logged_date: todayStr
        })
      });

      if (response.ok) {
        await fetchDashboardData(false);
      }
    } catch (err) {
      console.error("Failed to log water:", err);
    } finally {
      setIsWaterLogging(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-neonLime border-t-transparent animate-spin"></div>
            <p className="text-zinc-500 font-semibold uppercase tracking-wider text-xs">Assembling Dashboard Data</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="p-6 bg-red-950/40 border border-red-800/40 rounded-2xl max-w-xl mx-auto mt-10">
          <h2 className="font-bold text-red-300 text-lg mb-2">Error Loading Dashboard</h2>
          <p className="text-red-200 text-sm mb-4">{error || "Please set up your profile to access dashboard calculations."}</p>
          <a href="/profile-setup" className="inline-block py-2.5 px-5 bg-zinc-900 border border-zinc-800 text-slate-100 font-bold rounded-xl text-xs uppercase tracking-wide">
            Go to Profile Setup
          </a>
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

      {/* Placeholder Cards Grid */}
      <h2 className="text-xl font-bold text-white tracking-tight mb-4">Core Recommendations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Workout Plan Placeholder */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 opacity-60 hover:opacity-80 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-900 text-zinc-400 rounded-xl border border-zinc-850">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-200">Custom Workout Plan</h4>
              </div>
              <span className="text-[9px] font-bold px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase tracking-widest">Coming Soon</span>
            </div>
            <p className="text-sm text-zinc-400">
              An intelligent athletic workout structure custom-tailored to your gym equipment, training days per week, and skill level.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-neonLime">
            FitNova AI recommendations engine locked for Phase 2.
          </div>
        </div>

        {/* Nutrition Plan Placeholder */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 opacity-60 hover:opacity-80 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-900 text-zinc-400 rounded-xl border border-zinc-850">
                  <Apple className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-200">Personalized Nutrition Plan</h4>
              </div>
              <span className="text-[9px] font-bold px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase tracking-widest">Coming Soon</span>
            </div>
            <p className="text-sm text-zinc-400">
              Macro-divided meal splits matching your calorie targets, featuring meal prep guidelines and macronutrient timelines.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-neonCyan">
            FitNova AI meal schedules locked for Phase 2.
          </div>
        </div>
      </div>
    </Layout>
  );
};
