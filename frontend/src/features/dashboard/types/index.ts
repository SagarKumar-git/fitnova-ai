export interface WorkoutDashboardStats {
  weeklyVolumeKg: number;
  workoutStreak: number;
  totalWorkouts: number;
  personalRecordsCount: number;
  muscleDistribution: Record<string, number>;
  lastWorkoutCompletedAt?: number;
  consistencyScore?: number;
}

export interface DashboardData {
  user: { name: string; readiness: number; recovery: string };
  metrics: { caloriesLeft: number; water: { current: number; max: number }; protein: { current: number; max: number } };
  upcoming: { type: string; title: string; time: string }[];
  nova: { insight: string; suggestion: string; energy: string; hydration: string; forecast: string };
  mission: { title: string; subtitle: string; tasks: string[] };
  workoutStats?: WorkoutDashboardStats;
}

export interface WidgetProps {
  data?: DashboardData;
  isLoading?: boolean;
  priority?: number;
}
