import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import type { AuthSession, Role } from '../../types';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// ---- helpers ----------------------------------------------------------------

type AuthStoreSnapshot = ReturnType<typeof useAuthStore>;

function makeSession(role: Role): AuthSession {
  return {
    token: 'tok',
    accessToken: 'tok',
    refreshToken: 'refresh-tok',
    id: 'u1',
    userID: 'u1',
    email: 'user@example.com',
    name: 'Test User',
    role,
    roleId: null,
    departmentId: 'dept-1',
    managedEmployeeIds: [],
    permissions: [],
    isActive: true,
    provider: 'password',
    loggedInAt: '2026-05-16T00:00:00.000Z',
  };
}

function makeAuthStoreMock(overrides: {
  session?: AuthSession | null;
  hasVerifiedSession?: boolean;
  verifySession?: () => Promise<AuthSession | null>;
}) {
  const session = overrides.session ?? null;
  const state: AuthStoreSnapshot = {
    session,
    user: session
      ? {
          id: session.userID,
          email: session.email,
          name: session.name,
          role: session.role,
          departmentId: session.departmentId,
          managedEmployeeIds: session.managedEmployeeIds,
          permissions: session.permissions,
          isActive: session.isActive,
        }
      : null,
    role: session?.role ?? null,
    isHydrated: Boolean(session),
    isChecking: false,
    hasVerifiedSession: overrides.hasVerifiedSession ?? false,
    error: null,
    hydrate: vi.fn(),
    setSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    verifySession:
      overrides.verifySession ??
      vi.fn().mockResolvedValue(overrides.session ?? null),
  };
  return (selector: (s: typeof state) => unknown) => selector(state);
}

vi.mock('../../utils/storage', () => ({
  getAuthSession: vi.fn(),
  getDashboardPathByRole: vi.fn((role: string) => `/${role}-dashboard`),
}));

// ---- tests ------------------------------------------------------------------

describe('ProtectedRoute', () => {
  it('TC-01: redirects to /login if no token (unauthenticated)', async () => {
    vi.mocked(useAuthStore).mockImplementation(makeAuthStoreMock({ session: null }));

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('TC-02: redirects to /unauthorized when role does not match allowedRoles', async () => {
    const session = makeSession('employee');
    vi.mocked(useAuthStore).mockImplementation(makeAuthStoreMock({
      session,
      verifySession: vi.fn().mockResolvedValue(session),
    }));

    render(
      <MemoryRouter initialEntries={['/hr-only']}>
        <Routes>
          {/* Only 'hr' role allowed */}
          <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
            <Route path="/hr-only" element={<div>HR Page</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Unauthorized</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });

  it('TC-03: renders protected content when authenticated with correct role', async () => {
    const session = makeSession('manager');
    vi.mocked(useAuthStore).mockImplementation(makeAuthStoreMock({
      session,
      verifySession: vi.fn().mockResolvedValue(session),
    }));

    render(
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/manager" element={<div>Manager Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
    });
  });

  it('TC-04: shows loading indicator while verifySession is pending', () => {
    const session = makeSession('employee');
    vi.mocked(useAuthStore).mockImplementation(makeAuthStoreMock({
      session,
      // Never resolves during this test
      verifySession: vi.fn().mockReturnValue(new Promise(() => {})),
    }));

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Should show loading state (text from ProtectedRoute component)
    expect(screen.getByText(/xác thực phiên/i)).toBeInTheDocument();
  });
});
