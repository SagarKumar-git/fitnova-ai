/**
 * FitNova AI — Sleep Analytics Engine
 * Evaluates sleep architecture (deep slow-wave, REM, sleep efficiency),
 * chronic sleep debt, and recovery impact.
 * Pure TypeScript. Non-medical fitness guidance.
 */

import type { SleepSession } from '../models/SleepSession.ts';

export interface SleepAnalysisResult {
  latestSleepHours: number;
  deepSleepMinutes: number;
  deepSleepPct: number;
  remSleepMinutes: number;
  remSleepPct: number;
  efficiencyPct: number;
  sleepDebtMinutes: number; // Deficit compared to 8-hour target
  weeklyAverageSleepHours: number;
  qualityRating: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export class SleepAnalytics {
  analyzeSleep(
    sessions: SleepSession[],
    targetSleepHours: number = 8.0
  ): SleepAnalysisResult {
    const targetMinutes = targetSleepHours * 60;

    if (!sessions || sessions.length === 0) {
      return {
        latestSleepHours: 7.5,
        deepSleepMinutes: 90,
        deepSleepPct: 20,
        remSleepMinutes: 100,
        remSleepPct: 22,
        efficiencyPct: 90,
        sleepDebtMinutes: 30,
        weeklyAverageSleepHours: 7.5,
        qualityRating: 'good',
        recommendations: ['Maintain regular bedtime to optimize sleep architecture.'],
      };
    }

    const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);
    const latest = sorted[sorted.length - 1];

    const latestSleepHours = Math.round((latest.timeAsleepMinutes / 60) * 10) / 10;
    const deepSleepMinutes = latest.deepMinutes || 0;
    const remSleepMinutes = latest.remMinutes || 0;

    const deepSleepPct =
      latest.timeAsleepMinutes > 0
        ? Math.round((deepSleepMinutes / latest.timeAsleepMinutes) * 100)
        : 0;

    const remSleepPct =
      latest.timeAsleepMinutes > 0
        ? Math.round((remSleepMinutes / latest.timeAsleepMinutes) * 100)
        : 0;

    const efficiencyPct = latest.efficiencyPct || 85;

    // Rolling 7 days average and debt
    const sevenDaysAgo = latest.startTime - 7 * 86_400_000;
    const recentSessions = sorted.filter((s) => s.startTime >= sevenDaysAgo);

    const totalRecentAsleep = recentSessions.reduce(
      (sum, s) => sum + s.timeAsleepMinutes,
      0
    );
    const weeklyAverageSleepHours =
      recentSessions.length > 0
        ? Math.round((totalRecentAsleep / recentSessions.length / 60) * 10) / 10
        : latestSleepHours;

    const sleepDebtMinutes = Math.max(0, targetMinutes - latest.timeAsleepMinutes);

    let qualityRating: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    const recommendations: string[] = [];

    if (latestSleepHours >= 7.5 && deepSleepPct >= 20 && efficiencyPct >= 88) {
      qualityRating = 'excellent';
      recommendations.push('Restorative slow-wave sleep achieved. Growth hormone secretion primed.');
    } else if (latestSleepHours >= 6.5 && efficiencyPct >= 80) {
      qualityRating = 'good';
      recommendations.push('Adequate sleep recorded. Good baseline for scheduled training.');
    } else if (latestSleepHours >= 5.0) {
      qualityRating = 'fair';
      recommendations.push('Moderate sleep deficit. Cap heavy axial spinal loading and focus on technique.');
    } else {
      qualityRating = 'poor';
      recommendations.push('Critical sleep deficit (<5h). Prioritize a 20-minute nap or active recovery workout.');
    }

    if (deepSleepPct < 15) {
      recommendations.push('Deep sleep was below optimal (15%). Avoid blue light and caffeine 6h prior to bed.');
    }

    return {
      latestSleepHours,
      deepSleepMinutes,
      deepSleepPct,
      remSleepMinutes,
      remSleepPct,
      efficiencyPct,
      sleepDebtMinutes,
      weeklyAverageSleepHours,
      qualityRating,
      recommendations,
    };
  }
}
