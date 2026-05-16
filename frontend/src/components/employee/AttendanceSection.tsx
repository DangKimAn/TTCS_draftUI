import AttendanceHistory from '../AttendanceHistory';
import AttendancePanel from '../AttendancePanel';
import AttendanceStatusCard from '../AttendanceStatusCard';

function AttendanceSection(props) {
  const {
    attendance,
    currentTime,
    currentIp,
    currentDevice,
    missingCount,
    workingDuration,
    progressPercent,
    history,
    loading,
    loadingAction,
    error,
    feedback,
    canManageAttendance,
    onCheckIn,
    onCheckOut,
    onToggleIp,
    onReload,
  } = props;

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <h1>Chấm công thời gian thực</h1>
          <p>Thực hiện Check-in, Check-out và theo dõi lịch sử chấm công ngay trong khu vực nhân viên.</p>
        </div>
      </div>

      <div className="dashboard-content attendance-dashboard__content">
        <div className="dashboard-content__main">
          <AttendanceStatusCard
            attendance={attendance}
            currentServerTime={currentTime}
            currentIp={currentIp}
            currentDevice={currentDevice}
            loading={loading}
            error={error}
            missingCount={missingCount}
            activeDuration={workingDuration}
            progressPercent={progressPercent}
            onRetry={onReload}
          />
          <AttendanceHistory records={history} loading={loading} error={error} onRetry={onReload} />
        </div>

        <aside className="dashboard-content__side">
          <AttendancePanel
            attendance={attendance}
            currentIp={currentIp}
            loadingAttendance={loading}
            loadingAction={loadingAction}
            attendanceError={error}
            feedback={feedback}
            canManageAttendance={canManageAttendance}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
            onToggleIp={onToggleIp}
            onReload={onReload}
          />
        </aside>
      </div>
    </section>
  );
}

export default AttendanceSection;
