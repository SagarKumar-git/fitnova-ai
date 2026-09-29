export interface AdaptivePreferences {
  userId: string;
  adaptiveTrainingEnabled: boolean;
  automaticIntensityReductionAllowed: boolean;
  automaticExerciseSubstitutionAllowed: boolean;
  progressiveOverloadRecommendationsEnabled: boolean;
  minimumConfidenceRequired: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  notificationPreferences: {
    notifyOnWorkoutChanged: boolean;
    notifyOnIntensityReduced: boolean;
    notifyOnHighConfidenceProgression: boolean;
    notifyOnStaleHealthData: boolean;
  };
}
