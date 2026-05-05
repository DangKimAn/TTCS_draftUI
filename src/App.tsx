import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeWorkspaceDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import HRDashboard from './pages/HRDashboard';
import TimesheetPage from './pages/TimesheetWorkspacePage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { getAuthSession, getDashboardPathByRole } from './utils/storage';

function DashboardRedirect() {
  const session = getAuthSession();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPathByRole(session.role)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />

            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
              <Route path="/timesheet" element={<TimesheetPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
              <Route path="/dashboard/manager" element={<ManagerDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
              <Route path="/dashboard/hr" element={<HRDashboard />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
