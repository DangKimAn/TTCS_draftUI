import { FiSearch } from 'react-icons/fi';
import NotificationDropdown from './NotificationDropdown';
import { getAuthSession } from '../utils/storage';

function Topbar() {
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
    <header className="topbar">
      <div className="topbar__search">
        <FiSearch />
        <input type="text" placeholder="Tim kiem bang cong, don nghi, thong bao..." />
      </div>

      <div className="topbar__actions">
        <NotificationDropdown userID={session?.userID || session?.id} role={session?.role} />

        <div className="topbar__profile">
          <div className="topbar__avatar">{initials}</div>
          <div>
            <strong>{session?.name || 'Guest User'}</strong>
            <span>
              {session?.role
                ? `Role: ${session.role} | Provider: ${session.provider || 'password'}`
                : 'Xin chao, chuc ban mot ngay lam viec hieu qua'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
