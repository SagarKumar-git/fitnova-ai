/**
 * FitNova AI — Environment Detection Utility
 * SSR-safe, bundler-friendly environment detection that does not depend on Node types.
 */

export function getNodeEnv(): string | undefined {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
    return g.process?.env?.NODE_ENV;
  }
  return undefined;
}

export function isTestEnv(): boolean {
  return getNodeEnv() === 'test';
}

export function isDevEnv(): boolean {
  if (isTestEnv()) return true;
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return Boolean(import.meta.env.DEV);
  }
  return false;
}
