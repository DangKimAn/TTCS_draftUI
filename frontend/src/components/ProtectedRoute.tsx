import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { AuthSession, Role } from '../types';
import { getDashboardPathByRole } from '../utils/storage';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

function ProtectedRoute({ allowedRoles = [] }: ProtectedRouteProps) {
  const location = useLocation();
  const storeSession = useAuthStore((state) => state.session);
  const hydrate = useAuthStore((state) => state.hydrate);
  const verifySession = useAuthStore((state) => state.verifySession);
  const [session, setSession] = useState<AuthSession | null>(storeSession);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    hydrate();
    setCheckingAuth(true);

    verifySession()
      .then((verifiedSession) => {
        if (isMounted) {
          setSession(verifiedSession);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setCheckingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hydrate, location.pathname, verifySession]);

  if (checkingAuth) {
    return <div className="route-loading">Đang xác thực phiên đăng nhập...</div>;
  }

  if (!session?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace state={{ redirectTo: getDashboardPathByRole(session.role) }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
