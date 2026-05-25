import { useState, useRef } from 'react';

function getStatusLabel(status) {
  switch (status) {
    case 'Submitted':
      return 'Đã gửi';
    case 'Approved':
      return 'Đã duyệt';
    case 'Rejected':
      return 'Từ chối';
    default:
      return 'Bản nháp';
  }
}

function SubmitTimesheetPanel({
  stats,
  summaryStatus,
  submitState,
  title,
  onSubmit,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleAction = async () => {
    if (isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className="dashboard-panel submit-timesheet-panel">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">Gửi bảng công</span>
          <h2>{title || 'Gửi xác nhận bảng công'}</h2>
          <p>Chỉ được nộp khi dữ liệu đã đầy đủ và không còn yêu cầu chỉnh sửa đang chờ duyệt.</p>
        </div>
        <div
          className={`dashboard-status-badge ${
            summaryStatus === 'Submitted'
              ? 'dashboard-status-badge--info'
              : summaryStatus === 'Approved'
                ? 'dashboard-status-badge--success'
                : summaryStatus === 'Rejected'
                  ? 'dashboard-status-badge--danger'
                  : 'dashboard-status-badge--neutral'
          }`}
        >
          {getStatusLabel(summaryStatus)}
        </div>
      </div>

      <div className="submit-timesheet-panel__stats">
        <div>
          <span>Số dòng hợp lệ</span>
          <strong>{stats.validDays}</strong>
        </div>
        <div>
          <span>Số dòng cần kiểm tra</span>
          <strong>{Math.max(stats.totalDays - stats.validDays, 0)}</strong>
        </div>
        <div>
          <span>Chỉnh sửa chờ duyệt</span>
          <strong>{stats.pendingCorrections}</strong>
        </div>
      </div>

      <div className={`submit-timesheet-panel__helper ${submitState.allowed ? 'is-success' : 'is-danger'}`}>
        {submitState.reason}
      </div>

      <div className="dashboard-panel__actions dashboard-panel__actions--stack">
        <button
          type="button"
          className="dashboard-button dashboard-button--primary"
          onClick={handleAction}
          disabled={!submitState.allowed || isSubmitting}
        >
          {isSubmitting ? 'Đang gửi...' : summaryStatus === 'Submitted' ? 'Đã gửi xác nhận' : 'Gửi xác nhận'}
        </button>
        {summaryStatus === 'Submitted' ? (
          <small className="dashboard-panel__footnote">
            Thông báo đã được gửi đến quản lý.
          </small>
        ) : null}
      </div>
    </section>
  );
}

export default SubmitTimesheetPanel;
