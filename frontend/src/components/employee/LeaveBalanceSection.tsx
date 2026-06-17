import { useMemo, useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import LeaveRequestModal from '../LeaveRequestModal';

function LeaveBalanceSection({ summary, requests }) {
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'Tất cả') {
      return requests;
    }

    return requests.filter((item) => getLeaveStatusLabel(item.status) === statusFilter);
  }, [requests, statusFilter]);

  const hasWarning = summary.remainingDays < 0;

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <h1>Số dư và lịch sử phép</h1>
          <p>Theo dõi tổng phép năm, đã sử dụng, chờ duyệt và lịch sử nghỉ phép chi tiết.</p>
        </div>
      </div>

      <div className="dashboard-stat-grid dashboard-cards">
        <article className="dashboard-stat-card">
          <span>Tổng phép năm</span>
          <strong>{summary.totalAnnualDays} ngày</strong>
          <p>Chính sách nghỉ phép của nhân viên.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Đã dùng</span>
          <strong>{summary.usedDays} ngày</strong>
          <p>Chỉ tính các đơn được phê duyệt.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Chờ duyệt</span>
          <strong>{summary.pendingDays} ngày</strong>
          <p>Đơn nghỉ đang ở trạng thái chờ duyệt.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Còn lại</span>
          <strong>{summary.remainingDays} ngày</strong>
          <p>{hasWarning ? 'Số dư bất thường, cần kiểm tra lại dữ liệu.' : 'Số dư hiện tại của bạn.'}</p>
        </article>
      </div>

      <section className="dashboard-panel employee-section__panel">
        <div className="dashboard-panel__heading">
          <div>
            <span className="dashboard-panel__eyebrow">Bộ lọc lịch sử</span>
            <h2>Lịch sử nghỉ phép</h2>
            <p>Lọc theo trạng thái để kiểm tra các đơn nghỉ đã gửi.</p>
          </div>

          <div className="employee-filter-group">
            {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy'].map((item) => (
              <button
                key={item}
                type="button"
                className={`employee-chip${statusFilter === item ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-list">
          {filteredRequests.length > 0 ? filteredRequests.map((item) => (
            <div 
              key={item.id} 
              className="dashboard-list__item cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setSelectedRequest(item)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong>{item.type}</strong>
                <span>{formatDate(item.startDate)} - {formatDate(item.endDate)} | {item.totalDays} ngày | {item.isUnpaid ? 'Không lương' : 'Có lương'}</span>
              </div>
              <div className={`dashboard-status-badge ${getLeaveStatusClass(item.status)}`}>
                {getLeaveStatusLabel(item.status)}
              </div>
            </div>
          )) : (
            <div className="timesheet-empty-state">Không có đơn nghỉ nào phù hợp bộ lọc đã chọn.</div>
          )}
        </div>
      </section>

      <LeaveRequestModal 
        isOpen={!!selectedRequest}
        selectedRequest={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </section>
  );
}

function getLeaveStatusClass(status) {
  switch (status) {
    case 'Approved':
      return 'dashboard-status-badge--success';
    case 'Rejected':
      return 'dashboard-status-badge--danger';
    case 'Cancelled':
      return 'dashboard-status-badge--neutral';
    default:
      return 'dashboard-status-badge--warning';
  }
}

function getLeaveStatusLabel(status) {
  switch (status) {
    case 'Approved':
      return 'Đã duyệt';
    case 'Rejected':
      return 'Từ chối';
    case 'Cancelled':
      return 'Đã hủy';
    default:
      return 'Chờ duyệt';
  }
}

export default LeaveBalanceSection;
