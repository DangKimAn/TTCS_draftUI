import { FiAlertTriangle, FiClock, FiHardDrive, FiMonitor } from 'react-icons/fi';
import { formatHours, formatTimeFromIso, formatTimeWithSeconds } from '../utils/timeUtils';

function getStatusMeta(record) {
  if (!record) {
    return {
      label: 'Chưa bắt đầu',
      badgeClass: 'dashboard-status-badge--neutral',
      description: 'Hệ thống chưa ghi nhận phiên làm việc nào trong hôm nay.',
    };
  }

  switch (record.status) {
    case 'Working':
      return {
        label: 'Đang làm việc',
        badgeClass: 'dashboard-status-badge--info',
        description: 'Phiên làm việc đang mở và sẽ tiếp tục cho đến khi Check-out.',
      };
    case 'Completed':
      return {
        label: 'Hoàn thành',
        badgeClass: 'dashboard-status-badge--success',
        description: 'Bạn đã hoàn tất Check-in và Check-out cho ngày hôm nay.',
      };
    case 'Missing Out':
      return {
        label: 'Quên Check-out',
        badgeClass: 'dashboard-status-badge--warning',
        description: 'Có bản ghi quên Check-out cần được giải trình.',
      };
    default:
      return {
        label: record.status || 'Chưa bắt đầu',
        badgeClass: 'dashboard-status-badge--neutral',
        description: 'Trạng thái chưa xác định.',
      };
  }
}

function AttendanceStatusCard({
  attendance,
  currentServerTime,
  currentIp,
  currentDevice,
  missingCount,
  activeDuration,
  progressPercent,
}) {
  const statusMeta = getStatusMeta(attendance);

  return (
    <section className="dashboard-panel attendance-status-card">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">Chấm công thời gian thực</span>
          <h2>Trạng thái làm việc hôm nay</h2>
          <p>{statusMeta.description}</p>
        </div>

        <div className={`dashboard-status-badge ${statusMeta.badgeClass}`}>
          {statusMeta.label}
        </div>
      </div>

      {missingCount > 0 ? (
        <div className="attendance-banner attendance-banner--warning">
          <FiAlertTriangle />
          <span>Bạn có {missingCount} bản ghi quên Check-out cần giải trình.</span>
        </div>
      ) : null}

      {attendance?.hasIpWarning ? (
        <div className="attendance-banner attendance-banner--danger">
          <FiAlertTriangle />
          <span>IP thay đổi bất thường, quản lý sẽ xem xét bản ghi này.</span>
        </div>
      ) : null}

      <div className="attendance-status-grid">
        <article className="attendance-status-grid__item">
          <span>Giờ Check-in</span>
          <strong>{attendance?.checkInTime || '--'}</strong>
        </article>
        <article className="attendance-status-grid__item">
          <span>Giờ Check-out</span>
          <strong>{attendance?.checkOutTime || '--'}</strong>
        </article>
        <article className="attendance-status-grid__item">
          <span>Tổng giờ</span>
          <strong>
            {attendance?.status === 'Working'
              ? activeDuration
              : formatHours(attendance?.totalHours)}
          </strong>
        </article>
        <article className="attendance-status-grid__item">
          <span>Giờ máy chủ</span>
          <strong>{formatTimeWithSeconds(currentServerTime)}</strong>
        </article>
        <article className="attendance-status-grid__item">
          <span>IP hiện tại</span>
          <strong>{currentIp || '--'}</strong>
        </article>
        <article className="attendance-status-grid__item">
          <span>Thiết bị hiện tại</span>
          <strong>{currentDevice || '--'}</strong>
        </article>
      </div>

      <div className="attendance-session-card">
        <div className="attendance-session-card__header">
          <div>
            <h3>Thông tin phiên làm việc</h3>
            <p>Phiên làm việc được ghi nhận theo giờ máy chủ và thiết bị hiện tại.</p>
          </div>
          <div className="attendance-session-card__meta">
            <FiClock />
            <span>{attendance?.status === 'Working' ? activeDuration : formatHours(attendance?.totalHours)}</span>
          </div>
        </div>

        <div className="attendance-session-card__details">
          <div>
            <FiHardDrive />
            <div>
              <span>Giờ Check-in hệ thống</span>
              <strong>{formatTimeFromIso(attendance?.serverTimeAtCheckIn)}</strong>
            </div>
          </div>
          <div>
            <FiMonitor />
            <div>
              <span>Giờ Check-out hệ thống</span>
              <strong>{formatTimeFromIso(attendance?.serverTimeAtCheckOut)}</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-progress attendance-progress">
          <div className="dashboard-progress__meta">
            <span>Tiến độ ngày làm việc</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="dashboard-progress__track">
            <div
              className="dashboard-progress__bar attendance-progress__bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {attendance?.note ? <small className="dashboard-panel__footnote">{attendance.note}</small> : null}
      </div>
    </section>
  );
}

export default AttendanceStatusCard;
