/**
 * FitNova AI — Centralized Logger Utility
 * =========================================
 * - In DEV mode: logs at the appropriate console level
 * - In PROD mode: suppresses info/warn, only forwards critical errors
 *   (prevents token data or stack traces appearing in production consoles)
 */

const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args: unknown[]): void => {
    if (isDev) console.info('[FitNova]', ...args);
  },

  warn: (...args: unknown[]): void => {
    if (isDev) console.warn('[FitNova]', ...args);
  },

  error: (...args: unknown[]): void => {
    // Always log errors, but sanitize in prod
    if (isDev) {
      console.error('[FitNova ERROR]', ...args);
    } else {
      // In production, only log the message string — never stack traces or objects
      const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
      console.error('[FitNova]', message);
    }
  },

  debug: (...args: unknown[]): void => {
    if (isDev) console.debug('[FitNova DEBUG]', ...args);
  },
};
