/**
 * FitNova AI — Platform Notification Types
 * UI-framework independent notification models and contracts.
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
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  dismissed: boolean;
}

export interface NotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export type NotificationListener = (notifications: NotificationItem[]) => void;
