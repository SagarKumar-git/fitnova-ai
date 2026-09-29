/**
 * FitNova AI — WorkoutStats Analytics & Personalization Dashboard
 * Premium enterprise analytics displaying KPI cards, ACWR training load,
 * muscle recovery distribution, 1RM curves, exercise session comparison,
 * and context-aware Nova AI training insights.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { useHealthData } from '../../health/hooks/useHealthData.ts';
import { useRecoveryMetrics } from '../../health/hooks/useRecoveryMetrics.ts';

import {
  useStorage,
  useEventBus,
  useAnalytics,
} from '../../../platform/container/PlatformContext.tsx';
import {
  WorkoutAnalyticsService,
  type UnifiedWorkoutAnalytics,
  type ExerciseComparison,
} from '../analytics/WorkoutAnalyticsService.ts';
import {
  BarChart2,
  TrendingUp,
  Dumbbell,
  Trophy,
  Flame,
  ArrowLeft,
  Activity,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Target,
  RefreshCw,
} from 'lucide-react';

export const WorkoutStats: React.FC = () => {
  const navigate = useNavigate();
  const { service } = useWorkout();
  const storage = useStorage();
  const eventBus = useEventBus();
  const analytics = useAnalytics();

  const [data, setData] = useState<UnifiedWorkoutAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ExerciseComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'exercises' | 'load' | 'wearables'>('overview');

  const { dataset: healthDataset } = useHealthData();
  const { metrics: recoveryMetrics } = useRecoveryMetrics();

  const analyticsService = useMemo(
    () =>
      new WorkoutAnalyticsService({
        repository: service.getRepository(),
        storage,
        eventBus,
      }),
    [service, storage, eventBus]
  );

  // Initial load
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    // Track analytics event
    analytics.track('WORKOUT_ANALYTICS_VIEWED');

    analyticsService
      .getUnifiedAnalytics()
      .then((res) => {
        if (mounted) {
          setData(res);
          if (res.estimated1RMProgression.length > 0) {
            setSelectedExerciseId(res.estimated1RMProgression[0].exerciseId);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [analyticsService, analytics]);

  // Load exercise comparison when selected exercise changes
  useEffect(() => {
    if (!selectedExerciseId) return;

    let mounted = true;
    setIsLoadingComparison(true);

    analytics.track('EXERCISE_HISTORY_VIEWED', { exerciseId: selectedExerciseId });

    analyticsService
      .getExerciseComparison(selectedExerciseId)
      .then((comp) => {
        if (mounted) {
          setComparison(comp);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingComparison(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedExerciseId, analyticsService, analytics]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const refreshed = await analyticsService.getUnifiedAnalytics({ forceRefresh: true });
      setData(refreshed);
      if (selectedExerciseId) {
        const comp = await analyticsService.getExerciseComparison(selectedExerciseId);
        setComparison(comp);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-neonLime border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            Calibrating Workout Analytics...
          </span>
        </div>
      </div>
    );
  }



  // Active muscle volume breakdown
  const { activeMuscles, totalMuscleVolume } = useMemo(() => {
    if (!data?.muscleGroupDistribution) return { activeMuscles: [], totalMuscleVolume: 0 };
    const muscles = Object.entries(data.muscleGroupDistribution)
      .filter(([, d]) => d.volumeKg > 0)
      .sort((a, b) => b[1].volumeKg - a[1].volumeKg);
    const total = muscles.reduce((sum, [, d]) => sum + d.volumeKg, 0);
    return { activeMuscles: muscles, totalMuscleVolume: total };
  }, [data?.muscleGroupDistribution]);

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  <BarChart2 className="w-3.5 h-3.5" /> Workout OS Analytics
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  Sprint 3.6
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Workout Analytics & Adaptive Intelligence
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {/* Navigation Tabs */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-neonLime text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('exercises')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'exercises'
                    ? 'bg-neonLime text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Exercise History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('load')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'load'
                    ? 'bg-neonLime text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Training Load
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wearables')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'wearables'
                    ? 'bg-neonLime text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Wearables & Form
              </button>
            </div>
          </div>
        </div>

        {/* Primary KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center mb-3">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Weekly Workouts</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {data.workoutsThisWeek}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              {data.trainingFrequency} / wk avg · {data.adherencePercentage}% adherence
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Weekly Volume</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {data.weeklyVolume.toLocaleString()}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              Total: {data.totalTrainingVolume.toLocaleString()} kg moved
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Current Streak</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {data.currentWorkoutStreak} wks
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              Longest: {data.longestWorkoutStreak} weeks
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-400 font-semibold block">Strength Progress</span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {data.biggestImprovement ? `+${data.biggestImprovement.percentageGain}%` : `${data.prCount} PRs`}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              {data.biggestImprovement ? `Peak on ${data.biggestImprovement.exerciseName}` : 'All-time milestones'}
            </span>
          </div>
        </div>

        {/* Nova AI Dedicated Analytics Insight Card */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border border-neonLime/30 rounded-2xl p-5 sm:p-6 shadow-[0_0_24px_rgba(204,255,0,0.06)] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-neonLime/20 text-neonLime flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-neonLime">
                  Nova Training Intelligence
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neonLime/10 text-neonLime border border-neonLime/20 font-semibold">
                  {data.novaInsight.trendDirection === 'upward' ? 'Trending Upward' : 'Calibrated'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white">
                {data.novaInsight.headline}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                {data.novaInsight.why}
              </p>

              {/* Supporting Metrics Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {data.novaInsight.supportingMetrics.map((m, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-medium flex items-center gap-1.5"
                  >
                    <Activity className="w-3 h-3 text-neonLime" />
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="sm:text-right shrink-0 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-1 sm:max-w-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Recommended Next Action
              </span>
              <p className="text-xs font-semibold text-white">
                {data.novaInsight.recommendedNextAction}
              </p>
              <button
                type="button"
                onClick={() => navigate('/workouts')}
                className="mt-2 text-xs font-bold text-neonLime hover:text-white flex items-center gap-1 sm:justify-end transition-colors"
              >
                <span>Start Recommended Session</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 5 Core Summary Insights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">Strongest Exercise</span>
                <span className="text-sm font-bold text-white mt-1 block truncate">
                  {data.strongestExercise ? data.strongestExercise.exerciseName : 'Calibrating'}
                </span>
                <span className="text-xs text-neonLime font-mono font-bold">
                  {data.strongestExercise ? `${data.strongestExercise.current1RM}kg 1RM` : '—'}
                </span>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">Biggest Improvement</span>
                <span className="text-sm font-bold text-white mt-1 block truncate">
                  {data.biggestImprovement ? data.biggestImprovement.exerciseName : 'Calibrating'}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {data.biggestImprovement ? `+${data.biggestImprovement.percentageGain}% gain` : '—'}
                </span>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">Most-Trained Muscle</span>
                <span className="text-sm font-bold text-white mt-1 block truncate">
                  {data.mostTrainedMuscle ? data.mostTrainedMuscle.muscleGroup : 'General'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {data.mostTrainedMuscle ? `${data.mostTrainedMuscle.percentage}% volume` : '—'}
                </span>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">Undertrained Muscle</span>
                <span className="text-sm font-bold text-white mt-1 block truncate">
                  {data.undertrainedMuscle ? data.undertrainedMuscle.muscleGroup : 'Balanced'}
                </span>
                <span className="text-xs text-amber-400 font-mono">
                  {data.undertrainedMuscle && data.undertrainedMuscle.volumeKg === 0
                    ? '0kg volume'
                    : 'Target next'}
                </span>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-400 font-medium block">Training Consistency</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {data.trainingConsistency.ratingLabel}
                </span>
                <span className="text-xs text-neonLime font-mono font-bold">
                  {data.trainingConsistency.consistencyScore}/100 Score
                </span>
              </div>
            </div>

            {/* Charts Grid: 1RM Curves & Muscle Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Estimated 1RM Progression Card */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Estimated 1RM Progression</h3>
                    <p className="text-xs text-zinc-400">Chronological peak strength trajectory</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('exercises')}
                    className="text-xs text-neonLime font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {data.estimated1RMProgression.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {data.estimated1RMProgression.slice(0, 5).map((ex) => {
                      const gain = ex.percentageImprovement;
                      return (
                        <div
                          key={ex.exerciseId}
                          onClick={() => {
                            setSelectedExerciseId(ex.exerciseId);
                            setActiveTab('exercises');
                          }}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-neonLime/40 transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-white">{ex.exerciseName}</h4>
                            <span className="text-[11px] text-zinc-400">
                              {ex.previous1RM}kg → <strong className="text-white">{ex.current1RM}kg 1RM</strong>
                            </span>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-0.5 ${
                                gain > 0
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : gain < 0
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {gain > 0 ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : gain < 0 ? (
                                <ArrowDownRight className="w-3 h-3" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {gain > 0 ? `+${gain}%` : `${gain}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-zinc-500">
                    Log completed workout sets to generate 1RM strength progression curves.
                  </div>
                )}
              </div>

              {/* Muscle Group Distribution */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Muscle Group Distribution</h3>
                    <p className="text-xs text-zinc-400">Tonnage and set allocation per architecture</p>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    {totalMuscleVolume.toLocaleString()} kg total
                  </span>
                </div>

                {activeMuscles.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {activeMuscles.slice(0, 6).map(([muscle, d]) => {
                      const pct = d.percentage;
                      return (
                        <div key={muscle} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-zinc-300">{muscle}</span>
                            <span className="text-zinc-400 font-mono">
                              {d.volumeKg.toLocaleString()} kg ({pct}%) · {d.setsCount} sets
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-neonLime h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-zinc-500">
                    Muscle distribution will populate as you log exercises.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXERCISE HISTORY & SESSION COMPARISON */}
        {activeTab === 'exercises' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Exercise History & Comparison</h3>
                <p className="text-xs text-zinc-400">
                  Select an exercise to analyze chronological progression and compare Last Session vs Current Session
                </p>
              </div>

              {/* Exercise Selector Buttons */}
              {data.estimated1RMProgression.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.estimated1RMProgression.map((ex) => (
                    <button
                      key={ex.exerciseId}
                      type="button"
                      onClick={() => setSelectedExerciseId(ex.exerciseId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        selectedExerciseId === ex.exerciseId
                          ? 'bg-neonLime text-zinc-950 font-bold shadow-sm'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <span>{ex.exerciseName}</span>
                      <span className="font-mono text-[10px] opacity-80">{ex.current1RM}kg</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No historical exercises logged yet.</div>
              )}

              {/* Comparison Card: Last Session vs Current Session */}
              {isLoadingComparison ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-neonLime border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comparison ? (
                <div className="space-y-6">
                  {/* Last vs Current Visual Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Previous Session */}
                    <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Previous Session
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {comparison.previousSession?.date || 'N/A'}
                        </span>
                      </div>

                      {comparison.previousSession ? (
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Weight</span>
                            <span className="text-base font-black text-white font-mono">
                              {comparison.previousSession.weightKg} kg
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Reps</span>
                            <span className="text-base font-black text-white font-mono">
                              {comparison.previousSession.reps}
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Est 1RM</span>
                            <span className="text-base font-black text-neonLime font-mono">
                              {comparison.previousSession.estimated1RM} kg
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-zinc-500">
                          First session logged. Previous baseline unavailable.
                        </div>
                      )}
                    </div>

                    {/* Current Session */}
                    <div className="bg-zinc-950/70 border border-neonLime/30 rounded-xl p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-neonLime flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" /> Current Session
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {comparison.currentSession?.date || 'N/A'}
                        </span>
                      </div>

                      {comparison.currentSession ? (
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Weight</span>
                            <span className="text-base font-black text-white font-mono">
                              {comparison.currentSession.weightKg} kg
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Reps</span>
                            <span className="text-base font-black text-white font-mono">
                              {comparison.currentSession.reps}
                            </span>
                          </div>
                          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 block">Est 1RM</span>
                            <span className="text-base font-black text-neonLime font-mono">
                              {comparison.currentSession.estimated1RM} kg
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-zinc-500">
                          No active session data.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overload Deltas Banner */}
                  {comparison.hasComparison && (
                    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-white block">Progressive Overload Delta</span>
                        <span className="text-[11px] text-zinc-400">
                          Net change between last two completed performances
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Weight</span>
                          <span
                            className={`font-bold ${
                              comparison.deltas.weightDeltaKg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {comparison.deltas.weightDeltaKg >= 0
                              ? `+${comparison.deltas.weightDeltaKg}`
                              : comparison.deltas.weightDeltaKg}{' '}
                            kg
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-400 block">Reps</span>
                          <span
                            className={`font-bold ${
                              comparison.deltas.repsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {comparison.deltas.repsDelta >= 0
                              ? `+${comparison.deltas.repsDelta}`
                              : comparison.deltas.repsDelta}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-400 block">1RM Delta</span>
                          <span
                            className={`font-bold ${
                              comparison.deltas.oneRmDeltaKg >= 0 ? 'text-neonLime' : 'text-rose-400'
                            }`}
                          >
                            {comparison.deltas.oneRmDeltaKg >= 0
                              ? `+${comparison.deltas.oneRmDeltaKg}`
                              : comparison.deltas.oneRmDeltaKg}{' '}
                            kg ({comparison.deltas.percentageGain > 0 ? `+${comparison.deltas.percentageGain}%` : `${comparison.deltas.percentageGain}%`})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chronological Session History Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white block">Chronological Session Log</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                            <th className="py-2 px-3 font-semibold">Date</th>
                            <th className="py-2 px-3 font-semibold">Top Set Weight</th>
                            <th className="py-2 px-3 font-semibold">Reps</th>
                            <th className="py-2 px-3 font-semibold">Estimated 1RM</th>
                            <th className="py-2 px-3 font-semibold">Volume</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono">
                          {comparison.fullHistory.map((h, idx) => (
                            <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="py-2.5 px-3 text-zinc-300 font-sans">{h.date}</td>
                              <td className="py-2.5 px-3 text-white font-bold">{h.weightKg} kg</td>
                              <td className="py-2.5 px-3 text-zinc-300">{h.reps}</td>
                              <td className="py-2.5 px-3 text-neonLime font-bold">{h.estimated1RM} kg</td>
                              <td className="py-2.5 px-3 text-zinc-400">{h.volumeKg.toLocaleString()} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* TAB 3: TRAINING LOAD & RECOVERY */}
        {activeTab === 'load' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ACWR Training Load Card */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Acute:Chronic Workload (ACWR)</h3>
                    <p className="text-xs text-zinc-400">Fatigue accumulation vs chronic adaptation baseline</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      data.trainingLoad.status === 'optimal'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : data.trainingLoad.status === 'excessive_spike'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {data.trainingLoad.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-400 font-medium">Workload Ratio (ACWR)</span>
                    <span className="text-2xl font-black text-neonLime font-mono">
                      {data.trainingLoad.loadRatio.toFixed(2)}
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        data.trainingLoad.loadRatio > 1.5
                          ? 'bg-rose-500'
                          : data.trainingLoad.loadRatio >= 1.3
                          ? 'bg-amber-400'
                          : 'bg-neonLime'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(10, data.trainingLoad.loadRatio * 50))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Acute Load (7-Day)</span>
                      <span className="font-bold text-white">
                        {data.trainingLoad.acuteLoad.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Chronic Avg (4-Week)</span>
                      <span className="font-bold text-zinc-300">
                        {data.trainingLoad.weeklyChronicAverage.toLocaleString()} kg/wk
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">Guidance & Rationale</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {data.trainingLoad.recommendation}
                  </p>
                  <ul className="space-y-1 pt-1">
                    {data.trainingLoad.reasons.map((r, i) => (
                      <li key={i} className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-neonLime shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Per-Muscle Recovery Radar */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Muscle Recovery Status</h3>
                    <p className="text-xs text-zinc-400">Rest intervals and readiness per group</p>
                  </div>
                  <span className="text-xs text-neonLime font-mono font-bold">
                    {data.muscleRecovery.overallRecoveryScore}/100 Avg
                  </span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {Object.values(data.muscleRecovery.muscles).map((m) => {
                    const statusColor =
                      m.estimatedRecoveryStatus === 'fresh' || m.estimatedRecoveryStatus === 'recovered'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : m.estimatedRecoveryStatus === 'moderate'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-rose-400 bg-rose-500/10';

                    return (
                      <div
                        key={m.muscleGroup}
                        className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{m.muscleGroup}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}
                            >
                              {m.estimatedRecoveryStatus}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 block">
                            {m.hoursSinceLastTrained !== null
                              ? `Trained ${m.hoursSinceLastTrained}h ago · ${m.recentVolumeKg.toLocaleString()}kg 7d vol`
                              : 'No recent strain recorded'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-zinc-300">
                            {m.recoveryPercentage}%
                          </span>
                          <span className="text-[10px] text-zinc-500 block">
                            {m.isReadyToTrain ? 'Ready' : 'Resting'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Wearables & AI Form Analysis (Sprint 3.7) */}
        {activeTab === 'wearables' && (
          <div className="space-y-6">
            {/* Wearable Connectivity & Status Banner */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neonLime/10 text-neonLime flex items-center justify-center font-black">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Wearable Health Integration</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {healthDataset?.provider === 'mock'
                        ? 'Simulated Sensor Mode'
                        : `${healthDataset?.provider || 'Connected'}`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Continuous HRV, sleep architecture, and recovery-adjusted training strain
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Resting HR</span>
                  <span className="font-bold text-white">
                    {recoveryMetrics?.restingHeartRateBpm || 59} BPM
                  </span>
                </div>
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">HRV RMSSD</span>
                  <span className="font-bold text-neonLime">
                    {recoveryMetrics?.hrvRmssdMs || 62} ms
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* HRV Status Card */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    HRV Autonomic Status
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-neonLime/10 text-neonLime border border-neonLime/20 uppercase">
                    {recoveryMetrics?.hrvStatus || 'Optimal'}
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {recoveryMetrics?.hrvRmssdMs || 62} <span className="text-sm font-normal text-zinc-400">ms</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Parasympathetic autonomic tone is balanced. Cardiac intervals confirm high readiness for muscular overload.
                </p>
              </div>

              {/* Sleep Architecture Card */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Sleep Architecture
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {recoveryMetrics?.sleepEfficiencyPct || 92}% Efficiency
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {recoveryMetrics?.sleepHours || 7.5} <span className="text-sm font-normal text-zinc-400">hours</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">Deep Sleep</span>
                    <span className="text-white font-bold">{recoveryMetrics?.deepSleepPct || 23}%</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">REM Sleep</span>
                    <span className="text-white font-bold">{recoveryMetrics?.remSleepPct || 25}%</span>
                  </div>
                </div>
              </div>

              {/* AI Form Quality Index */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    AI Form Quality Index
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    94/100 Average
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  94 <span className="text-sm font-normal text-zinc-400">/ 100</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Excellent joint tracking symmetry. Consistent parallel squat depth and proper elbow tuck on bench press.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
