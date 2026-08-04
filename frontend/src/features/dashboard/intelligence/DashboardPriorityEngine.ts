import type { DashboardContext, WidgetPriority } from './types';

export class DashboardPriorityEngine {
  calculatePriorities(context: DashboardContext): WidgetPriority[] {
    const basePriorities = [
      { widgetId: 'MissionControl', score: 100 },
      { widgetId: 'QuickActions', score: 90 },
      { widgetId: 'AIBriefing', score: 80 },
      { widgetId: 'TodaysFocus', score: 70 },
      { widgetId: 'Readiness', score: 60 },
      { widgetId: 'Goals', score: 50 },
      { widgetId: 'Timeline', score: 40 }
    ];

    // Example logic: if it's evening, timeline becomes less important, recovery/readiness becomes more important.
    if (context.timeOfDay === 'evening') {
      const read = basePriorities.find(p => p.widgetId === 'Readiness');
      if (read) read.score += 20;
    }

    return basePriorities.sort((a, b) => b.score - a.score);
  }
}
