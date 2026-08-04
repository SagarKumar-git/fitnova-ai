import type { PromptTemplate } from '../models/Prompt';
export class PromptTemplateService {
  getTemplate(id: string): PromptTemplate {
    return { id, templateString: 'You are an AI...', requiredVariables: [] };
  }
}
