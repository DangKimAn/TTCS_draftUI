import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getDashboardPathByRole, getAuthSession } from '../utils/storage';

function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const session = getAuthSession();

  if (!session?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace state={{ redirectTo: getDashboardPathByRole(session.role) }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
