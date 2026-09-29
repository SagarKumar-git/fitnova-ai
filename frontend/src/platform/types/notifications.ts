/**
 * FitNova AI — Platform Notification Types
 * UI-framework independent notification models and contracts with priority and deduplication.
 */

export type NotificationType =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'achievement'
  | 'ai'
  | 'workout'
  | 'nutrition'
  | 'system'
  | 'adaptive';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  durationMs?: number;
  priority?: NotificationPriority;
  dedupKey?: string;
  metadata?: Record<string, unknown>;
  dismissed: boolean;
}

export interface NotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  durationMs?: number;
  priority?: NotificationPriority;
  dedupKey?: string;
  dedupWindowMs?: number;
  metadata?: Record<string, unknown>;
}

export type NotificationListener = (notifications: NotificationItem[]) => void;
