import { FiAlertCircle, FiCheckCircle, FiPower, FiRefreshCw, FiWifi } from 'react-icons/fi';

function AttendancePanel({
  attendance,
  currentIp,
  loadingAction,
  feedback,
  canManageAttendance,
  onCheckIn,
  onCheckOut,
  onToggleIp,
}) {
  const status = attendance?.status || 'Not Started';
  const checkInDisabled = !canManageAttendance || status === 'Working' || status === 'Completed';
  const checkOutDisabled = !canManageAttendance || status !== 'Working';

  return (
    <section className="dashboard-panel attendance-action-panel">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">Thao tác chấm công</span>
          <h2>Check-in / Check-out</h2>
          <p>
            Chỉ nhân viên đang đăng nhập mới được thao tác. Hệ thống tự động chặn phiên
            làm việc trùng lặp trong cùng một ngày.
          </p>
        </div>
      </div>

      {!canManageAttendance ? (
        <div className="attendance-banner attendance-banner--danger">
          <FiAlertCircle />
          <span>Bạn không có quyền sử dụng chức năng chấm công thời gian thực.</span>
        </div>
      ) : null}

      {feedback?.message ? (
        <div className={`attendance-banner attendance-banner--${feedback.type || 'info'}`}>
          {feedback.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <div className="attendance-action-panel__buttons">
        <button
          type="button"
          className="dashboard-button attendance-button attendance-button--checkin"
          disabled={checkInDisabled || loadingAction === 'checkin'}
          onClick={onCheckIn}
        >
          {loadingAction === 'checkin' ? <FiRefreshCw className="attendance-spin" /> : <FiPower />}
          {loadingAction === 'checkin' ? 'Đang ghi nhận...' : 'Check-in'}
        </button>

        <button
          type="button"
          className="dashboard-button attendance-button attendance-button--checkout"
          disabled={checkOutDisabled || loadingAction === 'checkout'}
          onClick={onCheckOut}
        >
          {loadingAction === 'checkout' ? <FiRefreshCw className="attendance-spin" /> : <FiPower />}
          {loadingAction === 'checkout' ? 'Đang kết thúc...' : 'Check-out'}
        </button>
      </div>

      <div className="attendance-test-tools">
        <div className="attendance-test-tools__meta">
          <FiWifi />
          <div>
            <strong>IP mô phỏng hiện tại</strong>
            <span>{currentIp}</span>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-button dashboard-button--ghost attendance-test-tools__toggle"
          onClick={onToggleIp}
        >
          Đổi IP mô phỏng
        </button>
      </div>

      <div className="attendance-action-panel__footnote">
        <span>Check-in chỉ tạo một phiên mở duy nhất trong ngày.</span>
        <span>Check-out sẽ tính tổng giờ và gắn cờ cảnh báo nếu IP thay đổi.</span>
      </div>
    </section>
  );
}

export default AttendancePanel;
