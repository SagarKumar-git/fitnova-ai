import type { DashboardContext, DashboardMood } from './types';

export class DashboardMoodEngine {
  determineMood(context: DashboardContext): DashboardMood {
    if (context.timeOfDay === 'night' || context.dayType === 'recovery') {
      return {
        primaryGradient: 'bg-gradient-to-br from-indigo-900 to-slate-900',
        accentColor: 'text-indigo-400',
        animationIntensity: 'low'
      };
    }
    return {
      primaryGradient: 'bg-gradient-to-br from-primary/20 to-background',
      accentColor: 'text-primary',
      animationIntensity: 'medium'
    };
  }
}
