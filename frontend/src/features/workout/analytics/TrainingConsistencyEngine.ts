/**
 * FitNova AI — Training Consistency Engine
 * Tracks workout adherence, streaks, missed workouts, rest cadence,
 * and computes a deterministic 0-100 Consistency Score with structured explanations.
 * Pure TypeScript. Zero UI/React code.
 */

import type { WorkoutHistoryEntry } from '../models/WorkoutHistory.ts';

export interface ConsistencyAnalysis {
  consistencyScore: number; // 0 to 100
  weeklyWorkoutFrequency: number;
  adherencePercentage: number; // 0 to 100%
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  missedPlannedWorkouts: number;
  averageDaysBetweenSessions: number;
  totalSessionsEvaluated: number;
  ratingLabel: 'Elite' | 'Consistent' | 'Building' | 'Inconsistent';
  summary: string;
  insights: string[];
  actionableTip: string;
}

export class TrainingConsistencyEngine {
  /**
   * Evaluates training consistency over rolling 30-day and all-time history.
   *
   * @param history Array of workout history entries
   * @param targetDaysPerWeek Target training frequency (default 4 days/week)
   * @param referenceTimestamp Reference time (defaults to Date.now())
   */
  evaluateConsistency(
    history: WorkoutHistoryEntry[],
    targetDaysPerWeek: number = 4,
    referenceTimestamp: number = Date.now()
  ): ConsistencyAnalysis {
    const totalSessions = history.length;

    if (totalSessions === 0) {
      return {
        consistencyScore: 0,
        weeklyWorkoutFrequency: 0,
        adherencePercentage: 0,
        currentStreakWeeks: 0,
        longestStreakWeeks: 0,
        missedPlannedWorkouts: targetDaysPerWeek,
        averageDaysBetweenSessions: 0,
        totalSessionsEvaluated: 0,
        ratingLabel: 'Inconsistent',
        summary: 'No workouts completed yet. Log your first workout to begin tracking consistency.',
        insights: ['Establishing a regular training schedule builds foundational neuromuscular habits.'],
        actionableTip: `Set an attainable goal of ${targetDaysPerWeek} sessions this week.`,
      };
    }

    const DAY_MS = 86_400_000;
    const thirtyDaysAgo = referenceTimestamp - 30 * DAY_MS;

    // Filter valid chronological sessions
    const sorted = [...history]
      .filter((h) => {
        const ts = h.completedAt || new Date(h.date).getTime();
        return !isNaN(ts) && ts <= referenceTimestamp;
      })
      .sort((a, b) => {
        const aTs = a.completedAt || new Date(a.date).getTime();
        const bTs = b.completedAt || new Date(b.date).getTime();
        return aTs - bTs;
      });

    const recentSessions = sorted.filter((h) => {
      const ts = h.completedAt || new Date(h.date).getTime();
      return ts >= thirtyDaysAgo;
    });

    // 1. Weekly Frequency
    const weeklyWorkoutFrequency = Math.round((recentSessions.length / 4.28) * 10) / 10;

    // 2. Adherence Percentage
    const adherencePercentage = Math.min(
      100,
      Math.max(0, Math.round((weeklyWorkoutFrequency / targetDaysPerWeek) * 100))
    );

    // 3. Average Days Between Sessions
    let averageDaysBetweenSessions = 0;
    if (sorted.length >= 2) {
      let totalGapsMs = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prevTs = sorted[i - 1].completedAt || new Date(sorted[i - 1].date).getTime();
        const currTs = sorted[i].completedAt || new Date(sorted[i].date).getTime();
        totalGapsMs += Math.max(0, currTs - prevTs);
      }
      averageDaysBetweenSessions = Math.round((totalGapsMs / (sorted.length - 1) / DAY_MS) * 10) / 10;
    } else {
      averageDaysBetweenSessions = 2.0;
    }

    // 4. Streak Calculation (Weekly groupings)
    const weekSet = new Set<string>();
    for (const entry of sorted) {
      const ts = entry.completedAt || new Date(entry.date).getTime();
      const d = new Date(ts);
      const year = d.getUTCFullYear();
      const firstDay = new Date(Date.UTC(year, 0, 1));
      const pastDays = (d.getTime() - firstDay.getTime()) / DAY_MS;
      const weekNum = Math.ceil((pastDays + firstDay.getUTCDay() + 1) / 7);
      weekSet.add(`${year}-W${weekNum}`);
    }

    // Find current consecutive weeks streak
    const dRef = new Date(referenceTimestamp);
    const refYear = dRef.getUTCFullYear();
    const refFirstDay = new Date(Date.UTC(refYear, 0, 1));
    const refPastDays = (dRef.getTime() - refFirstDay.getTime()) / DAY_MS;
    const currentWeekNum = Math.ceil((refPastDays + refFirstDay.getUTCDay() + 1) / 7);

    let currentStreak = 0;
    let checkWeek = currentWeekNum;
    let checkYear = refYear;

    while (weekSet.has(`${checkYear}-W${checkWeek}`)) {
      currentStreak++;
      checkWeek--;
      if (checkWeek <= 0) {
        checkYear--;
        checkWeek = 52;
      }
    }

    // If current week not trained yet, check if trained last week to preserve streak
    if (currentStreak === 0) {
      let prevWeek = currentWeekNum - 1;
      let prevYear = refYear;
      if (prevWeek <= 0) {
        prevYear--;
        prevWeek = 52;
      }
      while (weekSet.has(`${prevYear}-W${prevWeek}`)) {
        currentStreak++;
        prevWeek--;
        if (prevWeek <= 0) {
          prevYear--;
          prevWeek = 52;
        }
      }
    }

    const longestStreakWeeks = Math.max(currentStreak, weekSet.size > 0 ? Math.min(weekSet.size, 12) : 0);

    // 5. Missed Planned Workouts in past 30 days
    const expectedSessions = Math.round(targetDaysPerWeek * 4.28);
    const missedPlannedWorkouts = Math.max(0, expectedSessions - recentSessions.length);

    // 6. Consistency Score Calculation (0-100)
    // Formula components:
    // - Adherence rate weight: 50%
    // - Streak bonus weight: 25% (up to 8 weeks = full bonus)
    // - Spacing penalty/bonus: 25% (ideal spacing 1.5 to 2.5 days)
    const adherenceComponent = adherencePercentage * 0.5;
    const streakComponent = Math.min(1.0, currentStreak / 4) * 25;

    let spacingScore = 25;
    if (averageDaysBetweenSessions > 4.0) {
      spacingScore = 10;
    } else if (averageDaysBetweenSessions > 3.0) {
      spacingScore = 18;
    } else if (averageDaysBetweenSessions < 1.0 && sorted.length > 3) {
      spacingScore = 16; // Too clustered
    }

    const rawScore = Math.round(adherenceComponent + streakComponent + spacingScore);
    const consistencyScore = Math.max(0, Math.min(100, rawScore));

    // Rating and labels
    let ratingLabel: 'Elite' | 'Consistent' | 'Building' | 'Inconsistent' = 'Building';
    if (consistencyScore >= 85) {
      ratingLabel = 'Elite';
    } else if (consistencyScore >= 70) {
      ratingLabel = 'Consistent';
    } else if (consistencyScore >= 50) {
      ratingLabel = 'Building';
    } else {
      ratingLabel = 'Inconsistent';
    }

    const insights: string[] = [];
    insights.push(
      `Averaging ${weeklyWorkoutFrequency} workouts/week over the past 30 days (${adherencePercentage}% of ${targetDaysPerWeek}-day target).`
    );

    if (currentStreak > 1) {
      insights.push(`Active streak of ${currentStreak} consecutive weeks with logged training.`);
    }

    if (averageDaysBetweenSessions > 0) {
      insights.push(`Average recovery cadence is ${averageDaysBetweenSessions} days between sessions.`);
    }

    let actionableTip = '';
    if (consistencyScore >= 85) {
      actionableTip = 'Outstanding discipline! Maintain your current routine to maximize progressive overload gains.';
    } else if (missedPlannedWorkouts > 2) {
      actionableTip = `You missed ~${missedPlannedWorkouts} planned sessions this month. Block specific training hours on your calendar.`;
    } else {
      actionableTip = 'Lock in your training days 48 hours in advance to solidify habit automaticity.';
    }

    const summary = `Consistency Score: ${consistencyScore}/100 (${ratingLabel}). ${insights[0]}`;

    return {
      consistencyScore,
      weeklyWorkoutFrequency,
      adherencePercentage,
      currentStreakWeeks: currentStreak,
      longestStreakWeeks,
      missedPlannedWorkouts,
      averageDaysBetweenSessions,
      totalSessionsEvaluated: sorted.length,
      ratingLabel,
      summary,
      insights,
      actionableTip,
    };
  }
}
