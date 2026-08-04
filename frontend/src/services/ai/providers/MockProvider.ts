import type { AIProvider } from './AIProvider';
import type { AIRequest } from '../models/AIRequest';
import type { AIResponse } from '../models/AIResponse';
import type { AIRecommendation } from '../models/AIRecommendation';
import type { AIInsight } from '../models/AIInsight';
import type { AIPrediction } from '../models/AIPrediction';

export class MockProvider implements AIProvider {
  name = 'MockProvider';

  private async createMockResponse<T>(data: T): Promise<AIResponse<T>> {
    return new Promise(resolve => setTimeout(() => resolve({
      success: true,
      data,
      metadata: { provider: this.name, latencyMs: 500, cached: false }
    }), 500));
  }

  async generateRecommendation(_req: AIRequest): Promise<AIResponse<AIRecommendation[]>> {
    return this.createMockResponse([{ id: '1', title: 'Hydrate', description: 'Drink water', actionText: 'Log', actionPayload: {}, priority: 1, category: 'hydration' }]);
  }
  async generateInsight(_req: AIRequest): Promise<AIResponse<AIInsight[]>> {
    return this.createMockResponse([{ id: '1', type: 'health', content: 'Great recovery', confidence: 0.9, timestamp: Date.now() }]);
  }
  async generatePrediction(_req: AIRequest): Promise<AIResponse<AIPrediction[]>> {
    return this.createMockResponse([]);
  }
  async generateMealPlan(_req: AIRequest): Promise<AIResponse<any>> { return this.createMockResponse({}); }
  async generateWorkout(_req: AIRequest): Promise<AIResponse<any>> { return this.createMockResponse({}); }
  async analyzeFood(_req: AIRequest): Promise<AIResponse<any>> { return this.createMockResponse({}); }
  async answerQuestion(_req: AIRequest): Promise<AIResponse<string>> { return this.createMockResponse('Mock answer'); }
  async summarizeProgress(_req: AIRequest): Promise<AIResponse<string>> { return this.createMockResponse('Mock progress'); }
}
