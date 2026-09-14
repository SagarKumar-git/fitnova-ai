/**
 * FitNova AI — WorkoutStats Page
 * Analytics dashboard displaying volume trends, streaks, muscle distribution, and PR milestones.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { usePersonalRecords } from '../hooks/usePersonalRecords.ts';
import type { WorkoutStats as WorkoutStatsModel } from '../models/WorkoutStats.ts';
import {
  BarChart2,
  TrendingUp,
  Dumbbell,
  Trophy,
  Flame,
  ArrowLeft,
  Zap,
} from 'lucide-react';

export const WorkoutStats: React.FC = () => {
  const navigate = useNavigate();
  const { service } = useWorkout();
  const { personalRecords } = usePersonalRecords();

  const [stats, setStats] = useState<WorkoutStatsModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    service
      .getWorkoutStats()
      .then((data) => {
        if (mounted) {
          setStats(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [service]);

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-neonLime border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            Loading Analytics...
          </span>
        </div>
      </div>
    );
  }

  // Calculate max volume for weekly trend relative bar heights
  const maxWeeklyVolume = Math.max(
    ...stats.weeklyVolumeTrends.map((t) => t.volumeKg),
    1000
  );

  // Filter muscle distribution to non-zero or top entries
  const activeMuscles = Object.entries(stats.muscleGroupDistribution)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalMuscleSets = activeMuscles.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/workouts')}
            className="h-10 w-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Back to Training Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neonLime flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" /> Performance Analytics
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Training Metrics & Progression
            </h1>
          </div>
        </div>

        {/* 4 Primary KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <div className="w-10 h-10 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center mb-3">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Total Workouts</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {stats.totalWorkouts}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Sessions Logged</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <div className="w-10 h-10 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Volume Moved</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {Math.round(stats.totalVolumeKg).toLocaleString()}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Total Kilograms</span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Weekly Streak</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {stats.currentStreakWeeks} wks
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              Best: {stats.bestStreakWeeks} weeks
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Personal Records</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {stats.totalPersonalRecords}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">All-time PRs</span>
          </div>
        </div>

        {/* Weekly Volume Trends Chart */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">Weekly Volume Progression</h3>
              <p className="text-xs text-zinc-400">Total weight volume moved across recent weeks</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neonLime font-bold bg-neonLime/10 px-2.5 py-1 rounded-full border border-neonLime/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Overload Trajectory</span>
            </div>
          </div>

          {stats.weeklyVolumeTrends.length > 0 ? (
            <div className="pt-6 pb-2">
              <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 sm:h-56 px-2">
                {stats.weeklyVolumeTrends.map((trend) => {
                  const heightPercent = Math.max(
                    8,
                    Math.round((trend.volumeKg / maxWeeklyVolume) * 100)
                  );

                  return (
                    <div
                      key={trend.week}
                      className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <span className="text-[10px] font-mono font-bold text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {Math.round(trend.volumeKg).toLocaleString()} kg
                      </span>

                      {/* Bar */}
                      <div className="w-full max-w-[42px] bg-zinc-800 rounded-t-lg overflow-hidden flex flex-col justify-end">
                        <div
                          className="w-full bg-gradient-to-t from-neonLime/40 to-neonLime rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-[0_0_12px_rgba(204,255,0,0.3)]"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* Label */}
                      <span className="text-[11px] font-semibold text-zinc-500 truncate w-full text-center">
                        {trend.week.replace('2026-', '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-zinc-500">
              No weekly volume recorded yet. Log sessions to view trends.
            </div>
          )}
        </div>

        {/* Muscle Group Distribution & Personal Records Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Muscle Group Distribution */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Muscle Group Distribution</h3>
            <p className="text-xs text-zinc-400">Sets allocated per muscle architecture</p>

            {activeMuscles.length > 0 ? (
              <div className="space-y-3 pt-2">
                {activeMuscles.slice(0, 7).map(([muscle, count]) => {
                  const pct = totalMuscleSets > 0 ? Math.round((count / totalMuscleSets) * 100) : 0;

                  return (
                    <div key={muscle} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-300">{muscle}</span>
                        <span className="text-zinc-400">
                          {count} sets ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-neonLime h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-zinc-500">
                Muscle distribution will calculate as you complete workouts.
              </div>
            )}
          </div>

          {/* Personal Records Table */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white">Personal Record Hall</h3>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-zinc-400">All-time strength milestones and 1RM feats</p>

            {personalRecords.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {personalRecords.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{pr.exerciseName}</h4>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">
                        {pr.metric === '1rm' ? 'Estimated 1RM' : 'Max Weight'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-amber-400 font-mono">
                        {pr.value} kg
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(pr.achievedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-zinc-500">
                No personal records logged yet. Break a PR during your next workout!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
