import { DashboardContextEngine } from './DashboardContextEngine';
import { DashboardPriorityEngine } from './DashboardPriorityEngine';
import { DashboardRecommendationEngine } from './DashboardRecommendationEngine';
import { DashboardMoodEngine } from './DashboardMoodEngine';
import { DashboardNotificationEngine } from './DashboardNotificationEngine';
import { DashboardPersonalizationEngine } from './DashboardPersonalizationEngine';
import { DashboardMemoryEngine } from './DashboardMemoryEngine';
import type { DashboardIntelligence } from './types';

export class DashboardIntelligenceEngine {
  private contextEngine = new DashboardContextEngine();
  private priorityEngine = new DashboardPriorityEngine();
  private recommendationEngine = new DashboardRecommendationEngine();
  private moodEngine = new DashboardMoodEngine();
  private notificationEngine = new DashboardNotificationEngine();
  private personalizationEngine = new DashboardPersonalizationEngine();
  private memoryEngine = new DashboardMemoryEngine();

  public getIntelligence(): DashboardIntelligence {
    const context = this.contextEngine.determineContext();
    const priorities = this.priorityEngine.calculatePriorities(context);
    const recommendations = this.recommendationEngine.generateRecommendations(context);
    const mood = this.moodEngine.determineMood(context);
    const notifications = this.notificationEngine.generateNotifications(context);
    const preferences = this.personalizationEngine.getPreferences();
    
    // memory can be logged or used to adjust context in the future
    this.memoryEngine.getRecentActivity();

    return {
      context,
      priorities,
      recommendations,
      mood,
      notifications,
      preferences
    };
  }
}
