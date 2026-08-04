import type { AIProvider } from '../providers/AIProvider';
import type { AIRequest } from '../models/AIRequest';
export class RecommendationService {
  private provider: AIProvider;
  constructor(provider: AIProvider) {
    this.provider = provider;
  }
  async getRecommendations() {
    const req: AIRequest = { feature: 'recommendations', payload: {}, timestamp: Date.now() };
    return this.provider.generateRecommendation(req);
  }
}
