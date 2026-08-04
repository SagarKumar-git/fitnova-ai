import type { DashboardContext } from './types';
import { MOCK_SCENARIOS } from './constants';

export class DashboardContextEngine {
  determineContext(): DashboardContext {
    // In the future, this will parse user data, current time, and backend flags.
    const hour = new Date().getHours();
    let timeOfDay: DashboardContext['timeOfDay'] = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 5) timeOfDay = 'night';

    // Mock scenario 0 logic mapping for now
    return {
      ...MOCK_SCENARIOS[0].context,
      timeOfDay
    };
  }
}
