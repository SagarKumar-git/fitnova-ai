import type { DashboardData } from '../types';
export interface DashboardService {
  getDashboardData(): Promise<DashboardData>;
}
