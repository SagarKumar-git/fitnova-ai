export interface AIRequest {
  feature: string;
  payload: any;
  context?: Record<string, any>;
  userId?: string;
  timestamp: number;
}
