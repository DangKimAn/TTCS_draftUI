import type { AuthSession, Role } from '../types';

const AUTH_STORAGE_KEY = 'timesheet_pro_auth';

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
  const localValue = parseStoredValue(localStorage.getItem(AUTH_STORAGE_KEY));

  if (localValue?.token) {
    return localValue;
  }

  const sessionValue = parseStoredValue(sessionStorage.getItem(AUTH_STORAGE_KEY));

  if (sessionValue?.token) {
    return sessionValue;
  }

  return null;
}

export function saveAuthSession(session: AuthSession, remember = true): void {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  otherStorage.removeItem(AUTH_STORAGE_KEY);
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
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
      return '/dashboard/hr';
    default:
      return '/unauthorized';
  }
}
