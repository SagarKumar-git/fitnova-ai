/**
 * FitNova AI — WorkoutHistory Page
 * Complete training diary with chronological session records, volume breakdown,
 * PR highlights, ratings, notes, and expandable exercise logs.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory.ts';
import { WorkoutEmptyState } from '../components/WorkoutEmptyState.tsx';
import {
  History,
  Calendar,
  Clock,
  Dumbbell,
  Trophy,
  Star,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Search,
  CheckCircle,
} from 'lucide-react';

export const WorkoutHistory: React.FC = () => {
  const navigate = useNavigate();
  const { history, isLoading } = useWorkoutHistory();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.workoutName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.exercises.some((e) =>
        e.exerciseName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesSearch;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  <History className="w-3.5 h-3.5" /> Training Diary
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Workout History
              </h1>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search past logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-neonLime"
            />
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse p-5"
              />
            ))}
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const durationMins = Math.max(1, Math.round(entry.durationSeconds / 60));

              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'bg-zinc-900 border-neonLime/40 shadow-lg'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-xs text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatDate(entry.completedAt)}</span>
                        <span>•</span>
                        <span>{formatTime(entry.completedAt)}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white">
                        {entry.workoutName}
                      </h3>

                      {/* Micro Stats */}
                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neonLime" />
                          <span>{durationMins}m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5 text-neonLime" />
                          <span>{Math.round(entry.totalVolume).toLocaleString()} kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-neonLime" />
                          <span>{entry.completedSets} sets</span>
                        </div>

                        {entry.personalRecordsCount > 0 && (
                          <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>{entry.personalRecordsCount} PRs</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {entry.rating && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= (entry.rating || 0)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neonLime" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Exercise Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 space-y-4">
                      {entry.notes && (
                        <div className="text-xs text-zinc-300 italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
                          Session note: "{entry.notes}"
                        </div>
                      )}

                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                          Exercises Logged
                        </span>

                        {entry.exercises.map((ex, exIdx) => (
                          <div
                            key={ex.exerciseId || exIdx}
                            className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3"
                          >
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {exIdx + 1}. {ex.exerciseName}
                              </span>
                              <span className="text-[11px] text-zinc-400 mt-0.5 block">
                                Best: {ex.bestSet.weight}kg × {ex.bestSet.reps} reps
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-100 block">
                                {ex.setsCount} Sets
                              </span>
                              <span className="text-[11px] text-zinc-500 font-semibold block">
                                {Math.round(ex.volume).toLocaleString()} kg vol
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <WorkoutEmptyState
            title="No Workout History"
            description="You haven't completed any workout sessions yet. Start your first routine to build your training history!"
            actionLabel="Start a Workout"
            onAction={() => navigate('/workouts')}
          />
        )}
      </div>
    </div>
  );
};
