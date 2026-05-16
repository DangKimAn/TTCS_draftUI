/**
 * API Configuration
 *
 * Centralized config for all API-related constants.
 * Change BASE_URL when deploying to production.
 */

export const API_CONFIG = {
  /** Base URL of the NestJS backend (includes /api prefix) */
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',

  /** Request timeout in milliseconds */
  TIMEOUT: 15_000,

  /** localStorage / sessionStorage key used by storage.ts */
  AUTH_STORAGE_KEY: 'timesheet_pro_auth',

  /** Flag to enable/disable fallback to mock data when API fails.
   * Mặc định: false (production/demo thật không dùng mock).
   * Bật bằng: VITE_ENABLE_MOCK_FALLBACK=true trong .env.local */
  ENABLE_MOCK_FALLBACK: import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true',
} as const;
