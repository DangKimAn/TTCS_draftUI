import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthSession } from '../utils/storage';
import { logout as logoutService } from '../services/authService';
import {
  DEFAULT_EMPLOYEE_SECTION,
  employeeLogoutItem,
  employeeMenu,
  getEmployeeSectionHref,
} from '../config/employeeMenu';
import {
  DEFAULT_MANAGER_SECTION,
  getManagerSectionHref,
  managerLogoutItem,
  managerMenu,
  normalizeManagerSection,
} from '../config/managerMenu';
import { getHrSectionHref, hrLogoutItem, hrMenu, normalizeHrSection } from '../config/hrMenu';

function WorkspaceSidebar({ isCollapsed, onToggleCollapse, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAuthSession();
  const roleConfig = getRoleConfig(session?.role);
  const rawCurrentSection =
    new URLSearchParams(location.search).get('section') || roleConfig.defaultSection;
  const currentSection = roleConfig.normalizeSection
    ? roleConfig.normalizeSection(rawCurrentSection)
    : rawCurrentSection;
  const LogoutIcon = roleConfig.logoutItem.icon;

  const handleLogout = async () => {
    await logoutService();
    onNavigate?.();
    navigate('/', { replace: true });
  };

  const handleNavigate = (href) => {
    navigate(href);
    onNavigate?.();
  };

  return (
    <aside
      className={`sidebar sidebar--custom-scrollbar${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label="Điều hướng khu vực làm việc"
    >
      <div className="sidebar__header">
        <div 
          className="sidebar__brand" 
          onClick={() => handleNavigate(roleConfig.getHref(roleConfig.defaultSection))}
          style={{ cursor: 'pointer' }}
          title="Về trang tổng quan"
        >
          <span className="sidebar__brand-mark">TP</span>
          {!isCollapsed ? (
            <div className="sidebar__brand-copy">
              <strong>TimeSheet Pro</strong>
              <small>{roleConfig.brandLabel}</small>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="sidebar__collapse-button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      <div className="sidebar__content">
        {!isCollapsed ? (
          <span className="sidebar__section-label">{roleConfig.sectionLabel}</span>
        ) : null}

        <nav className="sidebar__nav sidebar__nav--scrollbar">
          {roleConfig.menu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === roleConfig.path && currentSection === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar__item sidebar__item--button${isCollapsed ? ' sidebar__item--collapsed' : ''}${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavigate(roleConfig.getHref(item.key))}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="sidebar__item-icon">
                  <Icon />
                </span>
                {!isCollapsed ? (
                  <span className="sidebar__item-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__bottom">
          <button
            type="button"
            className={`sidebar__item sidebar__item--button sidebar__item--danger${isCollapsed ? ' sidebar__item--collapsed' : ''}`}
            onClick={handleLogout}
            title={isCollapsed ? roleConfig.logoutItem.label : undefined}
          >
            <span className="sidebar__item-icon">
              <LogoutIcon />
            </span>
            {!isCollapsed ? (
              <span className="sidebar__item-copy">
                <strong>{roleConfig.logoutItem.label}</strong>
                <small>{roleConfig.logoutItem.description}</small>
              </span>
            ) : null}
          </button>

          {!isCollapsed ? (
            <div className="sidebar__footer">
              <span>Trạng thái phiên</span>
              <strong>{session?.token ? 'Đã xác thực' : 'Khách'}</strong>
              <p>{roleConfig.footerText(session)}</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function getRoleConfig(role) {
  if (role === 'manager') {
    return {
      path: '/dashboard/manager',
      defaultSection: DEFAULT_MANAGER_SECTION,
      menu: managerMenu,
      logoutItem: managerLogoutItem,
      getHref: getManagerSectionHref,
      normalizeSection: normalizeManagerSection,
      brandLabel: 'Khu vực quản lý',
      sectionLabel: 'Điều hướng quản lý',
      footerText: (session) =>
        `Phạm vi hiển thị: nhân sự trực thuộc. Người dùng: ${session?.name || 'Không xác định'}.`,
    };
  }

  if (isHrWorkspaceRole(role)) {
    return {
      path: '/dashboard/hr',
      defaultSection: 'overview',
      menu: hrMenu,
      logoutItem: hrLogoutItem,
      getHref: getHrSectionHref,
      normalizeSection: normalizeHrSection,
      brandLabel: 'Khu vực HR',
      sectionLabel: 'Điều hướng nhân sự',
      footerText: (session) =>
        `Workspace HR đang mở cho ${session?.name || 'Không xác định'}.`,
    };
  }

  return {
    path: '/dashboard/employee',
    defaultSection: DEFAULT_EMPLOYEE_SECTION,
    menu: employeeMenu,
    logoutItem: employeeLogoutItem,
    getHref: getEmployeeSectionHref,
    brandLabel: 'Khu vực nhân viên',
    sectionLabel: 'Điều hướng cá nhân',
    footerText: (session) =>
      `Mục mặc định: Tổng quan. Người dùng: ${session?.name || 'Không xác định'}.`,
  };
}

function isHrWorkspaceRole(role) {
  return role === 'hr' || role === 'admin';
}

export default WorkspaceSidebar;
