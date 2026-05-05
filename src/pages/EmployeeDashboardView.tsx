import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMonitor,
  FiSearch,
  FiTarget,
} from 'react-icons/fi';
import './EmployeeDashboard.css';
import './WorkspacePages.css';

const stats = [
  { icon: FiCheckCircle, title: 'Giờ vào hôm nay', value: '08:00', note: 'Đã check-in đúng giờ lúc sáng.' },
  { icon: FiClock, title: 'Giờ ra dự kiến', value: '17:30', note: 'Theo lịch làm việc tiêu chuẩn.' },
  { icon: FiTarget, title: 'Tổng giờ hôm nay', value: '7.5h', note: 'Tiến độ đạt 74% mục tiêu ngày.' },
  { icon: FiCalendar, title: 'Số dư phép còn lại', value: '8 ngày', note: 'Còn đủ cho các kế hoạch sắp tới.' },
];

const rows = [
  { day: 'Thứ 2', in: '08:00', out: '17:30', total: '8.5h', status: 'Đúng giờ' },
  { day: 'Thứ 3', in: '08:10', out: '17:30', total: '8.3h', status: 'Đi muộn' },
  { day: 'Thứ 4', in: '08:02', out: '17:28', total: '8.4h', status: 'Đúng giờ' },
  { day: 'Thứ 5', in: '08:00', out: '--', total: '4.0h', status: 'Đang làm việc' },
  { day: 'Thứ 6', in: '08:05', out: '17:00', total: '7.9h', status: 'Thiếu check-out' },
];

const notices = [
  '08:15 - Hệ thống đã ghi nhận check-in thành công.',
  '10:30 - Nhớ cập nhật timesheet cho dự án Sprint April.',
  '14:00 - Đơn nghỉ phép ngày 12/04 đã được phê duyệt.',
];

function statusClass(status) {
  if (status === 'Đúng giờ') return 'success';
  if (status === 'Đang làm việc') return 'info';
  return 'warning';
}

function EmployeeDashboardView() {
  const navigate = useNavigate();

  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard__glow employee-dashboard__glow--left" />
      <div className="employee-dashboard__glow employee-dashboard__glow--right" />

      <div className="workspace-page">
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
              Theo dõi thời gian làm việc
              <br />
              và quản lý bảng công
              <br />
              một cách trực quan
            </h1>
            <p>
              Xem nhanh trạng thái chấm công, tổng giờ làm, số dư phép và các tác vụ
              quan trọng trong ngày.
            </p>

            <div className="dashboard-hero__actions">
              <button type="button" className="dashboard-button dashboard-button--primary">
                Chấm công ngay
              </button>
              <button
                type="button"
                className="dashboard-button dashboard-button--ghost"
                onClick={() => navigate('/timesheet')}
              >
                Xem bảng công
              </button>
            </div>
          </div>

          <div className="dashboard-hero__stats">
            <div className="dashboard-hero__mini-card">
              <span>Hiệu suất hôm nay</span>
              <strong>91%</strong>
              <small>Tập trung tốt trong khung giờ sáng</small>
            </div>
            <div className="dashboard-hero__mini-card">
              <span>Công việc đang xử lý</span>
              <strong>05 tác vụ</strong>
              <small>02 mục ưu tiên cao cần hoàn thành</small>
            </div>
            <div className="dashboard-hero__mini-card dashboard-hero__mini-card--highlight">
              <span>Server time</span>
              <strong>13:25</strong>
              <small>Dữ liệu đồng bộ theo hệ thống nội bộ</small>
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
                  <h2>Trạng thái làm việc hôm nay</h2>
                  <p>Dữ liệu được ghi nhận theo thời gian thực từ hệ thống chấm công nội bộ.</p>
                </div>
                <div className="dashboard-status-badge dashboard-status-badge--success">
                  Đang làm việc
                </div>
              </div>

              <div className="dashboard-attendance-grid">
                <div className="dashboard-attendance-grid__item"><span>Check-in</span><strong>08:00</strong></div>
                <div className="dashboard-attendance-grid__item"><span>Check-out dự kiến</span><strong>17:30</strong></div>
                <div className="dashboard-attendance-grid__item"><span>Thời gian hiện tại</span><strong>04h 25m</strong></div>
                <div className="dashboard-attendance-grid__item"><span>IP mạng</span><strong>192.168.1.20</strong></div>
                <div className="dashboard-attendance-grid__item"><span>Thiết bị</span><strong>Chrome on Windows</strong></div>
                <div className="dashboard-attendance-grid__item"><span>Server time</span><strong>13:25</strong></div>
              </div>

              <div className="dashboard-progress">
                <div className="dashboard-progress__meta">
                  <span>Tiến độ ngày làm việc</span>
                  <strong>74%</strong>
                </div>
                <div className="dashboard-progress__track">
                  <div className="dashboard-progress__bar" />
                </div>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel__heading">
                <div>
                  <span className="dashboard-panel__eyebrow">Recent Attendance</span>
                  <h2>Bảng công gần đây</h2>
                  <p>Tóm tắt 5 ngày làm việc gần nhất để theo dõi tình trạng chấm công.</p>
                </div>
              </div>

              <div className="dashboard-table-wrap">
                <div className="dashboard-table">
                  <div className="dashboard-table__head">
                    <span>Ngày</span>
                    <span>Check-in</span>
                    <span>Check-out</span>
                    <span>Tổng giờ</span>
                    <span>Trạng thái</span>
                  </div>

                  {rows.map((row) => (
                    <div key={row.day} className="dashboard-table__row">
                      <strong>{row.day}</strong>
                      <span>{row.in}</span>
                      <span>{row.out}</span>
                      <span>{row.total}</span>
                      <div className={`dashboard-status-badge dashboard-status-badge--${statusClass(row.status)}`}>
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
                  <h2>Số dư phép</h2>
                </div>
              </div>

              <div className="dashboard-leave-summary">
                <div><span>Tổng phép năm</span><strong>12 ngày</strong></div>
                <div><span>Đã dùng</span><strong>3 ngày</strong></div>
                <div><span>Chờ duyệt</span><strong>1 ngày</strong></div>
                <div><span>Còn lại</span><strong>8 ngày</strong></div>
              </div>

              <div className="dashboard-panel__actions dashboard-panel__actions--stack">
                <button
                  type="button"
                  className="dashboard-button dashboard-button--primary"
                  onClick={() => navigate('/leave')}
                >
                  Tạo đơn nghỉ phép
                </button>
                <button
                  type="button"
                  className="dashboard-button dashboard-button--ghost"
                  onClick={() => navigate('/timesheet')}
                >
                  Xem bảng công
                </button>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel__heading">
                <div>
                  <span className="dashboard-panel__eyebrow">Thông báo</span>
                  <h2>Gần đây</h2>
                </div>
              </div>

              <div className="dashboard-list">
                {notices.map((item) => (
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
    </div>
  );
}

export default EmployeeDashboardView;
