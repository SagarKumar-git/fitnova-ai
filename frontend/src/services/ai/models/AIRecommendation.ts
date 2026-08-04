export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  actionText: string;
  actionPayload: any;
  priority: number;
  category: string;
}
