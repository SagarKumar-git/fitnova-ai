import type { AIRequest } from '../models/AIRequest';
import type { AIResponse } from '../models/AIResponse';
import type { AIRecommendation } from '../models/AIRecommendation';
import type { AIInsight } from '../models/AIInsight';
import type { AIPrediction } from '../models/AIPrediction';

export interface AIProvider {
  name: string;
  generateRecommendation(request: AIRequest): Promise<AIResponse<AIRecommendation[]>>;
  generateInsight(request: AIRequest): Promise<AIResponse<AIInsight[]>>;
  generatePrediction(request: AIRequest): Promise<AIResponse<AIPrediction[]>>;
  generateMealPlan(request: AIRequest): Promise<AIResponse<any>>;
  generateWorkout(request: AIRequest): Promise<AIResponse<any>>;
  analyzeFood(request: AIRequest): Promise<AIResponse<any>>;
  answerQuestion(request: AIRequest): Promise<AIResponse<string>>;
  summarizeProgress(request: AIRequest): Promise<AIResponse<string>>;
}
