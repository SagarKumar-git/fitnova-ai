import type { DashboardContext } from './types';

// Mock scenarios for testing the intelligence engine
export const MOCK_SCENARIOS: { name: string; context: DashboardContext }[] = [
  {
    name: 'Morning Push Day',
    context: { timeOfDay: 'morning', dayType: 'workout', energyLevel: 'high', goalPhase: 'bulking', experienceLevel: 'advanced' }
  },
  {
    name: 'Evening Recovery',
    context: { timeOfDay: 'evening', dayType: 'recovery', energyLevel: 'low', goalPhase: 'maintenance', experienceLevel: 'intermediate' }
  }
];
