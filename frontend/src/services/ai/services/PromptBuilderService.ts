import type { PromptTemplateService } from './PromptTemplateService';
export class PromptBuilderService {
  private templateService: PromptTemplateService;
  constructor(templateService: PromptTemplateService) {
    this.templateService = templateService;
  }
  build(templateId: string, variables: Record<string, string>): string {
    const template = this.templateService.getTemplate(templateId);
    let result = template.templateString;
    for (const [k, v] of Object.entries(variables)) {
      result = result.replace(`{{${k}}}`, v);
    }
    return result;
  }
}
