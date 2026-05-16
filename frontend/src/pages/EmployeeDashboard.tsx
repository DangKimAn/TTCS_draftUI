import { useEffect, useMemo, useState } from 'react';
import './EmployeeDashboard.css';
import { useNavigate } from 'react-router-dom';
import {
  getAuthSession,
  getDashboardPathByRole,
} from '../utils/storage';
import { logout as logoutService } from '../services/authService';
import AttendanceHistory from '../components/AttendanceHistory';
import AttendancePanel from '../components/AttendancePanel';
import AttendanceStatusCard from '../components/AttendanceStatusCard';
import {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getCurrentDeviceInfo,
  getCurrentMockIp,
  getMonthlyAttendance,
  getTodayAttendance,
  toggleMockIp,
} from '../services/attendanceService';
import {
  formatDurationFromMinutes,
  formatHours,
  getElapsedMinutes,
  getWorkdayProgressPercent,
} from '../utils/timeUtils';
import '../styles/attendance.css';
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMonitor,
  FiPieChart,
  FiSearch,
  FiSettings,
  FiShield,
  FiTarget,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi';

const menuItems = [
  { icon: FiHome, label: 'Tong quan', active: true },
  { icon: FiClock, label: 'Cham cong' },
  { icon: FiFileText, label: 'Bang cong cua toi' },
  { icon: FiCalendar, label: 'Xin nghi phep' },
  { icon: FiPieChart, label: 'Lich su nghi phep' },
  { icon: FiUser, label: 'Ho so ca nhan' },
  { icon: FiSettings, label: 'Cai dat' },
  { icon: FiLogOut, label: 'Dang xuat' },
];

const stats = [
  {
    icon: FiCheckCircle,
    title: 'Gio vao hom nay',
    value: '08:00',
    note: 'Da check-in dung gio luc sang',
  },
  {
    icon: FiClock,
    title: 'Gio ra du kien',
    value: '17:30',
    note: 'Theo lich lam viec tieu chuan',
  },
  {
    icon: FiTarget,
    title: 'Tong gio hom nay',
    value: '7.5h',
    note: 'Tien do dat 74% muc tieu ngay',
  },
  {
    icon: FiCalendar,
    title: 'So du phep con lai',
    value: '8 ngay',
    note: 'Con du cho cac ke hoach sap toi',
  },
];

const attendanceRows = [
  { day: 'Thu 2', checkIn: '08:00', checkOut: '17:30', hours: '8.5h', status: 'Dung gio' },
  { day: 'Thu 3', checkIn: '08:10', checkOut: '17:30', hours: '8.3h', status: 'Di muon' },
  { day: 'Thu 4', checkIn: '08:02', checkOut: '17:28', hours: '8.4h', status: 'Dung gio' },
  { day: 'Thu 5', checkIn: '08:00', checkOut: '--', hours: '4.0h', status: 'Dang lam viec' },
  { day: 'Thu 6', checkIn: '08:05', checkOut: '17:00', hours: '7.9h', status: 'Thieu check-out' },
];

const leaveItems = [
  { label: 'Nghi phep ngay 12/04', status: 'Approved' },
  { label: 'Nghi 1/2 ngay 18/04', status: 'Pending' },
  { label: 'Nghi ca nhan 22/04', status: 'Rejected' },
];

const quickActions = [
  { icon: FiCheckCircle, title: 'Cham cong ngay', text: 'Bat dau hoac ket thuc ca lam viec chi voi mot cham.' },
  { icon: FiFileText, title: 'Xem bang cong', text: 'Kiem tra tong gio, lich su va cac ban ghi gan day.' },
  { icon: FiCalendar, title: 'Gui don nghi phep', text: 'Tao don moi nhanh gon va gui den quan ly.' },
  { icon: FiUser, title: 'Cap nhat ho so', text: 'Dieu chinh thong tin ca nhan va tuy chon tai khoan.' },
];

const notifications = [
  '08:15 - He thong da ghi nhan check-in thanh cong.',
  '10:30 - Nho cap nhat timesheet cho du an Sprint April.',
  '14:00 - Don nghi phep ngay 12/04 da duoc phe duyet.',
];

const reminders = [
  'Hoan tat timesheet truoc 17:00 hom nay.',
  'Kiem tra lai 2 ban ghi cham cong tuan truoc.',
  'Cap nhat muc tieu cong viec tuan nay cho team.',
];

function getStatusClass(status) {
  switch (status) {
    case 'Dung gio':
    case 'Approved':
      return 'success';
    case 'Pending':
    case 'Dang lam viec':
      return 'info';
    case 'Di muon':
    case 'Thieu check-out':
      return 'warning';
    case 'Rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

function FixedEmployeeDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();

  const handleLogout = async () => {
    await logoutService();
    navigate('/', { replace: true });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__glow dashboard-page__glow--left" />
      <div className="dashboard-page__glow dashboard-page__glow--right" />

      <section className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-pill">Employee Dashboard</div>
          <h1>Dashboard Nhan vien</h1>
          <p>Xem nhanh cham cong hom nay, bang cong cua toi va cac thao tac nghi phep can thiet.</p>

          <div className="dashboard-hero__actions">
            <button
              type="button"
              className="dashboard-button dashboard-button--primary"
              onClick={() => navigate('/dashboard/employee')}
            >
              Cham cong ngay
            </button>
            <button
              type="button"
              className="dashboard-button dashboard-button--ghost"
              onClick={() => navigate('/dashboard/employee')}
            >
              Xem bang cong
            </button>
          </div>
        </div>

        <div className="dashboard-hero__stats">
          <div className="dashboard-hero__mini-card">
            <span>Nguoi dung</span>
            <strong>{session?.name || 'Employee User'}</strong>
            <small>Role: {session?.role || 'employee'}</small>
          </div>
          <div className="dashboard-hero__mini-card">
            <span>Session</span>
            <strong>{session?.token ? 'Authenticated' : 'Guest'}</strong>
            <small>{session?.token ? session.token.slice(0, 24) : 'No token'}</small>
          </div>
          <div className="dashboard-hero__mini-card dashboard-hero__mini-card--highlight">
            <span>Trang thai tai khoan</span>
            <strong>{session?.isActive ? 'Active' : 'Inactive'}</strong>
            <small>Phien dang nhap duoc cap tu SSO mock.</small>
          </div>
        </div>
      </section>

      <section className="dashboard-stat-grid dashboard-cards">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.title} className="dashboard-stat-card">
              <div className="dashboard-stat-card__icon">
                <Icon />
              </div>
              <span>{stat.title}</span>
              <strong>{stat.value}</strong>
              <p>{stat.note}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-panel role-dashboard__panel">
        <div className="dashboard-panel__heading">
          <div>
            <span className="dashboard-panel__eyebrow">Session Control</span>
            <h2>Trang thai dang nhap hien tai</h2>
            <p>Token mock, role va session duoc nap ngay khi dang nhap thanh cong.</p>
          </div>
        </div>

        <div className="dashboard-list">
          <div className="dashboard-list__item"><strong>Email</strong><span>{session?.email}</span></div>
          <div className="dashboard-list__item"><strong>Role</strong><span>{session?.role}</span></div>
          <div className="dashboard-list__item"><strong>Dashboard</strong><span>/dashboard/employee</span></div>
        </div>

        <div className="dashboard-panel__actions">
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleLogout}>
            <FiLogOut />
            Dang xuat
          </button>
        </div>
      </section>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel dashboard-panel--attendance">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Real-time Attendance</span>
                <h2>Trang thai lam viec hom nay</h2>
                <p>Du lieu duoc ghi nhan theo thoi gian thuc tu he thong cham cong noi bo.</p>
              </div>
              <div className="dashboard-status-badge dashboard-status-badge--success">
                Dang lam viec
              </div>
            </div>

            <div className="dashboard-attendance-grid dashboard-cards">
              <div className="dashboard-attendance-grid__item"><span>Check-in</span><strong>08:00</strong></div>
              <div className="dashboard-attendance-grid__item"><span>Check-out du kien</span><strong>17:30</strong></div>
              <div className="dashboard-attendance-grid__item"><span>Thoi gian lam viec hien tai</span><strong>04h 25m</strong></div>
              <div className="dashboard-attendance-grid__item"><span>IP mang</span><strong>192.168.1.20</strong></div>
              <div className="dashboard-attendance-grid__item"><span>Thiet bi</span><strong>Chrome on Windows</strong></div>
              <div className="dashboard-attendance-grid__item"><span>Server time</span><strong>13:25</strong></div>
            </div>

            <div className="dashboard-progress">
              <div className="dashboard-progress__meta">
                <span>Tien do ngay lam viec</span>
                <strong>74%</strong>
              </div>
              <div className="dashboard-progress__track">
                <div className="dashboard-progress__bar" />
              </div>
            </div>

            <div className="dashboard-panel__actions">
              <button type="button" className="dashboard-button dashboard-button--primary">
                Check-in
              </button>
              <button type="button" className="dashboard-button dashboard-button--ghost">
                Check-out
              </button>
            </div>

            <small className="dashboard-panel__footnote">
              Du lieu duoc ghi nhan theo thoi gian thuc.
            </small>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Recent Attendance</span>
                <h2>Bang cong gan day</h2>
                <p>Tom tat 5 ngay lam viec gan nhat de theo doi tinh trang cham cong.</p>
              </div>
            </div>

            <div className="dashboard-table-wrap">
              <div className="dashboard-table">
                <div className="dashboard-table__head">
                  <span>Ngay</span>
                  <span>Check-in</span>
                  <span>Check-out</span>
                  <span>Tong gio</span>
                  <span>Trang thai</span>
                </div>

                {attendanceRows.map((row) => (
                  <div key={row.day} className="dashboard-table__row">
                    <strong>{row.day}</strong>
                    <span>{row.checkIn}</span>
                    <span>{row.checkOut}</span>
                    <span>{row.hours}</span>
                    <div className={`dashboard-status-badge dashboard-status-badge--${getStatusClass(row.status)}`}>
                      {row.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Leave Balance</span>
                <h2>So du phep</h2>
              </div>
            </div>

            <div className="dashboard-leave-summary dashboard-cards">
              <div><span>Tong phep nam</span><strong>12 ngay</strong></div>
              <div><span>Da dung</span><strong>3 ngay</strong></div>
              <div><span>Cho duyet</span><strong>1 ngay</strong></div>
              <div><span>Con lai</span><strong>8 ngay</strong></div>
            </div>

            <div className="dashboard-list">
              {leaveItems.map((item) => (
                <div key={item.label} className="dashboard-list__item">
                  <div>
                    <strong>{item.label}</strong>
                  </div>
                  <div className={`dashboard-status-badge dashboard-status-badge--${getStatusClass(item.status)}`}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>

            <div className="dashboard-panel__actions dashboard-panel__actions--stack">
              <button
                  type="button"
                  className="dashboard-button dashboard-button--primary"
                  onClick={() => navigate('/dashboard/employee')}
                >
                  Tao don nghi phep
                </button>
              <button type="button" className="dashboard-button dashboard-button--ghost">
                Xem lich su
              </button>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Thong bao</span>
                <h2>Gan day</h2>
              </div>
            </div>

            <div className="dashboard-list">
              {notifications.map((item) => (
                <div key={item} className="dashboard-list__item dashboard-list__item--simple">
                  <FiBell />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Nhac nho hom nay</span>
                <h2>Lich va muc tieu</h2>
              </div>
            </div>

            <div className="dashboard-goal-card">
              <div className="dashboard-goal-card__header">
                <div className="dashboard-goal-card__icon">
                  <FiUsers />
                </div>
                <div>
                  <strong>Hop team sprint</strong>
                  <span>15:00 - 15:30 | Phong hop A3</span>
                </div>
              </div>
            </div>

            <div className="dashboard-list">
              {reminders.map((item) => (
                <div key={item} className="dashboard-list__item dashboard-list__item--simple">
                  <FiMonitor />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* function EmployeeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard__glow employee-dashboard__glow--left" />
      <div className="employee-dashboard__glow employee-dashboard__glow--right" />
      <div className="dashboard-main dashboard-main--standalone">
        <section className="dashboard-panel dashboard-panel--topbar">
          <div className="dashboard-header__brand">
            <div className="dashboard-header__logo">TP</div>
            <div>
              <strong>TimeSheet Pro</strong>
              <span>Workspace nhân viên</span>
            </div>
          </div>

          <label className="dashboard-header__search">
            <FiSearch />
            <input type="text" placeholder="Tìm kiếm bảng công, đơn nghỉ, thông báo..." />
          </label>

          <div className="dashboard-header__actions">
            <button className="dashboard-header__icon" type="button" aria-label="Thông báo">
              <FiBell />
              <span>3</span>
            </button>

            <div className="dashboard-header__profile">
              <div className="dashboard-header__avatar">ND</div>
              <div>
                <strong>Nguyễn Trần Ngọc Duyên</strong>
                <span>Xin chào, chúc bạn một ngày làm việc hiệu quả</span>
              </div>
            </div>
          </div>
        </section>
          <section className="dashboard-hero">
            <div className="dashboard-hero__content">
              <div className="dashboard-pill">Employee Dashboard</div>
              <h1>
                Theo doi thoi gian lam viec
                <br />
                va quan ly bang cong
                <br />
                mot cach truc quan
              </h1>
              <p>
                Xem nhanh trang thai cham cong, tong gio lam, so du phep va cac tac vu
                quan trong trong ngay.
              </p>

              <div className="dashboard-hero__actions">
                <button
                  type="button"
                  className="dashboard-button dashboard-button--primary"
                  onClick={() => navigate('/dashboard')}
                >
                  Cham cong ngay
                </button>
                <button
                  type="button"
                  className="dashboard-button dashboard-button--ghost"
                  onClick={() => navigate('/timesheet')}
                >
                  Xem bang cong
                </button>
              </div>
            </div>

            <div className="dashboard-hero__stats">
              <div className="dashboard-hero__mini-card">
                <span>Hieu suat hom nay</span>
                <strong>91%</strong>
                <small>Tap trung tot trong khung gio sang</small>
              </div>
              <div className="dashboard-hero__mini-card">
                <span>Cong viec dang xu ly</span>
                <strong>05 tac vu</strong>
                <small>02 muc uu tien cao can hoan thanh</small>
              </div>
              <div className="dashboard-hero__mini-card dashboard-hero__mini-card--highlight">
                <span>Server time</span>
                <strong>13:25</strong>
                <small>Du lieu dong bo theo he thong noi bo</small>
              </div>
            </div>
          </section>

          <section className="dashboard-stat-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.title} className="dashboard-stat-card">
                  <div className="dashboard-stat-card__icon">
                    <Icon />
                  </div>
                  <span>{stat.title}</span>
                  <strong>{stat.value}</strong>
                  <p>{stat.note}</p>
                </article>
              );
            })}
          </section>

          <div className="dashboard-content">
            <div className="dashboard-content__main">
              <section className="dashboard-panel dashboard-panel--attendance">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Real-time Attendance</span>
                    <h2>Trang thai lam viec hom nay</h2>
                    <p>Du lieu duoc ghi nhan theo thoi gian thuc tu he thong cham cong noi bo.</p>
                  </div>

                  <div className="dashboard-status-badge dashboard-status-badge--success">
                    Dang lam viec
                  </div>
                </div>

                <div className="dashboard-attendance-grid">
                  <div className="dashboard-attendance-grid__item">
                    <span>Check-in</span>
                    <strong>08:00</strong>
                  </div>
                  <div className="dashboard-attendance-grid__item">
                    <span>Check-out du kien</span>
                    <strong>17:30</strong>
                  </div>
                  <div className="dashboard-attendance-grid__item">
                    <span>Thoi gian lam viec hien tai</span>
                    <strong>04h 25m</strong>
                  </div>
                  <div className="dashboard-attendance-grid__item">
                    <span>IP mang</span>
                    <strong>192.168.1.20</strong>
                  </div>
                  <div className="dashboard-attendance-grid__item">
                    <span>Thiet bi</span>
                    <strong>Chrome on Windows</strong>
                  </div>
                  <div className="dashboard-attendance-grid__item">
                    <span>Server time</span>
                    <strong>13:25</strong>
                  </div>
                </div>

                <div className="dashboard-progress">
                  <div className="dashboard-progress__meta">
                    <span>Tien do ngay lam viec</span>
                    <strong>74%</strong>
                  </div>
                  <div className="dashboard-progress__track">
                    <div className="dashboard-progress__bar" />
                  </div>
                </div>

                <div className="dashboard-panel__actions">
                  <button type="button" className="dashboard-button dashboard-button--primary">
                    Check-in
                  </button>
                  <button type="button" className="dashboard-button dashboard-button--ghost">
                    Check-out
                  </button>
                </div>

                <small className="dashboard-panel__footnote">
                  Du lieu duoc ghi nhan theo thoi gian thuc.
                </small>
              </section>

              <section className="dashboard-panel">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Recent Attendance</span>
                    <h2>Bang cong gan day</h2>
                    <p>Tom tat 5 ngay lam viec gan nhat de theo doi tinh trang cham cong.</p>
                  </div>
                </div>

                <div className="dashboard-table-wrap">
                  <div className="dashboard-table">
                    <div className="dashboard-table__head">
                      <span>Ngay</span>
                      <span>Check-in</span>
                      <span>Check-out</span>
                      <span>Tong gio</span>
                      <span>Trang thai</span>
                    </div>

                    {attendanceRows.map((row) => (
                      <div key={row.day} className="dashboard-table__row">
                        <strong>{row.day}</strong>
                        <span>{row.checkIn}</span>
                        <span>{row.checkOut}</span>
                        <span>{row.hours}</span>
                        <div className={`dashboard-status-badge dashboard-status-badge--${getStatusClass(row.status)}`}>
                          {row.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="dashboard-panel">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Quick Actions</span>
                    <h2>Thao tac nhanh</h2>
                    <p>Truy cap cac chuc nang thuong dung cua nhan vien trong mot man hinh duy nhat.</p>
                  </div>
                </div>

                <div className="dashboard-quick-grid">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button key={action.title} type="button" className="dashboard-quick-card">
                        <div className="dashboard-quick-card__icon">
                          <Icon />
                        </div>
                        <strong>{action.title}</strong>
                        <p>{action.text}</p>
                        <span>
                          Mo nhanh
                          <FiChevronRight />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="dashboard-content__side">
              <section className="dashboard-panel">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Leave Balance</span>
                    <h2>So du phep</h2>
                  </div>
                </div>

                <div className="dashboard-leave-summary">
                  <div>
                    <span>Tong phep nam</span>
                    <strong>12 ngay</strong>
                  </div>
                  <div>
                    <span>Da dung</span>
                    <strong>3 ngay</strong>
                  </div>
                  <div>
                    <span>Cho duyet</span>
                    <strong>1 ngay</strong>
                  </div>
                  <div>
                    <span>Con lai</span>
                    <strong>8 ngay</strong>
                  </div>
                </div>

                <div className="dashboard-list">
                  {leaveItems.map((item) => (
                    <div key={item.label} className="dashboard-list__item">
                      <div>
                        <strong>{item.label}</strong>
                      </div>
                      <div className={`dashboard-status-badge dashboard-status-badge--${getStatusClass(item.status)}`}>
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="dashboard-panel__actions dashboard-panel__actions--stack">
                  <button
                    type="button"
                    className="dashboard-button dashboard-button--primary"
                    onClick={() => navigate('/leave')}
                  >
                    Tao don nghi phep
                  </button>
                  <button type="button" className="dashboard-button dashboard-button--ghost">
                    Xem lich su
                  </button>
                </div>
              </section>

              <section className="dashboard-panel">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Thong bao</span>
                    <h2>Gan day</h2>
                  </div>
                </div>

                <div className="dashboard-list">
                  {notifications.map((item) => (
                    <div key={item} className="dashboard-list__item dashboard-list__item--simple">
                      <FiBell />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-panel">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Nhac nho hom nay</span>
                    <h2>Lich va muc tieu</h2>
                  </div>
                </div>

                <div className="dashboard-goal-card">
                  <div className="dashboard-goal-card__header">
                    <div className="dashboard-goal-card__icon">
                      <FiUsers />
                    </div>
                    <div>
                      <strong>Hop team sprint</strong>
                      <span>15:00 - 15:30 | Phong hop A3</span>
                    </div>
                  </div>
                </div>

                <div className="dashboard-list">
                  {reminders.map((item) => (
                    <div key={item} className="dashboard-list__item dashboard-list__item--simple">
                      <FiMonitor />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="dashboard-weekly-target">
                  <div className="dashboard-weekly-target__meta">
                    <span>Muc tieu tuan</span>
                    <strong>18 / 24 gio du an</strong>
                  </div>
                  <div className="dashboard-progress__track dashboard-progress__track--small">
                    <div className="dashboard-progress__bar dashboard-progress__bar--weekly" />
                  </div>
                </div>
              </section>

              <section className="dashboard-panel dashboard-panel--compact">
                <div className="dashboard-panel__heading">
                  <div>
                    <span className="dashboard-panel__eyebrow">Workspace</span>
                    <h2>Tong quan nhanh</h2>
                  </div>
                </div>

                <div className="dashboard-overview-pills">
                  <span>
                    <FiGrid />
                    Timesheet da cap nhat
                  </span>
                  <span>
                    <FiCreditCard />
                    Payroll period dang mo
                  </span>
                  <span>
                    <FiCalendar />
                    02 lich hen sap toi
                  </span>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
} */

function getAttendanceMessage(errorOrCode) {
  const errorCode = typeof errorOrCode === 'string' ? errorOrCode : errorOrCode?.code;
  const fallbackMessage = typeof errorOrCode === 'string' ? '' : errorOrCode?.message;

  switch (errorCode) {
    case 'ALREADY_CHECKED_IN':
      return 'Ban da check-in cho hom nay.';
    case 'NOT_CHECKED_IN':
      return 'Ban chua check-in hom nay.';
    case 'ALREADY_COMPLETED':
      return 'Ban da hoan tat cham cong hom nay.';
    case 'ATTENDANCE_IP_MISMATCH':
      return 'IP check-out khong khop voi IP check-in.';
    case 'ATTENDANCE_LOAD_FAILED':
      return 'Khong the tai du lieu cham cong tu API.';
    case 'ATTENDANCE_UNAUTHORIZED':
      return 'Chi nhan vien moi duoc thao tac cham cong.';
    case 'ATTENDANCE_USER_MISSING':
      return 'Khong tim thay userID de cham cong.';
    default:
      return fallbackMessage || 'Da co loi xay ra. Vui long thu lai.';
  }
}

function RealtimeEmployeeDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [missingCount, setMissingCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());
  const [currentIp, setCurrentIp] = useState(getCurrentMockIp());
  const [currentDevice, setCurrentDevice] = useState(getCurrentDeviceInfo());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [feedback, setFeedback] = useState(null);

  const canManageAttendance = session?.role === 'employee';

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session?.role && session.role !== 'employee') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date().toISOString());
      setCurrentIp(getCurrentMockIp());
      setCurrentDevice(getCurrentDeviceInfo());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const loadAttendanceData = async (options = { showLoading: true }) => {
    const userID = session?.userID || session?.id;
    const userKey = session?.email || userID;

    if (!userID || !userKey) {
      return;
    }

    if (options.showLoading) {
      setAttendanceLoading(true);
    }

    setAttendanceError('');

    try {
      const now = new Date();
      const records = await getMonthlyAttendance(userID, now.getMonth() + 1, now.getFullYear());
      const todayRecord = getTodayAttendance(userKey);
      const recentHistory = getAttendanceHistory(userKey, 7);
      const missingRecords = records.filter((record) => record.status === 'Missing Out');

      setTodayAttendance(todayRecord);
      setHistory(recentHistory);
      setMissingCount(missingRecords.length);
      setCurrentIp(getCurrentMockIp());
      setCurrentDevice(getCurrentDeviceInfo());
    } catch (error) {
      const message = getAttendanceMessage(error);
      setAttendanceError(message);
      setFeedback({ type: 'danger', message });
    } finally {
      if (options.showLoading) {
        setAttendanceLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadAttendanceData();
  }, [session?.email, session?.id, session?.userID]);

  const workingDuration = useMemo(() => {
    if (todayAttendance?.status !== 'Working' || !todayAttendance.serverTimeAtCheckIn) {
      return formatHours(todayAttendance?.totalHours);
    }

    return formatDurationFromMinutes(
      getElapsedMinutes(todayAttendance.serverTimeAtCheckIn, currentTime),
    );
  }, [currentTime, todayAttendance]);

  const progressPercent = useMemo(
    () => getWorkdayProgressPercent(8, 0, 17, 30, new Date(currentTime)),
    [currentTime],
  );

  const handleCheckIn = async () => {
    const userID = session?.userID || session?.id;

    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    if (!userID) {
      setFeedback({ type: 'danger', message: 'Khong tim thay userID de check-in.' });
      return;
    }

    setLoadingAction('checkin');
    setFeedback(null);

    try {
      await checkIn(userID);
      await loadAttendanceData({ showLoading: false });
      setFeedback({
        type: 'success',
        message: 'Check-in thanh cong. Phien lam viec da duoc mo.',
      });
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: getAttendanceMessage(error),
      });
    } finally {
      setLoadingAction('');
    }
  };

  const handleCheckOut = async () => {
    const userID = session?.userID || session?.id;

    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    if (!userID) {
      setFeedback({ type: 'danger', message: 'Khong tim thay userID de check-out.' });
      return;
    }

    setLoadingAction('checkout');
    setFeedback(null);

    try {
      const updatedRecord = await checkOut(userID);
      await loadAttendanceData({ showLoading: false });
      setFeedback({
        type: updatedRecord.hasIpWarning ? 'warning' : 'success',
        message: updatedRecord.hasIpWarning
          ? 'Check-out thanh cong. IP thay doi bat thuong, quan ly se xem xet.'
          : 'Check-out thanh cong. Tong gio lam da duoc tinh toan.',
      });
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: getAttendanceMessage(error),
      });
    } finally {
      setLoadingAction('');
    }
  };

  const handleToggleIp = () => {
    const nextIp = toggleMockIp();
    setCurrentIp(nextIp);
    setFeedback({
      type: 'info',
      message: `Mock IP da duoc doi sang ${nextIp} de test canh bao bat thuong.`,
    });
  };

  const handleLogout = async () => {
    await logoutService();
    navigate('/', { replace: true });
  };

  return (
    <div className="dashboard-page attendance-dashboard">
      <div className="dashboard-page__glow dashboard-page__glow--left" />
      <div className="dashboard-page__glow dashboard-page__glow--right" />

      <section className="dashboard-hero attendance-dashboard__hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-pill">UC-02 REAL-TIME ATTENDANCE</div>
          <h1>Cham cong thoi gian thuc cho nhan vien</h1>
          <p>
            He thong kiem tra phien lam viec hien tai, luu server time, IP, thiet bi
            va cap nhat trang thai check-in / check-out theo thoi gian thuc.
          </p>

          <div className="dashboard-hero__actions">
            <button
              type="button"
              className="dashboard-button dashboard-button--primary"
              onClick={handleCheckIn}
              disabled={
                !canManageAttendance ||
                attendanceLoading ||
                Boolean(loadingAction) ||
                todayAttendance?.status === 'Working' ||
                todayAttendance?.status === 'Completed'
              }
            >
              Check-in ngay
            </button>
            <button
              type="button"
              className="dashboard-button dashboard-button--ghost"
              onClick={handleCheckOut}
              disabled={!canManageAttendance || attendanceLoading || Boolean(loadingAction) || todayAttendance?.status !== 'Working'}
            >
              Check-out
            </button>
          </div>
        </div>

        <div className="dashboard-hero__stats dashboard-cards">
          <div className="dashboard-hero__mini-card">
            <span>Nguoi dung</span>
            <strong>{session?.name || 'Employee User'}</strong>
            <small>Role: {session?.role || 'employee'}</small>
          </div>
          <div className="dashboard-hero__mini-card">
            <span>Session status</span>
            <strong>{session?.token ? 'Authenticated' : 'Guest'}</strong>
            <small>{session?.provider || 'password'} provider</small>
          </div>
          <div className="dashboard-hero__mini-card">
            <span>Trang thai hom nay</span>
            <strong>{todayAttendance?.status || 'Not Started'}</strong>
            <small>
              {todayAttendance?.checkInTime
                ? `Check-in ${todayAttendance.checkInTime}`
                : 'San sang bat dau'}
            </small>
          </div>
          <div className="dashboard-hero__mini-card dashboard-hero__mini-card--highlight">
            <span>Ban ghi can giai trinh</span>
            <strong>{missingCount}</strong>
            <small>Missing Out can duoc theo doi.</small>
          </div>
        </div>
      </section>

      <section className="dashboard-stat-grid dashboard-cards">
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiClock />
          </div>
          <span>Check-in today</span>
          <strong>{todayAttendance?.checkInTime || '--'}</strong>
          <p>Gio vao duoc luu theo server time.</p>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiZap />
          </div>
          <span>Working duration</span>
          <strong>{workingDuration}</strong>
          <p>Cap nhat lien tuc neu session dang mo.</p>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiShield />
          </div>
          <span>Current IP</span>
          <strong>{currentIp}</strong>
          <p>Dung de test canh bao IP Warning khi check-out.</p>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiLogOut />
          </div>
          <span>Account action</span>
          <strong>Secure logout</strong>
          <p>Phien dang nhap se bi xoa ngay khi dang xuat.</p>
        </article>
      </section>

      <div className="dashboard-content attendance-dashboard__content">
        <div className="dashboard-content__main">
          <AttendanceStatusCard
            attendance={todayAttendance}
            currentServerTime={currentTime}
            currentIp={currentIp}
            currentDevice={currentDevice}
            loading={attendanceLoading}
            error={attendanceError}
            missingCount={missingCount}
            activeDuration={workingDuration}
            progressPercent={progressPercent}
            onRetry={() => {
              void loadAttendanceData();
            }}
          />

          <AttendanceHistory
            records={history}
            loading={attendanceLoading}
            error={attendanceError}
            onRetry={() => {
              void loadAttendanceData();
            }}
          />
        </div>

        <aside className="dashboard-content__side">
          <AttendancePanel
            attendance={todayAttendance}
            currentIp={currentIp}
            loadingAttendance={attendanceLoading}
            loadingAction={loadingAction}
            attendanceError={attendanceError}
            feedback={feedback}
            canManageAttendance={canManageAttendance}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onToggleIp={handleToggleIp}
            onReload={() => {
              void loadAttendanceData();
            }}
          />

          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Session Info</span>
                <h2>Thong tin phien dang nhap</h2>
                <p>
                  Chi thao tac tren tai khoan dang dang nhap, khong cham cong ho user
                  khac.
                </p>
              </div>
            </div>

            <div className="dashboard-list">
              <div className="dashboard-list__item">
                <strong>Email</strong>
                <span>{session?.email || '--'}</span>
              </div>
              <div className="dashboard-list__item">
                <strong>Role</strong>
                <span>{session?.role || '--'}</span>
              </div>
              <div className="dashboard-list__item">
                <strong>Provider</strong>
                <span>{session?.provider || '--'}</span>
              </div>
              <div className="dashboard-list__item">
                <strong>Device</strong>
                <span>{currentDevice}</span>
              </div>
            </div>

            <div className="dashboard-panel__actions dashboard-panel__actions--stack">
              <button
                type="button"
                className="dashboard-button dashboard-button--ghost"
                onClick={() => {
                  void loadAttendanceData();
                  setFeedback({
                    type: 'info',
                    message: 'Du lieu cham cong da duoc tai lai tu API.',
                  });
                }}
              >
                Tai lai du lieu
              </button>

              <button
                type="button"
                className="dashboard-button dashboard-button--primary"
                onClick={handleLogout}
              >
                Dang xuat
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default RealtimeEmployeeDashboard;
