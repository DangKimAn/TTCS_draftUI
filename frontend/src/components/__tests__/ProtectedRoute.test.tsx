import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// ---- helpers ----------------------------------------------------------------

function makeAuthStoreMock(overrides: {
  session?: { accessToken: string; role: string } | null;
  verifySession?: () => Promise<{ accessToken: string; role: string } | null>;
}) {
  const state = {
    session: overrides.session ?? null,
    hydrate: vi.fn(),
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
    vi.mock('../../store/authStore', () => ({
      useAuthStore: makeAuthStoreMock({ session: null }),
    }));

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
    vi.mock('../../store/authStore', () => ({
      useAuthStore: makeAuthStoreMock({
        session: { accessToken: 'tok', role: 'employee' },
        verifySession: vi.fn().mockResolvedValue({ accessToken: 'tok', role: 'employee' }),
      }),
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
    vi.mock('../../store/authStore', () => ({
      useAuthStore: makeAuthStoreMock({
        session: { accessToken: 'tok', role: 'manager' },
        verifySession: vi.fn().mockResolvedValue({ accessToken: 'tok', role: 'manager' }),
      }),
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
    vi.mock('../../store/authStore', () => ({
      useAuthStore: makeAuthStoreMock({
        session: null,
        // Never resolves during this test
        verifySession: vi.fn().mockReturnValue(new Promise(() => {})),
      }),
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
