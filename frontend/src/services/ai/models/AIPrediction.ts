export interface AIPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframeHours: number;
  confidence: number;
}
