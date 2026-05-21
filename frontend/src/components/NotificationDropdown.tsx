import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiFileText,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  type NotificationItem,
} from '../services/notificationService';
import type { Role } from '../types';
import { getDashboardPathByRole } from '../utils/storage';
import { useSocket } from '../contexts/SocketContext';

const POLL_INTERVAL_MS = 60_000;

interface NotificationDropdownProps {
  userID?: string;
  role?: Role | string;
}

function NotificationDropdown({ userID = '', role = 'unknown' }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [readingID, setReadingID] = useState('');

  const refreshNotifications = useCallback(
    async (silent = false) => {
      if (!userID) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (!silent) {
        setIsLoading(true);
      }

      try {
        const [items, count] = await Promise.all([
          getMyNotifications(userID),
          getUnreadCount(userID),
        ]);

        setNotifications(items);
        setUnreadCount(count);
        setError('');
      } catch (refreshError) {
        setError(getErrorMessage(refreshError));
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [userID],
  );

  const { socket } = useSocket();

  useEffect(() => {
    refreshNotifications();

    const intervalID = window.setInterval(() => {
      refreshNotifications(true);
    }, POLL_INTERVAL_MS);

    if (socket) {
      const handleNewNotification = () => {
        refreshNotifications(true);
      };
      socket.on('new_notification', handleNewNotification);
      
      return () => {
        window.clearInterval(intervalID);
        socket.off('new_notification', handleNewNotification);
      };
    }

    return () => window.clearInterval(intervalID);
  }, [refreshNotifications, socket]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((current) => !current);

    if (!isOpen) {
      refreshNotifications(true);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    const notificationID = notification.notificationID || notification.id;
    const destination = resolveNotificationPath(notification, role);

    setIsOpen(false);

    if (notificationID && !notification.isRead) {
      setReadingID(notificationID);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationID ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((current) => Math.max(current - 1, 0));

      try {
        await markAsRead(notificationID);
      } catch (markError) {
        setError(getErrorMessage(markError));
        refreshNotifications(true);
      } finally {
        setReadingID('');
      }
    }

    navigate(destination);
  };

  return (
    <div className="notification-dropdown" ref={containerRef}>
      <button
        className="topbar__icon notification-dropdown__trigger"
        type="button"
        aria-label="Thong bao"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <FiBell />
        {unreadCount > 0 ? (
          <span className="notification-dropdown__badge">{formatBadgeCount(unreadCount)}</span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="notification-dropdown__menu" role="menu" aria-label="Thong bao">
          <div className="notification-dropdown__header">
            <strong>Thong bao</strong>
            <span>{unreadCount} chua doc</span>
          </div>

          <div className="notification-dropdown__list">
            {isLoading && notifications.length === 0 ? (
              <div className="notification-dropdown__state">Dang tai thong bao...</div>
            ) : null}

            {!isLoading && error && notifications.length === 0 ? (
              <div className="notification-dropdown__state notification-dropdown__state--error">
                {error}
              </div>
            ) : null}

            {!isLoading && !error && notifications.length === 0 ? (
              <div className="notification-dropdown__state">Chua co thong bao moi.</div>
            ) : null}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                className={`notification-dropdown__item${notification.isRead ? '' : ' is-unread'}`}
                type="button"
                role="menuitem"
                onClick={() => handleNotificationClick(notification)}
                disabled={readingID === notification.id}
              >
                <span className={`notification-dropdown__icon notification-dropdown__icon--${getTone(notification)}`}>
                  {getNotificationIcon(notification)}
                </span>
                <span className="notification-dropdown__body">
                  <span className="notification-dropdown__type">
                    {getRelatedLabel(notification)}
                    {!notification.isRead ? <span className="notification-dropdown__dot" /> : null}
                  </span>
                  <span className="notification-dropdown__content">{notification.content}</span>
                  <span className="notification-dropdown__meta">
                    {getSenderName(notification)}
                    <span aria-hidden="true">-</span>
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function resolveNotificationPath(notification: NotificationItem, role: Role | string): string {
  if (notification.targetUrl?.startsWith('/')) {
    return notification.targetUrl;
  }

  const relatedType = normalizeRelatedType(notification.relatedType);

  if (relatedType === 'leave') {
    if (role === 'manager') {
      return '/dashboard/manager?section=leave-approvals';
    }

    return '/dashboard/employee?section=leave-balance';
  }

  if (relatedType === 'timesheet') {
    if (role === 'manager') {
      return '/dashboard/manager?section=timesheet-approvals';
    }

    if (role === 'hr' || role === 'admin') {
      return '/dashboard/hr?section=reports';
    }

    return '/dashboard/employee?section=timesheet';
  }

  if (relatedType === 'warning') {
    if (role === 'employee') {
      return '/dashboard/employee?section=attendance';
    }

    return getDashboardPathByRole(role);
  }

  return getDashboardPathByRole(role);
}

function getNotificationIcon(notification: NotificationItem) {
  const tone = getTone(notification);

  if (tone === 'warning') {
    return <FiAlertCircle />;
  }

  if (tone === 'timesheet') {
    return <FiClock />;
  }

  if (tone === 'leave') {
    return <FiFileText />;
  }

  return notification.isRead ? <FiCheckCircle /> : <FiBell />;
}

function getTone(notification: NotificationItem): string {
  const relatedType = normalizeRelatedType(notification.relatedType);

  if (relatedType === 'warning') {
    return 'warning';
  }

  if (relatedType === 'leave') {
    return 'leave';
  }

  if (relatedType === 'timesheet') {
    return 'timesheet';
  }

  return notification.isRead ? 'read' : 'default';
}

function getRelatedLabel(notification: NotificationItem): string {
  const relatedType = normalizeRelatedType(notification.relatedType);

  if (relatedType === 'leave') {
    return 'Nghi phep';
  }

  if (relatedType === 'timesheet') {
    return 'Bang cong';
  }

  if (relatedType === 'warning') {
    return 'Canh bao';
  }

  return 'Thong bao';
}

function getSenderName(notification: NotificationItem): string {
  return (
    notification.sender?.username ||
    notification.sender?.email ||
    (notification.senderID ? 'Nguoi gui' : 'He thong')
  );
}

function normalizeRelatedType(relatedType?: string | null): string {
  return String(relatedType || '').trim().toLowerCase();
}

function formatBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) {
    return 'Vua xong';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phut truoc`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} gio truoc`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} ngay truoc`;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Khong the cap nhat thong bao.';
}

export default NotificationDropdown;
