export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    provider: string;
    latencyMs: number;
    tokensEstimated?: number;
    cached: boolean;
  };
}
