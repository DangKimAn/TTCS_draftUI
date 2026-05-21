import { FiAlertCircle, FiBell, FiCheckCircle } from 'react-icons/fi';
import { formatHours } from '../../utils/timeUtils';

function OverviewSection({ overviewStats, todaySession, quickTasks, notifications, onNavigate }) {
  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <h1>Chào mừng quay lại</h1>
          <p>Theo dõi nhanh trạng thái làm việc, bảng công và các việc cần xử lý trong ngày.</p>
        </div>
      </div>

      <div className="dashboard-stat-grid dashboard-cards">
        {overviewStats.map((item) => {
          const Icon = item.icon;
          return (
            <article 
              key={item.label} 
              className={`dashboard-stat-card ${item.action ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
              onClick={() => item.action && onNavigate && onNavigate(item.action)}
              style={item.action ? { cursor: 'pointer' } : {}}
            >
              <div className="dashboard-stat-card__icon">
                <Icon />
              </div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          );
        })}
      </div>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Phiên hôm nay</span>
                <h2>Phiên làm việc hôm nay</h2>
                <p>Cập nhật giờ Check-in, Check-out và tổng giờ làm việc của ngày hiện tại.</p>
              </div>
              <div className={`dashboard-status-badge ${todaySession.badgeClass}`}>
                {todaySession.status}
              </div>
            </div>

            <div className="employee-info-grid">
              <article className="employee-info-card">
                <span>Giờ vào</span>
                <strong>{todaySession.checkIn}</strong>
              </article>
              <article className="employee-info-card">
                <span>Giờ ra</span>
                <strong>{todaySession.checkOut}</strong>
              </article>
              <article className="employee-info-card">
                <span>Tổng giờ</span>
                <strong>{formatHours(todaySession.totalHours)}</strong>
              </article>
            </div>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Việc cần làm</span>
                <h2>Việc cần làm</h2>
                <p>Nhắc nhở các thao tác nghiệp vụ cần thực hiện trong ngày.</p>
              </div>
            </div>

            <div className="dashboard-list">
              {quickTasks.map((task) => (
                <div 
                  key={task.label} 
                  className={`dashboard-list__item dashboard-list__item--simple ${task.action ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                  onClick={() => task.action && onNavigate && onNavigate(task.action)}
                  style={task.action ? { cursor: 'pointer' } : {}}
                >
                  {task.type === 'warning' ? <FiAlertCircle /> : <FiCheckCircle />}
                  <span>{task.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Thông báo</span>
                <h2>Thông báo gần đây</h2>
              </div>
            </div>

            <div className="dashboard-list">
              {notifications && notifications.length > 0 ? notifications.map((item) => (
                <div key={item.id} className="dashboard-list__item dashboard-list__item--simple">
                  <FiBell />
                  <span>{item.content}</span>
                </div>
              )) : (
                <div className="dashboard-list__item dashboard-list__item--simple">
                  <span className="text-slate-400">Không có thông báo mới.</span>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default OverviewSection;
