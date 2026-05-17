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
  hasVerifiedSession: boolean;
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
let verifySessionPromise: Promise<AuthSession | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: initialSession,
  user: toUser(initialSession),
  role: initialSession?.role || null,
  isHydrated: true,
  isChecking: false,
  hasVerifiedSession: false,
  error: null,

  hydrate: () => {
    const session = getInitialSession();
    const currentSession = get().session;
    const currentToken = currentSession?.accessToken || currentSession?.token;
    const nextToken = session?.accessToken || session?.token;

    set({
      session,
      user: toUser(session),
      role: session?.role || null,
      isHydrated: true,
      hasVerifiedSession: Boolean(session && currentToken && nextToken === currentToken && get().hasVerifiedSession),
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
      hasVerifiedSession: Boolean(normalizedSession),
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
        hasVerifiedSession: true,
        error: null,
      });

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      set({ isChecking: false, hasVerifiedSession: false, error: message });
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
    if (verifySessionPromise) {
      return verifySessionPromise;
    }

    set({ isChecking: true, error: null });

    verifySessionPromise = (async () => {
      try {
        const session = normalizeSession(await verifyAuthSession());

        if (!session) {
          clearAuthSession();
        }

        set({
          session,
          user: toUser(session),
          role: session?.role || null,
          isHydrated: true,
          isChecking: false,
          hasVerifiedSession: Boolean(session),
        });

        return session;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Session verification failed.';
        clearAuthSession();

        set({
          session: null,
          user: null,
          role: null,
          isHydrated: true,
          isChecking: false,
          hasVerifiedSession: false,
          error: message,
        });

        return null;
      } finally {
        verifySessionPromise = null;
      }
    })();

    return verifySessionPromise;
  },
}));
