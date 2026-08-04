export interface DashboardData {
  user: { name: string; readiness: number; recovery: string };
  metrics: { caloriesLeft: number; water: { current: number; max: number }; protein: { current: number; max: number } };
  upcoming: { type: string; title: string; time: string }[];
  nova: { insight: string; suggestion: string; energy: string; hydration: string; forecast: string };
  mission: { title: string; subtitle: string; tasks: string[] };
}
export interface WidgetProps { data?: DashboardData; isLoading?: boolean; priority?: number; }
