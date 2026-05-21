import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import { API_CONFIG } from '../config/api';

function WorkspaceTopbar() {
  const [session, setSession] = useState(() => getAuthSession());
  const navigate = useNavigate();

  useEffect(() => {
    const handleAvatarUpdated = () => {
      setSession(getAuthSession());
    };
    window.addEventListener('avatar_updated', handleAvatarUpdated);
    return () => {
      window.removeEventListener('avatar_updated', handleAvatarUpdated);
    };
  }, []);

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

        <div 
          className="topbar__profile hover:opacity-80 transition-opacity" 
          onClick={() => {
            const basePath = getDashboardPathByRole(session?.role);
            navigate(`${basePath}?section=profile`);
          }}
          style={{ cursor: 'pointer' }}
          title="Xem hồ sơ cá nhân"
        >
          <div className="topbar__avatar" style={{ overflow: 'hidden' }}>
            {session?.avatar ? (
              <img 
                src={session.avatar.startsWith('http') ? session.avatar : `${API_CONFIG.BASE_URL.replace('/api', '')}${session.avatar}`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              initials
            )}
          </div>
          <div className="topbar__profile-copy">
            <strong>{session?.name || 'Khach truy cap'}</strong>
            <span>
              {session?.role ? getRoleSubtitle(session) : 'Xin chao, chuc ban mot ngay lam viec hieu qua'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function getSearchPlaceholder(role) {
  if (role === 'manager') {
    return 'Tim nhan vien, bang cong, don nghi phep, thong bao...';
  }

  if (isHrWorkspaceRole(role)) {
    return 'Tim nhan su, chinh sach, bao cao, thong bao...';
  }

  return 'Tim kiem bang cong, don nghi, thong bao...';
}

function getRoleSubtitle(session) {
  switch (session.role) {
    case 'manager':
      return 'Vai tro: Manager | Pham vi: nhan su truc thuoc';
    case 'hr':
      return 'Vai tro: HR | Quan tri nhan su va chinh sach';
    case 'admin':
      return 'Vai tro: Admin | Quan tri nhan su va chinh sach';
    case 'employee':
      return `Vai tro: Employee | Hinh thuc dang nhap: ${session.provider || 'password'}`;
    default:
      return `Vai tro: ${session.role}`;
  }
}

function isHrWorkspaceRole(role) {
  return role === 'hr' || role === 'admin';
}

export default WorkspaceTopbar;
