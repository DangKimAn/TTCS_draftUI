import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Bảng công', to: '/timesheet' },
  { label: 'Nghỉ phép', to: '/leave' },
  { label: 'Đăng nhập', to: '/login' },
];

function RoutedNavbar() {
  return (
    <header className="site-navbar">
      <div className="container site-navbar__inner">
        <Link to="/" className="site-navbar__brand">
          <span className="site-navbar__brand-mark">TP</span>
          <div>
            <strong>TimeSheet Pro</strong>
            <span>Smart Time Tracking</span>
          </div>
        </Link>

        <nav className="site-navbar__menu">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `site-navbar__link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-navbar__actions">
          <Link to="/login" className="button button--ghost">
            Đăng nhập
          </Link>
          <Link to="/login" className="button button--primary">
            Bắt đầu
          </Link>
        </div>
      </div>
    </header>
  );
}

function Navbar() {
  const landingNavItems = ['Trang chủ', 'Tính năng', 'Quy trình', 'Xem trước', 'Liên hệ'];
  const navItems = ['Trang chủ', 'Tính năng', 'Quy trình', 'Thống kê', 'Liên hệ'];
  const sectionIds = ['hero', 'features', 'process', 'preview', 'footer'];

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <a href="#hero" className="navbar__brand">
          <span className="navbar__brand-mark">TP</span>
          <div>
            <strong>TimeSheet Pro</strong>
            <span>Smart Time Tracking</span>
          </div>
        </a>

        <nav className="navbar__menu">
          {landingNavItems.map((item, index) => (
            <a key={item} href={`#${sectionIds[index]}`} className="navbar__link">
              {item}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <button type="button" className="button button--ghost">
            Đăng nhập
          </button>
          <button type="button" className="button button--primary">
            Bắt đầu
          </button>
        </div>
      </div>
    </header>
  );
}

export default RoutedNavbar;
