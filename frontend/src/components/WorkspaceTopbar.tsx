import { FiSearch } from 'react-icons/fi';
import NotificationDropdown from './NotificationDropdown';
import { getAuthSession } from '../utils/storage';

function WorkspaceTopbar() {
  const session = getAuthSession();
  const initials = session?.name
    ? session.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'TP';

  return (
    <header className="topbar" role="banner">
      <div className="topbar__start">
        <label className="topbar__search" htmlFor="workspace-search">
          <FiSearch />
          <input
            id="workspace-search"
            type="search"
            placeholder={getSearchPlaceholder(session?.role)}
          />
        </label>
      </div>

      <div className="topbar__actions">
        <NotificationDropdown userID={session?.userID || session?.id} role={session?.role} />

        <div className="topbar__profile">
          <div className="topbar__avatar">{initials}</div>
          <div className="topbar__profile-copy">
            <strong>{session?.name || 'Khách truy cập'}</strong>
            <span>
              {session?.role ? getRoleSubtitle(session) : 'Xin chào, chúc bạn một ngày làm việc hiệu quả'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function getSearchPlaceholder(role) {
  if (role === 'manager') {
    return 'Tìm nhân viên, bảng công, đơn nghỉ phép, thông báo...';
  }

  if (role === 'hr') {
    return 'Tìm nhân sự, chính sách, báo cáo, thông báo...';
  }

  return 'Tìm kiếm bảng công, đơn nghỉ, thông báo...';
}

function getRoleSubtitle(session) {
  switch (session.role) {
    case 'manager':
      return 'Vai trò: Manager | Phạm vi: nhân sự trực thuộc';
    case 'hr':
      return 'Vai trò: HR | Quản trị nhân sự và chính sách';
    case 'employee':
      return `Vai trò: Employee | Hình thức đăng nhập: ${session.provider || 'password'}`;
    default:
      return `Vai trò: ${session.role}`;
  }
}

export default WorkspaceTopbar;
