export class ResponseParserService {
  parseJSON<T>(rawString: string): T {
    try {
      // Remove markdown code blocks if present
      const clean = rawString.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '');
      return JSON.parse(clean) as T;
    } catch (e) {
      throw new Error('Failed to parse AI response into domain model');
    }
  }
}
