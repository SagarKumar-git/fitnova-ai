/**
 * API Base URL Resolution — FitNova AI
 * ======================================
 * Delegated to Platform ConfigService while preserving backward-compatible exports.
 */

import { ConfigService } from './platform/config/ConfigService.ts';

const configService = new ConfigService();

export const API_BASE_URL: string = configService.apiBaseUrl;

if (import.meta.env.DEV) {
  console.info(`[FitNova] API_BASE_URL → ${API_BASE_URL}`);
}