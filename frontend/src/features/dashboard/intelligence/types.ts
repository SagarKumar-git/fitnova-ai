export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type DayType = 'workout' | 'rest' | 'travel' | 'recovery';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type GoalPhase = 'bulking' | 'cutting' | 'maintenance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface DashboardContext {
  timeOfDay: TimeOfDay;
  dayType: DayType;
  energyLevel: EnergyLevel;
  goalPhase: GoalPhase;
  experienceLevel: ExperienceLevel;
}

export interface Recommendation {
  title: string;
  description: string;
  action: string;
  priority: number;
  confidence: number;
  category: 'workout' | 'nutrition' | 'hydration' | 'recovery' | 'sleep' | 'motivation';
}

export interface DashboardMood {
  primaryGradient: string;
  accentColor: string;
  animationIntensity: 'high' | 'medium' | 'low';
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'reminder' | 'achievement';
}

export interface WidgetPriority {
  widgetId: string;
  score: number;
}

export interface UserPreferences {
  workoutTime: string;
  favoriteWidgets: string[];
  hiddenWidgets: string[];
}

export interface DashboardIntelligence {
  context: DashboardContext;
  priorities: WidgetPriority[];
  recommendations: Recommendation[];
  mood: DashboardMood;
  notifications: SmartNotification[];
  preferences: UserPreferences;
}
