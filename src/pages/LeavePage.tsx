import { FiCalendar, FiCheckCircle, FiClock, FiFileText, FiPlus } from 'react-icons/fi';
import './EmployeeDashboard.css';
import './WorkspacePages.css';

const leaveRequests = [
  { type: 'Nghỉ phép năm', date: '12/04/2026', duration: '1 ngày', status: 'Đã duyệt' },
  { type: 'Nghỉ nửa ngày', date: '18/04/2026', duration: '0.5 ngày', status: 'Chờ duyệt' },
  { type: 'Nghỉ cá nhân', date: '22/04/2026', duration: '1 ngày', status: 'Từ chối' },
];

function LeavePage() {
  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard__glow employee-dashboard__glow--left" />
      <div className="employee-dashboard__glow employee-dashboard__glow--right" />

      <div className="workspace-page">
        <section className="dashboard-panel workspace-page__hero">
          <div>
            <span className="dashboard-panel__eyebrow">Leave Management</span>
            <h1>Quản lý đơn nghỉ phép rõ ràng và chuyên nghiệp</h1>
            <p>
              Theo dõi số dư phép, trạng thái phê duyệt và tạo đơn mới nhanh chóng trong
              cùng một giao diện dark-gold đồng bộ toàn hệ thống.
            </p>
          </div>
          <button type="button" className="dashboard-button dashboard-button--primary">
            <FiPlus />
            Tạo đơn nghỉ phép
          </button>
        </section>

        <section className="workspace-page__stats">
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiCalendar />
            </div>
            <span>Tổng phép năm</span>
            <strong>12 ngày</strong>
            <p>Chính sách nghỉ phép tiêu chuẩn của công ty.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiCheckCircle />
            </div>
            <span>Đã sử dụng</span>
            <strong>3 ngày</strong>
            <p>Đã ghi nhận hoàn tất trong năm hiện tại.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiClock />
            </div>
            <span>Chờ duyệt</span>
            <strong>1 ngày</strong>
            <p>Đơn mới đang chờ quản lý xác nhận.</p>
          </article>
        </section>

        <div className="workspace-page__grid">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Recent Requests</span>
                <h2>Danh sách đơn nghỉ gần đây</h2>
                <p>Cập nhật các trạng thái phê duyệt mới nhất cho nhân viên.</p>
              </div>
            </div>

            <div className="dashboard-list">
              {leaveRequests.map((item) => (
                <div key={`${item.type}-${item.date}`} className="dashboard-list__item">
                  <div>
                    <strong>{item.type}</strong>
                    <span>{item.date} • {item.duration}</span>
                  </div>
                  <div className={`dashboard-status-badge ${
                    item.status === 'Đã duyệt'
                      ? 'dashboard-status-badge--success'
                      : item.status === 'Chờ duyệt'
                        ? 'dashboard-status-badge--info'
                        : 'dashboard-status-badge--danger'
                  }`}
                  >
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Form Preview</span>
                <h2>Tạo đơn nghỉ phép</h2>
                <p>Mô phỏng giao diện gửi đơn nghỉ để nộp bài frontend.</p>
              </div>
            </div>

            <div className="workspace-form">
              <div className="workspace-form__field">
                <label>Loại nghỉ phép</label>
                <div className="workspace-form__input">Nghỉ phép năm</div>
              </div>
              <div className="workspace-form__field">
                <label>Khoảng thời gian</label>
                <div className="workspace-form__input">12/04/2026 - 12/04/2026</div>
              </div>
              <div className="workspace-form__field">
                <label>Lý do</label>
                <div className="workspace-form__input workspace-form__input--multiline">
                  Nghỉ phép cá nhân để giải quyết công việc gia đình.
                </div>
              </div>
              <button type="button" className="dashboard-button dashboard-button--ghost">
                <FiFileText />
                Gửi yêu cầu
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default LeavePage;
