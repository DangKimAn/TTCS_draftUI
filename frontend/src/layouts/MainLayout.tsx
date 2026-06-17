import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from '../components/WorkspaceSidebar';
import Topbar from '../components/WorkspaceTopbar';
import '../pages/EmployeeDashboard.css';

const SIDEBAR_COLLAPSE_KEY = 'timesheet_pro_sidebar_collapsed';

function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const storedValue = localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
    setIsSidebarCollapsed(storedValue === 'true');
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => {
      mediaQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const effectiveSidebarCollapsed = isMobileViewport ? false : isSidebarCollapsed;

  return (
    <div className={`dashboard app-shell${effectiveSidebarCollapsed ? ' dashboard--sidebar-collapsed' : ''}${isMobileSidebarOpen ? ' dashboard--mobile-sidebar-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Dong menu dieu huong"
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      <Sidebar
        isCollapsed={effectiveSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        onNavigate={() => setIsMobileSidebarOpen(false)}
      />
      <div className="main main-area">
        <Topbar onOpenMenu={() => setIsMobileSidebarOpen(true)} />
        <main className="content page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
