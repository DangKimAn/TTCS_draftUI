import {
  FiClock,
  FiFileText,
  FiHome,
  FiLogOut,
  FiSettings,
  FiUser,
} from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  clearAuthSession,
  getAuthSession,
  getDashboardPathByRole,
} from '../utils/storage';

const sidebarItems = [
  { label: 'Tổng quan', to: '/dashboard', icon: FiHome },
  { label: 'Chấm công', to: '/dashboard', icon: FiClock },
  { label: 'Bảng công của tôi', to: '/timesheet', icon: FiFileText },
  { label: 'Xin nghỉ phép', to: '/leave', icon: FiClock },
  { label: 'Hồ sơ cá nhân', to: '/dashboard', icon: FiUser },
  { label: 'Cài đặt', to: '/dashboard', icon: FiSettings },
  { label: 'Đăng xuất', to: '/', icon: FiLogOut },
];

function DashboardSidebar() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const dashboardPath = getDashboardPathByRole(session?.role);
  const timesheetPath = session?.role === 'employee' ? '/timesheet' : dashboardPath;
  const cleanSidebarItems = [
    { label: 'Tong quan', to: dashboardPath, icon: FiHome },
    { label: 'Cham cong', to: dashboardPath, icon: FiClock },
    { label: 'Bang cong cua toi', to: timesheetPath, icon: FiFileText },
    { label: 'Ho so ca nhan', to: dashboardPath, icon: FiUser },
    { label: 'Cai dat', to: dashboardPath, icon: FiSettings },
  ];

  const handleLogout = () => {
    clearAuthSession();
    navigate('/', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">TP</span>
        <div>
          <strong>TimeSheet Pro</strong>
          <small>Employee Workspace</small>
        </div>
      </div>

      <nav className="sidebar__nav">
        {cleanSidebarItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={`${item.label}-${item.to}`}
              to={item.to}
              className={({ isActive }) => `sidebar__item${isActive ? ' is-active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          className="sidebar__item sidebar__item--button"
          onClick={handleLogout}
        >
          <FiLogOut />
          <span>Dang xuat</span>
        </button>
      </nav>

      <div className="sidebar__footer">
        <span>Session status</span>
        <strong>{session?.token ? 'Authenticated' : 'Guest'}</strong>
        <p>
          Role hien tai: {session?.role || 'unknown'}. Quyen va token duoc tai ngay sau
          khi xac thuc SSO.
        </p>
      </div>
    </aside>
  );
}

function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__inner">
        <div className="app-sidebar__label">Khu vực nhân viên</div>

        <nav className="app-sidebar__nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={`${item.label}-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `app-sidebar__item${isActive ? ' is-active' : ''}`
                }
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar__card">
          <span>Hiệu suất tuần</span>
          <strong>18 / 24 giờ dự án</strong>
          <p>Theo dõi tiến độ công việc, timesheet và trạng thái chấm công trong cùng một nơi.</p>
        </div>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
