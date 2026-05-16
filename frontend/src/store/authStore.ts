import { create } from 'zustand';
import {
  login as loginRequest,
  logout as logoutRequest,
  verifyAuthSession,
} from '../services/authService';
import type { AuthSession, Role, User } from '../types';
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from '../utils/storage';

interface LoginInput {
  email: string;
  password: string;
  provider?: string;
  remember?: boolean;
}

interface AuthState {
  session: AuthSession | null;
  user: User | null;
  role: Role | null;
  isHydrated: boolean;
  isChecking: boolean;
  error: string | null;
  hydrate: () => void;
  setSession: (session: AuthSession | null, persist?: boolean) => void;
  login: (input: LoginInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  verifySession: () => Promise<AuthSession | null>;
}

function toUser(session: AuthSession | null): User | null {
  if (!session) {
    return null;
  }

  return {
    id: session.userID || session.id,
    email: session.email,
    name: session.name,
    role: session.role,
    departmentId: session.departmentId,
    managedEmployeeIds: session.managedEmployeeIds,
    permissions: session.permissions,
    isActive: session.isActive,
  };
}

function normalizeSession(session: AuthSession | null): AuthSession | null {
  if (!session?.accessToken && !session?.token) {
    return null;
  }

  return {
    ...session,
    accessToken: session.accessToken || session.token,
    token: session.accessToken || session.token,
  };
}

function getInitialSession(): AuthSession | null {
  return normalizeSession(getAuthSession());
}

const initialSession = getInitialSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  session: initialSession,
  user: toUser(initialSession),
  role: initialSession?.role || null,
  isHydrated: Boolean(initialSession),
  isChecking: false,
  error: null,

  hydrate: () => {
    const session = getInitialSession();

    set({
      session,
      user: toUser(session),
      role: session?.role || null,
      isHydrated: true,
      error: null,
    });
  },

  setSession: (session, persist = true) => {
    const normalizedSession = normalizeSession(session);

    if (normalizedSession && persist) {
      saveAuthSession(normalizedSession, true);
    }

    if (!normalizedSession) {
      clearAuthSession();
    }

    set({
      session: normalizedSession,
      user: toUser(normalizedSession),
      role: normalizedSession?.role || null,
      isHydrated: true,
      error: null,
    });
  },

  login: async ({ email, password, provider = 'password', remember = true }) => {
    set({ isChecking: true, error: null });

    try {
      const result = await loginRequest({ email, password, provider });
      const session = normalizeSession(result.session);

      if (!session) {
        throw new Error('Login response is missing session data.');
      }

      if (!remember) {
        saveAuthSession(session, false);
      }

      set({
        session,
        user: toUser(session),
        role: session.role,
        isHydrated: true,
        isChecking: false,
        error: null,
      });

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      set({ isChecking: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    set({ isChecking: true, error: null });

    try {
      await logoutRequest();
    } finally {
      get().setSession(null, false);
      set({ isChecking: false });
    }
  },

  verifySession: async () => {
    set({ isChecking: true, error: null });

    try {
      const session = normalizeSession(await verifyAuthSession());

      set({
        session,
        user: toUser(session),
        role: session?.role || null,
        isHydrated: true,
        isChecking: false,
      });

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session verification failed.';

      set({
        session: null,
        user: null,
        role: null,
        isHydrated: true,
        isChecking: false,
        error: message,
      });

      return null;
    }
  },
}));
