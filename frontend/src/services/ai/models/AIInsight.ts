export interface AIInsight {
  id: string;
  type: 'health' | 'performance' | 'nutrition' | 'recovery';
  content: string;
  confidence: number;
  timestamp: number;
}
