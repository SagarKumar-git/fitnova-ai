/**
 * FitNova AI — Workout OS Enums & Type Definitions
 * Strictly typed enumerations and discriminator unions for the workout domain.
 * Zero React dependencies.
 */

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Forearms'
  | 'Full Body';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Bands'
  | 'None';

export type WorkoutDifficulty =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Elite';

export type WorkoutGoal =
  | 'Strength'
  | 'Hypertrophy'
  | 'Endurance'
  | 'Powerlifting'
  | 'Weight Loss'
  | 'General Fitness';

export type SessionStatus =
  | 'idle'
  | 'preparing'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type SetType =
  | 'warmup'
  | 'normal'
  | 'drop'
  | 'failure';

export type PRMetric =
  | '1rm'
  | 'max_weight'
  | 'max_reps'
  | 'max_volume';
