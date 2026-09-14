/**
 * FitNova AI — Exercise Domain Model
 * Strongly typed representation of an exercise entity.
 * Zero UI/React dependencies.
 */

import type {
  MuscleGroup,
  Equipment,
  WorkoutDifficulty,
} from '../types/enums.ts';

export interface ExerciseMedia {
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface MuscleContribution {
  muscleGroup: MuscleGroup;
  isPrimary: boolean;
  contributionPct: number;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  muscleContributions?: MuscleContribution[];
  equipment: Equipment;
  difficulty: WorkoutDifficulty;
  instructions: string[];
  tips: string[];
  defaultRestSeconds: number;
  media?: ExerciseMedia;
  isCustom?: boolean;
}
