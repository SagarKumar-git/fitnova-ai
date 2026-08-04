import type { DashboardService } from './DashboardService';
import type { DashboardData } from '../types';
export class MockDashboardService implements DashboardService {
  async getDashboardData(): Promise<DashboardData> {
    return new Promise(resolve => setTimeout(() => resolve({
      user: { name: "Alex", readiness: 92, recovery: "Excellent" },
      metrics: { caloriesLeft: 1800, water: { current: 1.2, max: 3 }, protein: { current: 42, max: 150 } },
      upcoming: [
        { type: "workout", title: "Push Day", time: "05:30 PM" },
        { type: "meal", title: "Lunch", time: "12:30 PM" }
      ],
      nova: {
        insight: "Your recovery is excellent today. This is a great day for a heavy Push workout.",
        suggestion: "Suggest adding 5 mins of mobility before squats.",
        energy: "High",
        hydration: "On Track",
        forecast: "Peak performance window: 4PM - 7PM"
      },
      mission: {
        title: "Build & Recover",
        subtitle: "Today is about pushing volume and rehydrating.",
        tasks: ["Complete Push Workout", "Drink 3L Water", "Reach 150g Protein"]
      }
    }), 800));
  }
}
