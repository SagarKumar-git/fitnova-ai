/**
 * FitNova AI — Workout Domain Model
 * Defines a routine/template containing sequenced exercises, goals, and metadata.
 */

import type {
  MuscleGroup,
  Equipment,
  WorkoutDifficulty,
  WorkoutGoal,
} from '../types/enums.ts';
import type { WorkoutExercise } from './WorkoutExercise.ts';

export interface Workout {
  id: string;
  name: string;
  description: string;
  goal: WorkoutGoal;
  difficulty: WorkoutDifficulty;
  estimatedDurationMinutes: number;
  targetMuscleGroups: MuscleGroup[];
  equipment: Equipment[];
  tags: string[];
  exercises: WorkoutExercise[];
  isTemplate: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}
