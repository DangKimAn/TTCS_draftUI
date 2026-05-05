import {
  FiClock,
  FiFileText,
  FiHome,
  FiLogOut,
  FiSettings,
  FiUser,
} from 'react-icons/fi';
import { NavLink } from 'react-router-dom';

const sidebarItems = [
  { label: 'Tổng quan', to: '/dashboard', icon: FiHome },
  { label: 'Bảng công của tôi', to: '/timesheet', icon: FiFileText },
  { label: 'Xin nghỉ phép', to: '/leave', icon: FiClock },
  { label: 'Hồ sơ cá nhân', to: '/dashboard', icon: FiUser },
  { label: 'Cài đặt', to: '/dashboard', icon: FiSettings },
  { label: 'Đăng xuất', to: '/', icon: FiLogOut },
];

function AppSidebar() {
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

export default AppSidebar;
