/**
 * FitNova AI — Centralized Logger Utility
 * =========================================
 * Backward-compatibility bridge delegating to the Platform Logger.
 * - In DEV mode: logs at the appropriate console level
 * - In PROD mode: suppresses info/warn, only forwards sanitized critical errors
 *   (prevents token data or stack traces appearing in production consoles)
 */

import { Logger } from '../platform/logging/Logger.ts';

const platformLogger = new Logger({ module: 'FitNova' });

export const logger = {
  info: (...args: unknown[]): void => {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    platformLogger.info(message);
  },

  warn: (...args: unknown[]): void => {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    platformLogger.warn(message);
  },

  error: (...args: unknown[]): void => {
    const message = args.map((a) => (a instanceof Error ? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    platformLogger.error(message);
  },

  debug: (...args: unknown[]): void => {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    platformLogger.debug(message);
  },
};

