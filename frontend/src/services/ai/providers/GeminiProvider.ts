import type { AIProvider } from './AIProvider';
import type { AIRequest } from '../models/AIRequest';
import type { AIResponse } from '../models/AIResponse';

export class GeminiProvider implements AIProvider {
  name = 'GeminiProvider';
  // In reality, this will call our FastAPI proxy
  
  private async callProxy<T>(_endpoint: string, _payload: any): Promise<AIResponse<T>> {
    throw new Error('Not implemented: GeminiProvider must call FastAPI proxy');
  }

  async generateRecommendation(req: AIRequest) { return this.callProxy<any>('/ai/recommend', req); }
  async generateInsight(req: AIRequest) { return this.callProxy<any>('/ai/insight', req); }
  async generatePrediction(req: AIRequest) { return this.callProxy<any>('/ai/predict', req); }
  async generateMealPlan(req: AIRequest) { return this.callProxy<any>('/ai/mealplan', req); }
  async generateWorkout(req: AIRequest) { return this.callProxy<any>('/ai/workout', req); }
  async analyzeFood(req: AIRequest) { return this.callProxy<any>('/ai/vision', req); }
  async answerQuestion(req: AIRequest) { return this.callProxy<any>('/ai/chat', req); }
  async summarizeProgress(req: AIRequest) { return this.callProxy<any>('/ai/summary', req); }
}
