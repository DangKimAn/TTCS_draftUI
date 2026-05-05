import { FiAlertTriangle, FiShield } from 'react-icons/fi';
import { formatDateLabel, formatHours } from '../utils/timeUtils';

function getStatusClass(status) {
  switch (status) {
    case 'Working':
      return 'dashboard-status-badge--info';
    case 'Completed':
      return 'dashboard-status-badge--success';
    case 'Missing Out':
      return 'dashboard-status-badge--warning';
    default:
      return 'dashboard-status-badge--neutral';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'Working':
      return 'Đang làm việc';
    case 'Completed':
      return 'Hoàn thành';
    case 'Missing Out':
      return 'Quên Check-out';
    default:
      return 'Không xác định';
  }
}

function AttendanceHistory({ records }) {
  return (
    <section className="dashboard-panel attendance-history">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">Lịch sử chấm công</span>
          <h2>Lịch sử chấm công gần đây</h2>
          <p>Bảng dữ liệu 7 ngày gần nhất, bao gồm trạng thái và cảnh báo IP nếu có.</p>
        </div>
      </div>

      <div className="dashboard-table-wrap">
        <div className="dashboard-table attendance-history__table">
          <div className="dashboard-table__head attendance-history__head">
            <span>Ngày</span>
            <span>Vào</span>
            <span>Ra</span>
            <span>Tổng giờ</span>
            <span>Trạng thái</span>
            <span>Cảnh báo</span>
          </div>

          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.id} className="dashboard-table__row attendance-history__row">
                <strong>{formatDateLabel(record.date)}</strong>
                <span>{record.checkInTime || '--'}</span>
                <span>{record.checkOutTime || '--'}</span>
                <span>{formatHours(record.totalHours)}</span>
                <div className={`dashboard-status-badge ${getStatusClass(record.status)}`}>
                  {getStatusLabel(record.status)}
                </div>
                <div className="attendance-history__warnings">
                  {record.hasIpWarning ? (
                    <span className="attendance-inline-badge attendance-inline-badge--danger">
                      <FiShield />
                      Cảnh báo IP
                    </span>
                  ) : null}
                  {record.status === 'Missing Out' ? (
                    <span className="attendance-inline-badge attendance-inline-badge--warning">
                      <FiAlertTriangle />
                      Quên Check-out
                    </span>
                  ) : null}
                  {!record.hasIpWarning && record.status !== 'Missing Out' ? '--' : null}
                </div>
              </div>
            ))
          ) : (
            <div className="attendance-history__empty">Chưa có dữ liệu chấm công gần đây.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AttendanceHistory;
