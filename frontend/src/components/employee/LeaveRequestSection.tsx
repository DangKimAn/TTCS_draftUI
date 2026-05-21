import { useEffect, useMemo, useState } from 'react';
import { calculateLeaveDays } from '../../services/leaveService';
import { formatDate } from '../../utils/dateUtils';
import LeaveRequestModal from '../LeaveRequestModal';

const initialForm = {
  typeLeaveID: '',
  startDate: '',
  endDate: '',
  reason: '',
};

function LeaveRequestSection({ summary, requests, leaveTypes = [], onSubmitRequest }) {
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDays = useMemo(
    () => calculateLeaveDays(form.startDate, form.endDate),
    [form.endDate, form.startDate],
  );
  const selectedLeaveType = leaveTypes.find((item) => item.id === form.typeLeaveID) || null;

  useEffect(() => {
    if (!form.typeLeaveID && leaveTypes.length > 0) {
      setForm((current) => ({
        ...current,
        typeLeaveID: leaveTypes[0].id,
      }));
    }
  }, [form.typeLeaveID, leaveTypes]);

  const validate = () => {
    const today = new Date().toISOString().slice(0, 10);

    if (!form.typeLeaveID) {
      return 'Chưa có loại nghỉ phép từ API. Vui lòng tải lại dữ liệu nghỉ phép.';
    }

    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      return 'Vui lòng nhập đầy đủ thông tin đơn nghỉ phép.';
    }

    if (form.endDate < form.startDate) {
      return 'Ngày kết thúc không được sớm hơn ngày bắt đầu.';
    }

    if (form.startDate < today) {
      return 'Không nên tạo đơn nghỉ phép cho ngày trong quá khứ.';
    }

    if (totalDays <= 0) {
      return 'Số ngày nghỉ không hợp lệ.';
    }

    if (selectedLeaveType?.isPaid && totalDays > summary.remainingDays) {
      return 'Số dư phép không đủ cho loại nghỉ có lương đã chọn.';
    }

    return null;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const errorMessage = validate();

    if (errorMessage) {
      setFeedback({ type: 'danger', message: errorMessage });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitRequest({
        typeLeaveID: form.typeLeaveID,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        totalDays,
      });

      setFeedback({ type: 'success', message: 'Đã tạo đơn nghỉ phép mới với trạng thái Chờ duyệt.' });
      setForm({
        ...initialForm,
        typeLeaveID: leaveTypes[0]?.id || '',
      });
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error?.message || 'Không thể tạo đơn nghỉ phép.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <h1>Xin nghỉ phép</h1>
          <p>Tạo đơn nghỉ phép mới, kiểm tra số dư hiện tại và theo dõi các đơn vừa gửi.</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel leave-request-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Số dư hiện tại</span>
                <h2>Số dư phép hiện tại</h2>
                <p>Còn lại {summary.remainingDays} ngày phép có lương trong năm.</p>
              </div>
            </div>

            {feedback ? (
              <div className={`submit-timesheet-panel__helper ${feedback.type === 'success' ? 'is-success' : 'is-danger'}`}>
                {feedback.message}
              </div>
            ) : null}

            <form className="employee-form-grid" onSubmit={handleSubmit}>
              <label htmlFor="leave-type">
                <span>Loại nghỉ</span>
                <select
                  id="leave-type"
                  name="typeLeaveID"
                  value={form.typeLeaveID}
                  onChange={handleChange}
                  disabled={!leaveTypes.length}
                >
                  {leaveTypes.length > 0 ? leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  )) : (
                    <option value="">Chưa có loại nghỉ phép từ API</option>
                  )}
                </select>
              </label>

              <label htmlFor="leave-start-date">
                <span>Ngày bắt đầu</span>
                <input
                  id="leave-start-date"
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                />
              </label>

              <label htmlFor="leave-end-date">
                <span>Ngày kết thúc</span>
                <input
                  id="leave-end-date"
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                />
              </label>

              <div className="employee-form-grid__summary">
                <span>Số ngày nghỉ tự tính</span>
                <strong>{totalDays || 0} ngày</strong>
                <small>{selectedLeaveType ? (selectedLeaveType.isPaid ? 'Có lương' : 'Không lương') : 'Chọn loại nghỉ từ API'}</small>
              </div>

              <label className="employee-form-grid__full" htmlFor="leave-reason">
                <span>Lý do</span>
                <textarea
                  id="leave-reason"
                  name="reason"
                  rows={4}
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Nhập lý do xin nghỉ phép..."
                />
              </label>

              <div className="dashboard-panel__actions">
                <button type="submit" className="dashboard-button dashboard-button--primary" disabled={!leaveTypes.length || isSubmitting}>
                  {isSubmitting ? 'Đang tạo đơn...' : 'Tạo đơn nghỉ phép'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Đơn gần đây</span>
                <h2>Đơn nghỉ gần đây</h2>
              </div>
            </div>

            <div className="dashboard-list">
              {requests.length > 0 ? requests.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="dashboard-list__item cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setSelectedRequest(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <strong>{item.type}</strong>
                    <span>{formatDate(item.startDate)} - {formatDate(item.endDate)} | {item.totalDays} ngày | {item.isUnpaid ? 'Không lương' : 'Có lương'}</span>
                    <span>{item.reason}</span>
                  </div>
                  <div className={`dashboard-status-badge ${getLeaveStatusClass(item.status)}`}>
                    {getLeaveStatusLabel(item.status)}
                  </div>
                </div>
              )) : (
                <div className="timesheet-empty-state">Chưa có đơn nghỉ phép nào.</div>
              )}
            </div>
          </section>
        </aside>
      </div>

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
    default:
      return 'Chờ duyệt';
  }
}

export default LeaveRequestSection;
