import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from '../utils/dateUtils';

function LeaveRequestModal({ isOpen, selectedRequest, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !selectedRequest) {
    return null;
  }

  const getStatusClass = (status) => {
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
  };

  const getStatusLabel = (status) => {
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
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-panel__heading">
          <div>
            <span className="dashboard-panel__eyebrow">Chi tiết đơn nghỉ phép</span>
            <h2>{selectedRequest.type}</h2>
            <p>Mã đơn: {selectedRequest.code}</p>
          </div>
          <div className={`dashboard-status-badge ${getStatusClass(selectedRequest.status)}`}>
            {getStatusLabel(selectedRequest.status)}
          </div>
        </div>

        <div className="employee-form-grid" style={{ pointerEvents: 'auto' }}>
          <div className="employee-form-grid__summary" style={{ gridColumn: '1 / -1' }}>
            <span>Thời gian nghỉ</span>
            <strong>
              {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}
            </strong>
            <small>{selectedRequest.totalDays} ngày | {selectedRequest.isUnpaid ? 'Không lương' : 'Có lương'}</small>
          </div>

          <label className="employee-form-grid__full">
            <span>Lý do xin nghỉ</span>
            <textarea
              rows={3}
              value={selectedRequest.reason}
              readOnly
            />
          </label>

          {(selectedRequest.status === 'Rejected' || selectedRequest.status === 'Cancelled') && selectedRequest.rejectionReason && (
            <label className="employee-form-grid__full">
              <span>{selectedRequest.status === 'Cancelled' ? 'Lý do hủy' : 'Lý do từ chối'}</span>
              <textarea
                rows={2}
                value={selectedRequest.rejectionReason}
                readOnly
                style={{ borderColor: 'rgba(255, 164, 141, 0.4)', backgroundColor: 'rgba(112, 44, 31, 0.1)' }}
              />
            </label>
          )}
        </div>

        <div className="dashboard-panel__actions" style={{ marginTop: '24px' }}>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LeaveRequestModal;
