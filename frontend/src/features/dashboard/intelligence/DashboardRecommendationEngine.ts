import type { DashboardContext, Recommendation } from './types';

export class DashboardRecommendationEngine {
  generateRecommendations(context: DashboardContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (context.dayType === 'workout') {
      recommendations.push({
        title: 'Pre-workout Hydration',
        description: 'Drink 500ml of water 30 mins before training.',
        action: 'Log Water',
        priority: 95,
        confidence: 0.9,
        category: 'hydration'
      });
    } else {
      recommendations.push({
        title: 'Active Recovery',
        description: 'Take a 20 minute light walk to stimulate blood flow.',
        action: 'Start Walk',
        priority: 85,
        confidence: 0.8,
        category: 'recovery'
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }
}
