import type { AuthSession, Role } from '../types';
import { API_CONFIG } from '../config/api';

const AUTH_STORAGE_KEY = API_CONFIG.AUTH_STORAGE_KEY;
type AuthStorageType = 'local' | 'session';

function parseStoredValue(value: string | null): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

export function getAuthSession(): AuthSession | null {
  const localRawValue = localStorage.getItem(AUTH_STORAGE_KEY);
  const localValue = parseStoredValue(localRawValue);

  if (localValue?.accessToken || localValue?.token) {
    return localValue;
  }

  if (localRawValue) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  const sessionRawValue = sessionStorage.getItem(AUTH_STORAGE_KEY);
  const sessionValue = parseStoredValue(sessionRawValue);

  if (sessionValue?.accessToken || sessionValue?.token) {
    return sessionValue;
  }

  if (sessionRawValue) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return null;
}

export function getAuthStorageType(): AuthStorageType | null {
  const localValue = parseStoredValue(localStorage.getItem(AUTH_STORAGE_KEY));

  if (localValue?.token || localValue?.accessToken) {
    return 'local';
  }

  const sessionValue = parseStoredValue(sessionStorage.getItem(AUTH_STORAGE_KEY));

  if (sessionValue?.token || sessionValue?.accessToken) {
    return 'session';
  }

  return null;
}

export function saveAuthSession(session: AuthSession, remember = true): void {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  otherStorage.removeItem(AUTH_STORAGE_KEY);
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function updateAuthSession(session: AuthSession): void {
  const authStorageType = getAuthStorageType();
  saveAuthSession(session, authStorageType !== 'session');
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getDashboardPathByRole(role: Role | string): string {
  switch (role) {
    case 'employee':
      return '/dashboard/employee';
    case 'manager':
      return '/dashboard/manager';
    case 'hr':
    case 'admin':
      return '/dashboard/hr';
    default:
      return '/unauthorized';
  }
}
