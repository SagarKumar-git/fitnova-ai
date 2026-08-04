import type { UserPreferences } from './types';

export class DashboardPersonalizationEngine {
  getPreferences(): UserPreferences {
    return {
      workoutTime: '17:30',
      favoriteWidgets: ['MissionControl', 'Goals'],
      hiddenWidgets: []
    };
  }
}
