import { FiAlertCircle, FiCheckCircle, FiPower, FiRefreshCw, FiWifi } from 'react-icons/fi';

function AttendancePanel({
  attendance,
  currentIp,
  loadingAttendance,
  loadingAction,
  feedback,
  attendanceError,
  canManageAttendance,
  onCheckIn,
  onCheckOut,
  onToggleIp,
  onReload,
}) {
  const status = attendance?.status || 'Not Started';
  const isAttendanceLoading = Boolean(loadingAttendance);
  const checkInDisabled =
    !canManageAttendance || isAttendanceLoading || status === 'Working' || status === 'Completed';
  const checkOutDisabled = !canManageAttendance || isAttendanceLoading || status !== 'Working';

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

      {isAttendanceLoading ? (
        <div className="attendance-banner attendance-banner--info">
          <FiRefreshCw className="attendance-spin" />
          <span>Đang tải dữ liệu chấm công từ API...</span>
        </div>
      ) : null}

      {attendanceError ? (
        <div className="attendance-banner attendance-banner--danger">
          <FiAlertCircle />
          <span>{attendanceError}</span>
          {onReload ? (
            <button
              type="button"
              className="dashboard-button dashboard-button--ghost attendance-banner__action"
              onClick={onReload}
            >
              <FiRefreshCw />
              Tải lại
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="attendance-action-panel__buttons">
        <button
          type="button"
          className="dashboard-button attendance-button attendance-button--checkin"
          disabled={checkInDisabled || Boolean(loadingAction)}
          onClick={onCheckIn}
        >
          {loadingAction === 'checkin' ? <FiRefreshCw className="attendance-spin" /> : <FiPower />}
          {loadingAction === 'checkin' ? 'Đang ghi nhận...' : 'Check-in'}
        </button>

        <button
          type="button"
          className="dashboard-button attendance-button attendance-button--checkout"
          disabled={checkOutDisabled || Boolean(loadingAction)}
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
            <strong>IP gửi lên API</strong>
            <span>{currentIp}</span>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-button dashboard-button--ghost attendance-test-tools__toggle"
          onClick={onToggleIp}
          disabled={Boolean(loadingAction) || isAttendanceLoading}
        >
          Đổi IP test
        </button>
      </div>

      <div className="attendance-action-panel__footnote">
        <span>Check-in và Check-out được gửi trực tiếp đến Attendance API.</span>
        <span>Backend sẽ kiểm tra phiên mở và IP của lượt chấm công.</span>
      </div>
    </section>
  );
}

export default AttendancePanel;
