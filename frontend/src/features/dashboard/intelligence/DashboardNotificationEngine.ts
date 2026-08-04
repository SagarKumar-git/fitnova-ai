import type { DashboardContext, SmartNotification } from './types';

export class DashboardNotificationEngine {
  generateNotifications(context: DashboardContext): SmartNotification[] {
    if (context.timeOfDay === 'morning') {
      return [{ id: 'n1', title: 'Good Morning!', message: 'Your readiness is updated.', type: 'alert' }];
    }
    return [];
  }
}
