/**
 * FitNova AI — Logger & Sanitizer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Logger } from '../logging/Logger.ts';
import { DefaultLogSanitizer } from '../logging/sanitizer.ts';
import type { ILogTransport, LogEntry } from '../types/index.ts';

describe('Logger & LogSanitizer', () => {
  it('redacts sensitive fields like passwords, tokens, and API keys', () => {
    const sanitizer = new DefaultLogSanitizer();

    const sensitiveData = {
      user: 'test_user',
      password: 'MyPassword123!',
      token: 'jwt.token.here',
      apiKey: 'sec_9999',
      metadata: {
        nestedToken: 'nested.secret.val',
        publicCount: 42,
      },
    };

    const sanitized = sanitizer.sanitize(sensitiveData) as Record<string, unknown>;

    expect(sanitized.user).toBe('test_user');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect((sanitized.metadata as Record<string, unknown>).nestedToken).toBe('[REDACTED]');
    expect((sanitized.metadata as Record<string, unknown>).publicCount).toBe(42);
  });

  it('respects log level thresholds and captures entries via transport', () => {
    const entries: LogEntry[] = [];
    const testTransport: ILogTransport = {
      log: (entry) => entries.push(entry),
    };

    const logger = new Logger({
      module: 'TestModule',
      minLevel: 'warn',
      transports: [testTransport],
      isDev: false,
    });

    logger.debug('should be filtered');
    logger.info('should also be filtered');
    logger.warn('warning message', { count: 1 });
    logger.error('error message', { reason: 'fatal failure' });

    expect(entries.length).toBe(2);
    expect(entries[0].level).toBe('warn');
    expect(entries[0].message).toBe('warning message');
    expect(entries[1].level).toBe('error');
    expect(entries[1].message).toBe('error message');
  });

  it('supports scoped child module loggers with forModule()', () => {
    const entries: LogEntry[] = [];
    const testTransport: ILogTransport = {
      log: (entry) => entries.push(entry),
    };

    const parentLogger = new Logger({
      module: 'Platform',
      minLevel: 'info',
      transports: [testTransport],
      isDev: true,
    });

    const childLogger = parentLogger.forModule('WorkoutService');
    childLogger.info('Set completed');

    expect(entries.length).toBe(1);
    expect(entries[0].module).toBe('Platform:WorkoutService');
  });
});
