import { API_BASE_URL } from "../config";
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { 
  Flame, Award, Dumbbell, Settings, Save, Target 
} from 'lucide-react';

interface StreakData {
  daily_streak: number;
  weekly_streak: number;
  longest_daily_streak: number;
  longest_weekly_streak: number;
  last_workout_date?: string;
}

interface GoalData {
  id?: string;
  target_workouts_per_week: number;
  target_volume: number;
  target_strength_goal?: string;
}

interface AnalyticsResponse {
  total_workouts: number;
  total_volume: number;
  total_sets: number;
  total_duration_minutes: number;
  weekly_workout_frequency: number;
  workout_streak: StreakData;
  muscle_volume_breakdown: Record<string, number>;
  goals?: GoalData;
}

export const WorkoutAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Goal Form state
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [targetWorkouts, setTargetWorkouts] = useState(3);
  const [targetVolume, setTargetVolume] = useState(0);
  const [targetStrength, setTargetStrength] = useState('');
  const [goalSaveError, setGoalSaveError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/workout/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
        if (analyticsData.goals) {
          setTargetWorkouts(analyticsData.goals.target_workouts_per_week);
          setTargetVolume(analyticsData.goals.target_volume);
          setTargetStrength(analyticsData.goals.target_strength_goal || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalSaveError(null);
    const token = localStorage.getItem('fitnova_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/workout/analytics/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_workouts_per_week: targetWorkouts,
          target_volume: targetVolume,
          target_strength_goal: targetStrength || null
        })
      });

      if (response.ok) {
        setShowGoalEditor(false);
        fetchAnalytics();
      } else {
        const err = await response.json();
        setGoalSaveError(err.detail || "Failed to update goals.");
      }
    } catch (err) {
      setGoalSaveError("Connection error. Try again.");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-neonLime"></div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12 text-zinc-500">
          Failed to load analytics details. Ensure database seed and sessions are logged.
        </div>
      </Layout>
    );
  }

  // Calculate workout frequency progress percentage
  const weeklyFreqTarget = data.goals?.target_workouts_per_week || 3;
  const weeklyFreqPct = Math.min(100, Math.round((data.weekly_workout_frequency / weeklyFreqTarget) * 100));

  // Sort muscles by contribution
  const sortedMuscles = Object.entries(data.muscle_volume_breakdown)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, pct]) => pct > 0);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Workout Analytics</h1>
          <p className="text-zinc-400 mt-1">Track progressive load records, streak counters, and weekly targets.</p>
        </div>
        
        <button 
          onClick={() => setShowGoalEditor(!showGoalEditor)}
          className="px-4 py-2.5 rounded-xl border border-zinc-805 bg-zinc-900/50 hover:bg-zinc-900 text-slate-200 text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 align-self-start"
        >
          <Settings className="w-4 h-4" />
          <span>{showGoalEditor ? "Hide Goal Settings" : "Configure Targets"}</span>
        </button>
      </div>

      {showGoalEditor && (
        <form onSubmit={handleSaveGoals} className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-950/20 max-w-xl mb-6 space-y-4">
          <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5 uppercase tracking-wide">
            <Target className="w-4 h-4 text-neonLime" />
            <span>Configure Workout Goals</span>
          </h3>

          {goalSaveError && (
            <p className="text-xs text-red-400">{goalSaveError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1.5">Target Workouts / Week</label>
              <input 
                type="number" 
                min="1" 
                max="21"
                required
                value={targetWorkouts}
                onChange={(e) => setTargetWorkouts(parseInt(e.target.value) || 3)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1.5">Target Total Volume (kg)</label>
              <input 
                type="number" 
                min="0"
                value={targetVolume || ''}
                placeholder="Optional"
                onChange={(e) => setTargetVolume(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase text-zinc-500 mb-1.5">Strength Goal Note</label>
            <input 
              type="text" 
              placeholder="e.g. Bench press 100kg for reps, Squat 140kg 1RM..."
              value={targetStrength}
              onChange={(e) => setTargetStrength(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-neonLime"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit"
              className="px-4 py-2 bg-neonLime hover:bg-neonLime-dark text-black rounded-xl font-extrabold text-xs tracking-wider uppercase transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Targets</span>
            </button>
          </div>
        </form>
      )}

      {/* Streak Fire Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Daily Streak */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-950/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 neon-glow-lime">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Daily Streak</span>
            <p className="text-xl font-black text-slate-100 font-mono mt-0.5">{data.workout_streak.daily_streak} Days</p>
            <span className="text-[9px] text-zinc-600 block mt-0.5">Best record: {data.workout_streak.longest_daily_streak} days</span>
          </div>
        </div>

        {/* Weekly Streak */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-950/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neonLime/10 border border-neonLime/20 flex items-center justify-center text-neonLime neon-glow-lime">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Weekly Streak</span>
            <p className="text-xl font-black text-slate-100 font-mono mt-0.5">{data.workout_streak.weekly_streak} Weeks</p>
            <span className="text-[9px] text-zinc-600 block mt-0.5">Best record: {data.workout_streak.longest_weekly_streak} weeks</span>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-950/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Workouts Completed</span>
            <p className="text-xl font-black text-slate-100 font-mono mt-0.5">{data.total_workouts}</p>
            <span className="text-[9px] text-zinc-650 block mt-0.5">{data.total_sets} sets logged</span>
          </div>
        </div>

        {/* Cumulative Volume */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-950/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Cumulative Volume</span>
            <p className="text-xl font-black text-slate-100 font-mono mt-0.5">{data.total_volume} kg</p>
            <span className="text-[9px] text-zinc-650 block mt-0.5">{(data.total_duration_minutes / 60.0).toFixed(1)} hrs active duration</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Goals & Weekly Target Meter */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-6">
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide border-b border-zinc-900 pb-2">Weekly Target Progress</h3>
            
            {/* Target sessions ring/bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-400">Workout Frequency ({data.weekly_workout_frequency} of {weeklyFreqTarget} / week)</span>
                <span className="text-neonLime font-bold">{weeklyFreqPct}%</span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className="h-full rounded-full bg-neonLime"
                  style={{ width: `${weeklyFreqPct}%` }}
                ></div>
              </div>
            </div>

            {/* Target strength goal text */}
            <div className="space-y-2 border-t border-zinc-900 pt-4">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">Strength Milestones</span>
              {data.goals?.target_strength_goal ? (
                <p className="text-sm text-slate-300 italic font-medium leading-relaxed">&ldquo;{data.goals.target_strength_goal}&rdquo;</p>
              ) : (
                <p className="text-xs text-zinc-600">No active strength milestones set. Configure Targets above to write one!</p>
              )}
            </div>

            {/* Target total volume (if set) */}
            {data.goals?.target_volume && data.goals.target_volume > 0 ? (
              <div className="space-y-2 border-t border-zinc-900 pt-4">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">Volume Target</span>
                <p className="text-xs text-zinc-400">Aiming for <span className="font-bold text-slate-200">{data.goals.target_volume}kg</span> of total weekly load volume.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Muscle Group Volume Distribution */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-5">
            <div className="border-b border-zinc-900 pb-2">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">Muscle Group Volume Distribution</h3>
              <p className="text-zinc-500 text-[10px] mt-0.5">Ratios computed based on set weights, reps, and exercise muscle contribution percentages.</p>
            </div>

            {sortedMuscles.length === 0 ? (
              <div className="text-center text-zinc-650 text-xs py-12">
                No volume logs available. Start completing sets inside the Workout Diary to map distribution!
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMuscles.map(([name, pct]) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-350">{name}</span>
                      <span className="font-mono text-zinc-400">{pct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                      <div 
                        className="h-full rounded-full bg-neonLime"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};
