/**
 * FitNova AI — Daily Activity Domain Model
 * Tracks daily step counts, active energy expenditure, and basal metrics.
 * Zero UI/React dependencies.
 */

export interface DailyActivity {
  id: string;
  date: string; // YYYY-MM-DD
  steps: number;
  activeEnergyBurnedKcal: number;
  basalEnergyBurnedKcal?: number;
  distanceMeters?: number;
  activeMinutes: number;
  restingHeartRateBpm: number;
  timestamp: number;
  source: string;
}
