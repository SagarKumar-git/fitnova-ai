/**
 * FitNova AI — Structured Logger
 * Environment-aware, structured logging with correlation IDs and automated credential redaction.
 */

import type {
  LogLevel,
  LogEntry,
  ILogTransport,
  ILogSanitizer,
} from '../types/index.ts';
import { LOG_LEVEL_SEVERITY } from '../types/index.ts';
import { defaultSanitizer } from './sanitizer.ts';
import { isDevEnv } from '../utils/env.ts';

export interface LoggerOptions {
  module?: string;
  minLevel?: LogLevel;
  transports?: ILogTransport[];
  sanitizer?: ILogSanitizer;
  isDev?: boolean;
}

export interface IModuleLogger {
  debug(message: string, metadata?: Record<string, unknown>, correlationId?: string): void;
  info(message: string, metadata?: Record<string, unknown>, correlationId?: string): void;
  warn(message: string, metadata?: Record<string, unknown>, correlationId?: string): void;
  error(message: string, metadata?: Record<string, unknown>, correlationId?: string): void;
  fatal(message: string, metadata?: Record<string, unknown>, correlationId?: string): void;
  forModule(subModule: string): IModuleLogger;
}

export class Logger implements IModuleLogger {
  private readonly moduleName: string;
  private minLevel: LogLevel;
  private readonly transports: ILogTransport[];
  private readonly sanitizer: ILogSanitizer;
  private readonly isDev: boolean;

  constructor(options: LoggerOptions = {}) {
    this.moduleName = options.module ?? 'FitNova';
    this.sanitizer = options.sanitizer ?? defaultSanitizer;
    this.isDev = options.isDev ?? isDevEnv();
    this.minLevel = options.minLevel ?? (this.isDev ? 'debug' : 'warn');
    this.transports = options.transports ?? [this.createConsoleTransport()];
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  forModule(subModule: string): IModuleLogger {
    const combinedModule = this.moduleName === 'FitNova' ? subModule : `${this.moduleName}:${subModule}`;
    return new Logger({
      module: combinedModule,
      minLevel: this.minLevel,
      transports: this.transports,
      sanitizer: this.sanitizer,
      isDev: this.isDev,
    });
  }

  debug(message: string, metadata?: Record<string, unknown>, correlationId?: string): void {
    this.logEntry('debug', message, metadata, correlationId);
  }

  info(message: string, metadata?: Record<string, unknown>, correlationId?: string): void {
    this.logEntry('info', message, metadata, correlationId);
  }

  warn(message: string, metadata?: Record<string, unknown>, correlationId?: string): void {
    this.logEntry('warn', message, metadata, correlationId);
  }

  error(message: string, metadata?: Record<string, unknown>, correlationId?: string): void {
    this.logEntry('error', message, metadata, correlationId);
  }

  fatal(message: string, metadata?: Record<string, unknown>, correlationId?: string): void {
    this.logEntry('fatal', message, metadata, correlationId);
  }

  private logEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    correlationId?: string
  ): void {
    if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const sanitizedMetadata = metadata
      ? (this.sanitizer.sanitize(metadata) as Record<string, unknown>)
      : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.moduleName,
      message,
      metadata: sanitizedMetadata,
      correlationId,
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch {
        // Fallback safety: transport failure should never crash the host application
      }
    }
  }

  private createConsoleTransport(): ILogTransport {
    return {
      log: (entry: LogEntry) => {
        const prefix = `[${entry.level.toUpperCase()}] [${entry.module}]`;
        const meta = entry.metadata ? entry.metadata : '';
        const corr = entry.correlationId ? `(cid:${entry.correlationId})` : '';

        switch (entry.level) {
          case 'debug':
            if (this.isDev) console.debug(prefix, entry.message, corr, meta);
            break;
          case 'info':
            if (this.isDev) console.info(prefix, entry.message, corr, meta);
            break;
          case 'warn':
            console.warn(prefix, entry.message, corr, meta);
            break;
          case 'error':
          case 'fatal':
            console.error(prefix, entry.message, corr, meta);
            break;
        }
      },
    };
  }
}
