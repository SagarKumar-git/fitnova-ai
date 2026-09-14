/**
 * FitNova AI — Platform Logging Types
 * Contracts for structured, sanitized, level-aware logging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
} as const;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface ILogTransport {
  log(entry: LogEntry): void;
}

export interface ILogSanitizer {
  sanitize(input: unknown): unknown;
}
