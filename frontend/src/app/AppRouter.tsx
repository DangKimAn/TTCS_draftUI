import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import SsoCallbackPage from '../pages/SsoCallbackPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';

const EmployeeDashboard = lazy(() => import('../pages/EmployeeWorkspaceDashboard'));
const ManagerDashboard = lazy(() => import('../pages/ManagerDashboard'));
const HRDashboard = lazy(() => import('../pages/HRDashboard'));
const TimesheetPage = lazy(() => import('../pages/TimesheetWorkspacePage'));
const LeavePage = lazy(() => import('../pages/LeavePage'));
import { useAuthStore } from '../store/authStore';
import { getDashboardPathByRole } from '../utils/storage';

function DashboardRedirect() {
  const session = useAuthStore((state) => state.session);

  if (!session?.accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPathByRole(session.role)} replace />;
}

function AppRouter() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<SsoCallbackPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />

            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
              <Route path="/timesheet" element={<TimesheetPage />} />
              <Route path="/leave" element={<LeavePage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
              <Route path="/dashboard/manager" element={<ManagerDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['hr', 'admin']} />}>
              <Route path="/dashboard/hr" element={<HRDashboard />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
