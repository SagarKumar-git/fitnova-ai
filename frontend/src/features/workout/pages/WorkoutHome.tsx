/**
 * FitNova AI — WorkoutHome Page
 * Main Workout OS hub featuring active session resume banner, recommended routine,
 * filterable workout library, quick PR showcase, and navigation to History & Stats.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../state/WorkoutContext.tsx';
import { useWorkouts } from '../hooks/useWorkouts.ts';
import { usePersonalRecords } from '../hooks/usePersonalRecords.ts';
import type { WorkoutRecommendation } from '../models/Recommendation.ts';
import { WorkoutCard } from '../components/WorkoutCard.tsx';
import { WorkoutEmptyState } from '../components/WorkoutEmptyState.tsx';
import {
  Dumbbell,
  Flame,
  Sparkles,
  Play,
  Clock,
  History,
  BarChart2,
  Search,
  Trophy,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const WorkoutHome: React.FC = () => {
  const navigate = useNavigate();
  const { activeSession, service } = useWorkout();
  const { workouts, isLoading } = useWorkouts();
  const { personalRecords } = usePersonalRecords();

  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    service
      .getRecommendedWorkouts()
      .then((recs) => {
        if (mounted && recs.length > 0) {
          setRecommendation(recs[0]);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [service]);

  // Find the full workout object for the recommendation
  const recommendedWorkout = recommendation
    ? workouts.find((w) => w.id === recommendation.workoutId)
    : null;

  // Filter workouts
  const filteredWorkouts = workouts.filter((w) => {
    const matchesGoal =
      selectedGoal === 'all' ||
      w.goal.toLowerCase() === selectedGoal.toLowerCase() ||
      (selectedGoal === 'custom' && !w.isTemplate);
    const matchesSearch =
      searchQuery.trim() === '' ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.targetMuscleGroups.some((m) =>
        m.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesGoal && matchesSearch;
  });

  const goals = [
    { id: 'all', label: 'All Routines' },
    { id: 'hypertrophy', label: 'Hypertrophy' },
    { id: 'strength', label: 'Strength' },
    { id: 'endurance', label: 'Endurance' },
    { id: 'fat_loss', label: 'Fat Loss' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Active Session Resume Banner */}
        {activeSession && (
          <div
            onClick={() => navigate('/workouts/active')}
            className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-neonLime/20 via-zinc-900 to-zinc-900 border border-neonLime/60 p-4 sm:p-5 shadow-[0_0_25px_rgba(204,255,0,0.15)] transition-all hover:border-neonLime"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neonLime text-black flex items-center justify-center font-black animate-pulse">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-neonLime">
                      Session In Progress
                    </span>
                    <span className="w-2 h-2 rounded-full bg-neonLime animate-ping" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {activeSession.workoutName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span>
                      {Math.floor(activeSession.durationSeconds / 60)}m elapsed
                    </span>
                    <span>•</span>
                    <span>
                      {Math.round(activeSession.totalVolume).toLocaleString()} kg moved
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="h-10 px-4 rounded-xl bg-neonLime text-black text-xs font-black flex items-center gap-1.5 shadow-md group-hover:scale-105 transition-transform shrink-0"
              >
                <span>Resume</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neonLime flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> FitNova Workout OS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Training Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Select an intelligent training protocol, track live sets, and break personal records.
            </p>
          </div>

          {/* Quick Hub Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/workouts/history')}
              className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <History className="w-4 h-4 text-neonLime" />
              <span>History</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/workouts/stats')}
              className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <BarChart2 className="w-4 h-4 text-neonLime" />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Today's AI Recommendation */}
        {recommendedWorkout && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-neonLime/40 p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-neonLime/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-neonLime text-black text-[11px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-black" />
                    Today's Nova AI Pick
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    Confidence: {Math.round((recommendation?.score ?? 0.9) * 100)}%
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                  {recommendedWorkout.name}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {recommendation?.reason || recommendedWorkout.description}
                </p>

                <div className="flex items-center gap-4 flex-wrap text-xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                    <Clock className="w-4 h-4 text-neonLime" />
                    <span>{recommendedWorkout.estimatedDurationMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                    <Dumbbell className="w-4 h-4 text-neonLime" />
                    <span>{recommendedWorkout.exercises.length} Exercises</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                    <TrendingUp className="w-4 h-4 text-neonLime" />
                    <span>{recommendedWorkout.difficulty}</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-row lg:flex-col gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    service.startWorkout({ workoutId: recommendedWorkout.id }).then(() => {
                      navigate('/workouts/active');
                    });
                  }}
                  className="h-12 px-6 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Workout Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/workouts/${recommendedWorkout.id}`)}
                  className="h-12 px-6 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Review Exercises</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick PR Highlights Strip */}
        {personalRecords.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  Recent Personal Records
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/workouts/stats')}
                className="text-xs text-neonLime hover:underline font-semibold"
              >
                View all PRs
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {personalRecords.slice(0, 4).map((pr) => (
                <div
                  key={pr.id}
                  className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3"
                >
                  <span className="text-[11px] text-zinc-400 font-medium block truncate">
                    {pr.exerciseName}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base font-black text-amber-400 font-mono">
                      {pr.value}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold">kg</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">
                    {pr.metric === '1rm' ? '1RM' : 'Max Wt'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workout Library Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Routine Library</h2>
              <p className="text-xs text-zinc-400">
                Explore structured routines crafted for muscle hypertrophy and strength gains.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search workouts or muscles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-neonLime"
              />
            </div>
          </div>

          {/* Goal Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedGoal(goal.id)}
                className={`h-9 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGoal === goal.id
                    ? 'bg-neonLime text-black font-extrabold shadow-sm'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>

          {/* Workout Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-56 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse p-5"
                />
              ))}
            </div>
          ) : filteredWorkouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  isRecommended={workout.id === recommendedWorkout?.id}
                />
              ))}
            </div>
          ) : (
            <WorkoutEmptyState
              title="No routines found"
              description="No routines matched your selected filter or search query. Try choosing 'All Routines' or clearing the search box."
              actionLabel="Reset Filters"
              onAction={() => {
                setSelectedGoal('all');
                setSearchQuery('');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
