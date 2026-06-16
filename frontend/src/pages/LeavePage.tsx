import { useEffect, useMemo, useState } from 'react';
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  calculateLeaveDays,
  createLeaveRequest,
  getLeaveBalance,
  getLeaveTypes,
  getMyLeaveRequests,
} from '../services/leaveService';
import type { LeaveBalance, LeaveType } from '../services/leaveService';
import type { LeaveRequest } from '../types';
import { formatDate } from '../utils/dateUtils';
import { getAuthSession } from '../utils/storage';
import './EmployeeDashboard.css';
import './WorkspacePages.css';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

const emptyBalance: LeaveBalance = {
  totalAnnualDays: 0,
  usedDays: 0,
  pendingDays: 0,
  remainingDays: 0,
  history: [],
  totalDaysOfLeave: 0,
  remainDaysOfLeave: 0,
};

const initialForm = {
  typeLeaveID: '',
  startDate: '',
  endDate: '',
  reason: '',
};

function LeavePage() {
  const session = getAuthSession();
  const userID = session?.userID || session?.id || '';
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>(emptyBalance);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDays = useMemo(
    () => calculateLeaveDays(form.startDate, form.endDate),
    [form.endDate, form.startDate],
  );

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') {
      return leaveRequests;
    }

    return leaveRequests.filter((item) => item.status === statusFilter);
  }, [leaveRequests, statusFilter]);

  const selectedLeaveType = leaveTypes.find((item) => item.id === form.typeLeaveID) || null;

  const loadLeaveData = async ({ showSuccess = false } = {}) => {
    if (!userID) {
      setFeedback({ type: 'danger', message: 'Không tìm thấy userID để tải dữ liệu nghỉ phép.' });
      return;
    }

    setIsLoading(true);

    try {
      const [types, balance, requests] = await Promise.all([
        getLeaveTypes(),
        getLeaveBalance(userID),
        getMyLeaveRequests(userID),
      ]);

      setLeaveTypes(types);
      setLeaveBalance(balance);
      setLeaveRequests(requests);
      setForm((current) => ({
        ...current,
        typeLeaveID: current.typeLeaveID || types[0]?.id || '',
      }));

      if (showSuccess) {
        setFeedback({ type: 'success', message: 'Đã tải lại dữ liệu nghỉ phép từ API.' });
      }
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error?.message || 'Không thể tải dữ liệu nghỉ phép.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaveData();
  }, [userID]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!userID) {
      return 'Không tìm thấy userID để tạo đơn nghỉ phép.';
    }

    if (!form.typeLeaveID) {
      return 'Vui lòng chọn loại nghỉ phép.';
    }

    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      return 'Vui lòng nhập đầy đủ ngày nghỉ và lý do.';
    }

    if (form.endDate < form.startDate) {
      return 'Ngày kết thúc không được sớm hơn ngày bắt đầu.';
    }

    if (totalDays <= 0) {
      return 'Số ngày nghỉ không hợp lệ.';
    }

    if (totalDays > leaveBalance.remainingDays) {
      return 'Số dư phép hiện tại không đủ cho đơn nghỉ này.';
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errorMessage = validateForm();

    if (errorMessage) {
      setFeedback({ type: 'danger', message: errorMessage });
      return;
    }

    setIsSubmitting(true);

    try {
      await createLeaveRequest(userID, {
        typeLeaveID: form.typeLeaveID,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });

      setForm({
        ...initialForm,
        typeLeaveID: form.typeLeaveID,
      });
      setFeedback({ type: 'success', message: 'Đã gửi đơn nghỉ phép. Trạng thái hiện tại là Chờ duyệt.' });
      await loadLeaveData();
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error?.message || 'Không thể gửi đơn nghỉ phép.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard__glow employee-dashboard__glow--left" />
      <div className="employee-dashboard__glow employee-dashboard__glow--right" />

      <div className="workspace-page">
        <section className="dashboard-panel workspace-page__hero">
          <div>
            <span className="dashboard-panel__eyebrow">Leave Management</span>
            <h1>Quản lý đơn nghỉ phép</h1>
            <p>
              Tạo đơn nghỉ phép, theo dõi số dư hiện tại và kiểm tra trạng thái phê duyệt từ dữ liệu API.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-button dashboard-button--ghost"
            onClick={() => void loadLeaveData({ showSuccess: true })}
            disabled={isLoading}
          >
            <FiRefreshCw />
            Tải lại
          </button>
        </section>

        <section className="workspace-page__stats">
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiCalendar />
            </div>
            <span>Tổng phép năm</span>
            <strong>{leaveBalance.totalAnnualDays} ngày</strong>
            <p>Chính sách nghỉ phép hiện tại của nhân viên.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiCheckCircle />
            </div>
            <span>Đã sử dụng</span>
            <strong>{leaveBalance.usedDays} ngày</strong>
            <p>Được tính từ các đơn nghỉ đã được phê duyệt.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiClock />
            </div>
            <span>Chờ duyệt</span>
            <strong>{leaveBalance.pendingDays} ngày</strong>
            <p>Các đơn đang chờ quản lý xác nhận.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiFileText />
            </div>
            <span>Còn lại</span>
            <strong>{leaveBalance.remainingDays} ngày</strong>
            <p>Số dư phép còn có thể sử dụng.</p>
          </article>
        </section>

        {feedback ? (
          <div className={`submit-timesheet-panel__helper ${feedback.type === 'success' ? 'is-success' : 'is-danger'}`}>
            {feedback.message}
          </div>
        ) : null}

        <div className="workspace-page__grid">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Recent Requests</span>
                <h2>Danh sách đơn nghỉ</h2>
                <p>Lọc theo trạng thái để theo dõi các đơn đã gửi.</p>
              </div>
              <div className="employee-filter-group">
                {STATUS_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`employee-chip${statusFilter === item.value ? ' is-active' : ''}`}
                    onClick={() => setStatusFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-list">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((item) => (
                  <div key={item.id} className="dashboard-list__item">
                    <div>
                      <strong>{item.type}</strong>
                      <span>{formatDate(item.startDate)} - {formatDate(item.endDate)} | {item.totalDays} ngày</span>
                      <span>{item.reason}</span>
                    </div>
                    <div className={`dashboard-status-badge ${getLeaveStatusClass(item.status)}`}>
                      {getLeaveStatusLabel(item.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="timesheet-empty-state">
                  {isLoading ? 'Đang tải đơn nghỉ phép...' : 'Không có đơn nghỉ phép phù hợp bộ lọc.'}
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">New Request</span>
                <h2>Tạo đơn nghỉ phép</h2>
                <p>Chọn loại phép từ API, thời gian nghỉ và nhập lý do gửi quản lý.</p>
              </div>
            </div>

            <form className="workspace-form" onSubmit={handleSubmit}>
              <label className="workspace-form__field" htmlFor="leave-type">
                <span>Loại nghỉ phép</span>
                <select
                  id="leave-type"
                  className="workspace-form__control"
                  name="typeLeaveID"
                  value={form.typeLeaveID}
                  onChange={handleChange}
                  disabled={isLoading || isSubmitting}
                >
                  {leaveTypes.length > 0 ? (
                    leaveTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Chưa có loại nghỉ phép</option>
                  )}
                </select>
              </label>

              <div className="workspace-form__split">
                <label className="workspace-form__field" htmlFor="leave-start-date">
                  <span>Ngày bắt đầu</span>
                  <input
                    id="leave-start-date"
                    className="workspace-form__control"
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </label>
                <label className="workspace-form__field" htmlFor="leave-end-date">
                  <span>Ngày kết thúc</span>
                  <input
                    id="leave-end-date"
                    className="workspace-form__control"
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </label>
              </div>

              <div className="workspace-form__summary">
                <span>Số ngày nghỉ</span>
                <strong>{totalDays || 0} ngày</strong>
                <small>{selectedLeaveType ? (selectedLeaveType.isPaid ? 'Có lương' : 'Không lương') : 'Chọn loại nghỉ phép'}</small>
              </div>

              <label className="workspace-form__field" htmlFor="leave-reason">
                <span>Lý do</span>
                <textarea
                  id="leave-reason"
                  className="workspace-form__control workspace-form__control--textarea"
                  name="reason"
                  rows={5}
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Nhập lý do xin nghỉ phép..."
                  disabled={isSubmitting}
                />
              </label>

              <button
                type="submit"
                className="dashboard-button dashboard-button--primary"
                disabled={isSubmitting || isLoading || !leaveTypes.length}
              >
                <FiPlus />
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
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

export default LeavePage;
