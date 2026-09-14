/**
 * FitNova AI — SessionSummary Component
 * Post-workout celebration modal displaying volume, duration, PRs, Nova AI insight, and rating.
 */

import React, { useState } from 'react';
import type { WorkoutSession } from '../models/WorkoutSession.ts';
import {
  Trophy,
  Clock,
  Dumbbell,
  Sparkles,
  Star,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export interface SessionSummaryProps {
  session: WorkoutSession;
  onDone: (notes?: string, rating?: number) => void;
  onClose?: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  session,
  onDone,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  const durationMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
  const completedSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  // Nova AI Encouragement based on performance
  const getAiInsight = () => {
    if (session.personalRecords.length > 0) {
      return `Phenomenal performance! You smashed ${session.personalRecords.length} Personal Record(s) today. Your progressive overload trajectory is firmly on track.`;
    }
    if (session.totalVolume > 5000) {
      return `Massive volume day! Over ${Math.round(session.totalVolume).toLocaleString()} kg moved with crisp form. Prioritize hydration and 30g+ protein in your post-workout window.`;
    }
    return `Solid workout logged! Consistency is the catalyst for elite body composition. Recover well for your next protocol.`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Glow Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-neonLime/10 border border-neonLime/30 text-neonLime flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(204,255,0,0.2)]">
            <Trophy className="w-8 h-8 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-neonLime">
            Session Complete
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            Workout Crushed!
          </h2>
          <p className="text-xs text-zinc-400 mt-1">{session.workoutName}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 text-center">
            <Clock className="w-4 h-4 text-neonLime mx-auto mb-1" />
            <div className="text-base sm:text-lg font-black text-white">
              {durationMinutes}m
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Duration</div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 text-center">
            <Dumbbell className="w-4 h-4 text-neonLime mx-auto mb-1" />
            <div className="text-base sm:text-lg font-black text-white">
              {Math.round(session.totalVolume).toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Volume (kg)</div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 text-center">
            <CheckCircle className="w-4 h-4 text-neonLime mx-auto mb-1" />
            <div className="text-base sm:text-lg font-black text-white">
              {completedSets}/{totalSets}
            </div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Sets Done</div>
          </div>
        </div>

        {/* Personal Records Showcase */}
        {session.personalRecords.length > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                New Personal Records ({session.personalRecords.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {session.personalRecords.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between text-xs text-zinc-200 bg-black/40 px-3 py-1.5 rounded-lg"
                >
                  <span className="font-semibold">{pr.exerciseName}</span>
                  <span className="font-black text-amber-400">
                    {pr.value} {pr.metric === '1rm' ? 'kg (1RM)' : 'kg'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nova AI Insight Box */}
        <div className="mb-6 bg-gradient-to-r from-neonLime/10 via-zinc-900 to-zinc-900 border border-neonLime/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-neonLime" />
            <span className="text-xs font-black text-neonLime uppercase tracking-wider">
              Nova AI Performance Debrief
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{getAiInsight()}</p>
        </div>

        {/* User Rating */}
        <div className="mb-6 text-center">
          <label className="text-xs font-bold text-zinc-400 block mb-2">
            How did this session feel?
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1.5 hover:scale-125 transition-transform"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-600 hover:text-zinc-500'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Optional Notes */}
        <div className="mb-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add session notes, energy levels, or pump reflections (optional)..."
            rows={2}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-neonLime resize-none"
          />
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={() => onDone(notes || undefined, rating)}
          className="w-full h-12 rounded-xl bg-neonLime hover:bg-neonLime/90 text-black font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all active:scale-95"
        >
          <span>Save Workout & View Stats</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
