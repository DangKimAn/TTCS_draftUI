import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';
import { getDashboardPathByRole } from '../utils/storage';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

function ProtectedRoute({ allowedRoles = [] }: ProtectedRouteProps) {
  const location = useLocation();
  const storeSession = useAuthStore((state) => state.session);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hasVerifiedSession = useAuthStore((state) => state.hasVerifiedSession);
  const hydrate = useAuthStore((state) => state.hydrate);
  const verifySession = useAuthStore((state) => state.verifySession);
  const hasToken = Boolean(storeSession?.accessToken || storeSession?.token);
  const shouldVerifySession = hasToken && !hasVerifiedSession;
  const [checkingAuth, setCheckingAuth] = useState(shouldVerifySession);
  const loginRedirectState = useMemo(
    () => ({
      from: `${location.pathname}${location.search}`,
      reason: 'SESSION_INVALID',
    }),
    [location.pathname, location.search],
  );

  useEffect(() => {
    let isMounted = true;

    if (!isHydrated) {
      hydrate();
    }

    if (!hasToken) {
      setCheckingAuth(false);
      return () => {
        isMounted = false;
      };
    }

    if (!shouldVerifySession) {
      setCheckingAuth(false);
      return () => {
        isMounted = false;
      };
    }

    setCheckingAuth(true);
    verifySession()
      .finally(() => {
        if (isMounted) {
          setCheckingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hasToken, hydrate, isHydrated, shouldVerifySession, verifySession]);

  if (checkingAuth) {
    return <div className="route-loading">Đang xác thực phiên đăng nhập...</div>;
  }

  if (!hasToken || !storeSession) {
    return <Navigate to="/login" replace state={loginRedirectState} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(storeSession.role)) {
    return <Navigate to="/unauthorized" replace state={{ redirectTo: getDashboardPathByRole(storeSession.role) }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
