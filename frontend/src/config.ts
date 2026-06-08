/**
 * API Base URL Resolution — FitNova AI
 * ======================================
 * Priority order:
 *   1. VITE_API_BASE_URL   — set in Vercel project environment variables (preferred)
 *   2. VITE_API_URL        — legacy alias, also accepted
 *   3. Hardcoded fallback  — Render backend URL (production)
 *
 * For local development create frontend/.env.local:
 *   VITE_API_BASE_URL=http://localhost:8000/api
 *
 * For Vercel deployment set in project settings:
 *   VITE_API_BASE_URL=https://fitnova-ai-4eqi.onrender.com/api
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://fitnova-ai-4eqi.onrender.com/api';

if (import.meta.env.DEV) {
  console.info(`[FitNova] API_BASE_URL → ${API_BASE_URL}`);
}