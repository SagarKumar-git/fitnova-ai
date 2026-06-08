import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { API_BASE_URL } from '../config';
import { 
  Sparkles, 
  Activity, 
  Flame, 
  Droplet, 
  Scale, 
  TrendingUp, 
  Dumbbell, 
  Utensils, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Info,
  ChevronRight
} from 'lucide-react';

interface AIProfile {
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  experience_level: string;
  activity_level: string;
  bmi: number;
  bmr: number;
  tdee: number;
  daily_calories: number;
  daily_protein: number;
  daily_water: number;
}

interface AIWorkout {
  id: string;
  workout_type: string;
  goal: string;
  experience_level: string;
  days_per_week: number;
  plan_data: Record<string, { type: string; exercises: Array<{ exercise: string; sets: number; reps: string; rest: string; notes: string }> }>;
  created_at: string;
}

interface AIMeal {
  id: string;
  diet_type: string;
  diet_cuisine: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  meals_data: Record<string, { name: string; calories: number; protein: number; carbohydrates: number; fat: number }>;
  created_at: string;
}

export const AICoach: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'workout' | 'meal'>('profile');
  const [profile, setProfile] = useState<AIProfile | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<AIWorkout | null>(null);
  const [mealPlan, setMealPlan] = useState<AIMeal | null>(null);

  // Loading & Error states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [errorWorkout, setErrorWorkout] = useState<string | null>(null);
  const [errorMeal, setErrorMeal] = useState<string | null>(null);

  // Forms state
  const [workoutType, setWorkoutType] = useState('Gym');
  const [workoutDays, setWorkoutDays] = useState(3);
  const [dietType, setDietType] = useState('Vegetarian');
  const [dietCuisine, setDietCuisine] = useState('Indian Diet');

  const fetchProfileAnalysis = async () => {
    setLoadingProfile(true);
    setErrorProfile(null);
    const token = localStorage.getItem('fitnova_token');
    try {
      const response = await fetch(`${API_BASE_URL}/ai/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 404) {
        throw new Error("Profile not completed. Please complete your baselines setup in the Profile tab first.");
      }
      if (!response.ok) {
        throw new Error("Failed to load profile analysis baselines.");
      }
      const data = await response.json();
      setProfile(data);
    } catch (err: any) {
      setErrorProfile(err.message || "Error fetching profile analytics.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchWorkoutPlan = async () => {
    setErrorWorkout(null);
    const token = localStorage.getItem('fitnova_token');
    try {
      const response = await fetch(`${API_BASE_URL}/ai/workout`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkoutPlan(data);
        setWorkoutType(data.workout_type);
        setWorkoutDays(data.days_per_week);
      } else {
        setWorkoutPlan(null);
      }
    } catch (err) {
      console.error("No active workout plan found.");
    }
  };

  const fetchMealPlan = async () => {
    setErrorMeal(null);
    const token = localStorage.getItem('fitnova_token');
    try {
      const response = await fetch(`${API_BASE_URL}/ai/meal`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMealPlan(data);
        setDietType(data.diet_type);
        setDietCuisine(data.diet_cuisine);
      } else {
        setMealPlan(null);
      }
    } catch (err) {
      console.error("No active meal plan found.");
    }
  };

  useEffect(() => {
    fetchProfileAnalysis();
    fetchWorkoutPlan();
    fetchMealPlan();
  }, []);

  const handleGenerateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingWorkout(true);
    setErrorWorkout(null);
    const token = localStorage.getItem('fitnova_token');

    try {
      const response = await fetch(`${API_BASE_URL}/ai/workout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workout_type: workoutType,
          goal: profile?.goal || "Maintenance",
          experience_level: profile?.experience_level || "Intermediate",
          days_per_week: workoutDays
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate workout plan.");
      }

      const data = await response.json();
      setWorkoutPlan(data);
    } catch (err: any) {
      setErrorWorkout(err.message || "Connection error during workout generation.");
    } finally {
      setLoadingWorkout(false);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workoutPlan) return;
    setLoadingWorkout(true);
    const token = localStorage.getItem('fitnova_token');

    try {
      const response = await fetch(`${API_BASE_URL}/ai/workout/${workoutPlan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setWorkoutPlan(null);
      } else {
        throw new Error("Failed to delete the workout plan.");
      }
    } catch (err: any) {
      setErrorWorkout(err.message);
    } finally {
      setLoadingWorkout(false);
    }
  };

  const handleGenerateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMeal(true);
    setErrorMeal(null);
    const token = localStorage.getItem('fitnova_token');

    try {
      const response = await fetch(`${API_BASE_URL}/ai/meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          diet_type: dietType,
          diet_cuisine: dietCuisine
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate meal plan.");
      }

      const data = await response.json();
      setMealPlan(data);
    } catch (err: any) {
      setErrorMeal(err.message || "Connection error during meal planning.");
    } finally {
      setLoadingMeal(false);
    }
  };

  const handleDeleteMeal = async () => {
    if (!mealPlan) return;
    setLoadingMeal(true);
    const token = localStorage.getItem('fitnova_token');

    try {
      const response = await fetch(`${API_BASE_URL}/ai/meal/${mealPlan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMealPlan(null);
      } else {
        throw new Error("Failed to delete the meal plan.");
      }
    } catch (err: any) {
      setErrorMeal(err.message);
    } finally {
      setLoadingMeal(false);
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
    if (bmi < 25) return { label: 'Normal Weight', color: 'text-neonLime bg-neonLime/10 border-neonLime/20' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Obese', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  };

  return (
    <Layout>
      {/* Welcome & Coach Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-5 h-5 text-neonLime" />
            <span className="text-[10px] font-bold text-neonLime bg-neonLime/10 px-2 py-0.5 rounded border border-neonLime/20 uppercase tracking-widest">
              AI Intelligent Coaching
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            FitNova <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonLime to-neonCyan">AI Coach</span>
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">
            Personalized biometric baselines, custom routines, and nutritional macro splits.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-zinc-900 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 transition-all shrink-0 ${
            activeTab === 'profile' 
              ? 'border-neonLime text-neonLime font-bold' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Biometric Analysis
        </button>
        <button
          onClick={() => setActiveTab('workout')}
          className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 transition-all shrink-0 ${
            activeTab === 'workout' 
              ? 'border-neonLime text-neonLime font-bold' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          AI Workout Generator
        </button>
        <button
          onClick={() => setActiveTab('meal')}
          className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 transition-all shrink-0 ${
            activeTab === 'meal' 
              ? 'border-neonLime text-neonLime font-bold' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          AI Meal Planner
        </button>
      </div>

      {/* Tab 1: Profile baselines */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {loadingProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-zinc-900/60 border border-zinc-850 rounded-2xl"></div>
              ))}
            </div>
          ) : errorProfile ? (
            <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-xl mx-auto text-center shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="font-extrabold text-white text-lg mb-2">Baseline Settings Incomplete</h3>
              <p className="text-red-200/80 text-sm mb-6">{errorProfile}</p>
              <a href="/profile-setup" className="inline-block py-2.5 px-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-slate-100 font-bold rounded-xl text-xs uppercase tracking-wide">
                Go to Profile Setup
              </a>
            </div>
          ) : profile && (
            <div className="space-y-8">
              {/* User Bio Card */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neonLime/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    Biometric Assessment for <span className="text-neonLime">{profile.name}</span>
                  </h2>
                  <p className="text-zinc-400 text-xs leading-relaxed max-w-2xl">
                    Baseline targets generated from active biological markers: age ({profile.age}y), current weight ({profile.weight} kg), height ({profile.height} cm), and activity multiplier ({profile.activity_level}).
                  </p>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <div className="px-4 py-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Goal Route</span>
                    <span className="text-sm font-extrabold text-slate-100">{profile.goal}</span>
                  </div>
                  <div className="px-4 py-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Level</span>
                    <span className="text-sm font-extrabold text-slate-100">{profile.experience_level}</span>
                  </div>
                </div>
              </div>

              {/* Target Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* BMI */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body Mass Index (BMI)</span>
                      <div className="p-2 bg-neonCyan/10 text-neonCyan rounded-xl">
                        <Activity className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-slate-100 font-mono">{profile.bmi}</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 font-medium">Assessment:</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded border ${getBMICategory(profile.bmi).color}`}>
                      {getBMICategory(profile.bmi).label}
                    </span>
                  </div>
                </div>

                {/* BMR */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Basal Metabolic Rate (BMR)</span>
                    <div className="p-2 bg-neonLime/10 text-neonLime rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-slate-100 font-mono">{profile.bmr} <span className="text-xs text-zinc-400 font-normal">kcal/day</span></span>
                  <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Energy required to keep body functioning at rest.</p>
                </div>

                {/* TDEE */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Energy (TDEE)</span>
                    <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-slate-100 font-mono">{profile.tdee} <span className="text-xs text-zinc-400 font-normal">kcal/day</span></span>
                  <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Daily calorie burn including exercise and daily activity.</p>
                </div>

                {/* Calorie Target */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Calorie Target</span>
                    <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                      <Flame className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-slate-100 font-mono">{profile.daily_calories} <span className="text-xs text-zinc-400 font-normal">kcal/day</span></span>
                  <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Optimized target aligned with your fitness goal: <strong>{profile.goal}</strong>.</p>
                </div>

                {/* Protein Target */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Protein Target</span>
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-slate-100 font-mono">{profile.daily_protein} <span className="text-xs text-zinc-400 font-normal">grams</span></span>
                  <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Critical target for muscle preservation and progressive recovery.</p>
                </div>

                {/* Water Target */}
                <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden transition-all duration-300 hover:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Water Hydration</span>
                    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                      <Droplet className="w-5 h-5" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-slate-100 font-mono">{profile.daily_water} <span className="text-xs text-zinc-400 font-normal">Liters</span></span>
                  <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">Hydration baseline calculation tailored to activity level.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Workout Generator */}
      {activeTab === 'workout' && (
        <div className="space-y-6">
          {errorWorkout && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorWorkout}</span>
            </div>
          )}

          {loadingWorkout ? (
            <div className="space-y-6">
              {/* Spinner overlay */}
              <div className="glass-panel p-8 rounded-2xl border border-zinc-850 flex flex-col items-center justify-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute -inset-1 bg-gradient-to-r from-neonLime to-neonCyan rounded-full blur opacity-30 animate-pulse"></div>
                  <div className="absolute inset-0 border-4 border-zinc-900 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-neonLime border-r-neonCyan rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-semibold text-slate-200">AI Coach formulating your microcycles...</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Adjusting progressive parameters</p>
              </div>
              
              {/* Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="h-64 bg-zinc-900/50 border border-zinc-850 rounded-xl"></div>
                ))}
              </div>
            </div>
          ) : !workoutPlan ? (
            /* Settings & Generation Form */
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 max-w-2xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-neonLime" />
                Initialize AI Workout Plan
              </h2>

              <form onSubmit={handleGenerateWorkout} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Training Environment</label>
                    <select
                      value={workoutType}
                      onChange={(e) => setWorkoutType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                    >
                      <option value="Gym">Gym (Barbells, Machines & Dumbbells)</option>
                      <option value="Home">Home (Bodyweight & Resistance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Workout Days / Week</label>
                    <select
                      value={workoutDays}
                      onChange={(e) => setWorkoutDays(parseInt(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                    >
                      <option value={1}>1 Day (Full Body)</option>
                      <option value={2}>2 Days (Upper/Lower Split)</option>
                      <option value={3}>3 Days (Classic Push/Pull/Legs)</option>
                      <option value={4}>4 Days (Push/Pull/Legs + Full Body)</option>
                      <option value={5}>5 Days (Strength/Volume Overload)</option>
                      <option value={6}>6 Days (Double Push/Pull/Legs)</option>
                      <option value={7}>7 Days (Elite Conditioning Plan)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs text-zinc-400 flex gap-2.5">
                  <Info className="w-4 h-4 text-neonLime shrink-0 mt-0.5" />
                  <p>
                    The AI Coach dynamically structures routines day-by-day based on your profile goal (<strong>{profile?.goal || 'Maintenance'}</strong>) and physical experience level (<strong>{profile?.experience_level || 'Intermediate'}</strong>).
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Workout Plan</span>
                </button>
              </form>
            </div>
          ) : (
            /* Render Generated Plan */
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neonLime/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    AI Workout Plan: <span className="text-neonLime">{workoutPlan.workout_type} Focus</span>
                  </h2>
                  <p className="text-zinc-500 text-xs">
                    Target Goal: {workoutPlan.goal} | Experience: {workoutPlan.experience_level} | Days: {workoutPlan.days_per_week} times/week
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteWorkout}
                    className="py-2.5 px-4 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Routine</span>
                  </button>
                  
                  <button
                    onClick={() => setWorkoutPlan(null)}
                    className="py-2.5 px-4 bg-neonLime text-black rounded-xl text-xs font-extrabold flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerate Plan</span>
                  </button>
                </div>
              </div>

              {/* Day Routines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(workoutPlan.plan_data).map(([dayTitle, dayContent]) => (
                  <div key={dayTitle} className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-950/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
                        <h3 className="font-extrabold text-sm text-slate-200">{dayTitle}</h3>
                        <span className={`text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded ${
                          dayContent.type === 'Rest' 
                            ? 'bg-zinc-900 border border-zinc-800 text-zinc-500' 
                            : 'bg-neonLime/10 border border-neonLime/20 text-neonLime'
                        }`}>
                          {dayContent.type}
                        </span>
                      </div>

                      {dayContent.type === 'Rest' ? (
                        <div className="py-12 text-center text-zinc-500 text-xs italic">
                          Rest day. Allow your muscle fibers to repair and adapt to load stimulus.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {dayContent.exercises.map((ex, exIdx) => (
                            <div key={exIdx} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-start justify-between gap-3 hover:border-zinc-800 transition-all">
                              <div>
                                <span className="text-xs font-extrabold text-slate-100 flex items-center gap-1">
                                  <ChevronRight className="w-3.5 h-3.5 text-neonLime shrink-0" />
                                  {ex.exercise}
                                </span>
                                <span className="text-[10px] text-zinc-400 block mt-1 pl-4.5">{ex.notes}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-black text-neonLime block">{ex.sets} x {ex.reps}</span>
                                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{ex.rest} rest</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Meal Planner */}
      {activeTab === 'meal' && (
        <div className="space-y-6">
          {errorMeal && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMeal}</span>
            </div>
          )}

          {loadingMeal ? (
            <div className="space-y-6">
              {/* Spinner overlay */}
              <div className="glass-panel p-8 rounded-2xl border border-zinc-850 flex flex-col items-center justify-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute -inset-1 bg-gradient-to-r from-neonLime to-neonCyan rounded-full blur opacity-30 animate-pulse"></div>
                  <div className="absolute inset-0 border-4 border-zinc-900 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-neonLime border-r-neonCyan rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-semibold text-slate-200">AI Coach calculating customized nutrient ratios...</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Balancing Indian and Global recipes</p>
              </div>
              
              {/* Skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="h-64 bg-zinc-900/50 border border-zinc-850 rounded-xl"></div>
                ))}
              </div>
            </div>
          ) : !mealPlan ? (
            /* Settings & Generation Form */
            <div className="glass-panel p-6 rounded-2xl border border-zinc-850 max-w-2xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-neonLime" />
                Initialize AI Nutrition Plan
              </h2>

              <form onSubmit={handleGenerateMeal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Diet Preference</label>
                    <select
                      value={dietType}
                      onChange={(e) => setDietType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                    >
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non Vegetarian">Non-Vegetarian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Cuisine Theme</label>
                    <select
                      value={dietCuisine}
                      onChange={(e) => setDietCuisine(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-neonLime"
                    >
                      <option value="Indian Diet">Indian Cuisine (Roti, Dal, Paneer, Curry)</option>
                      <option value="Global">Global Standards (Oats, Eggs, Salmon, Turkey)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-900 text-xs text-zinc-400 flex gap-2.5">
                  <Info className="w-4 h-4 text-neonLime shrink-0 mt-0.5" />
                  <p>
                    Target calorie and macro splits (Protein, Carbs, Fats) will be calculated dynamically to fit your daily metabolic ceiling of <strong>{profile?.daily_calories || 2000} kcal</strong>.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Meal Plan</span>
                </button>
              </form>
            </div>
          ) : (
            /* Render Generated Meal Plan */
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neonCyan/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    AI Meal Plan: <span className="text-neonCyan">{mealPlan.diet_type} ({mealPlan.diet_cuisine})</span>
                  </h2>
                  <p className="text-zinc-500 text-xs">
                    Target Macros: Calories: {mealPlan.calories} kcal | Protein: {mealPlan.protein}g | Carbs: {mealPlan.carbohydrates}g | Fat: {mealPlan.fat}g
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteMeal}
                    className="py-2.5 px-4 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Meal Plan</span>
                  </button>
                  
                  <button
                    onClick={() => setMealPlan(null)}
                    className="py-2.5 px-4 bg-neonCyan text-black rounded-xl text-xs font-extrabold flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerate Plan</span>
                  </button>
                </div>
              </div>

              {/* Meals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(mealPlan.meals_data).map(([mealType, mealContent]) => (
                  <div key={mealType} className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-950/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-neonCyan/5 rounded-full blur-xl pointer-events-none"></div>
                    <div>
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
                        <h3 className="font-extrabold text-sm text-slate-200">{mealType}</h3>
                        <span className="text-[10px] text-neonCyan font-bold">{mealContent.calories} kcal</span>
                      </div>

                      <span className="text-xs font-extrabold text-slate-100 leading-snug block mb-4">{mealContent.name}</span>
                    </div>

                    <div className="pt-3 border-t border-zinc-900/80 space-y-1.5 text-[10px] text-zinc-400 font-semibold">
                      <div className="flex justify-between">
                        <span>Protein:</span>
                        <span className="text-slate-200">{mealContent.protein}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbohydrates:</span>
                        <span className="text-slate-200">{mealContent.carbohydrates}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fats:</span>
                        <span className="text-slate-200">{mealContent.fat}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};
