import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api';
import { refreshToken } from './authService';
import { clearAuthSession, getAuthSession } from '../utils/storage';

interface AuthRetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export interface ApiEnvelope<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

export interface NormalizedApiError extends Error {
  code: string;
  status?: number;
  details?: unknown;
}

let refreshPromise: ReturnType<typeof refreshToken> | null = null;

export function unwrapApiData<T>(payload: ApiEnvelope<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export function getApiMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === 'string' || typeof data === 'number') {
    return String(data);
  }

  if (typeof data !== 'object') {
    return null;
  }

  const payload = data as ApiEnvelope<unknown>;

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  return null;
}

export function normalizeApiError(
  error: unknown,
  fallbackMessage = 'Request failed.',
  fallbackCode = 'API_REQUEST_FAILED',
): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const message = getApiMessage(error.response?.data) || error.message || fallbackMessage;
    const normalizedError = new Error(message) as NormalizedApiError;

    normalizedError.status = error.response?.status;
    normalizedError.code = String(error.response?.status || error.code || fallbackCode);
    normalizedError.details = error.response?.data;

    return normalizedError;
  }

  if (error instanceof Error) {
    const normalizedError = new Error(error.message || fallbackMessage) as NormalizedApiError;
    normalizedError.code = fallbackCode;
    return normalizedError;
  }

  const normalizedError = new Error(fallbackMessage) as NormalizedApiError;
  normalizedError.code = fallbackCode;
  return normalizedError;
}

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const session = getAuthSession();
    const accessToken = session?.accessToken || session?.token;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const status = error.response?.status;
    const originalRequest = error.config as AuthRetryConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refreshToken')
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || refreshToken();
        const nextSession = await refreshPromise;
        refreshPromise = null;

        if (nextSession?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${nextSession.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        refreshPromise = null;
      }
    }

    if (status === 401) {
      clearAuthSession();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

export default apiClient;
