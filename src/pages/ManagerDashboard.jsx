import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiEye,
  FiSearch,
  FiUsers,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_MANAGER_SECTION,
  getManagerSectionHref,
  isValidManagerSection,
  normalizeManagerSection,
} from '../config/managerMenu';
import {
  currentUser as mockCurrentUser,
  departments as mockDepartments,
  employees as mockEmployees,
  leaveRequests as mockLeaveRequests,
  timesheets as mockTimesheets,
} from '../data/mockData';
import { formatDate } from '../utils/dateUtils';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './EmployeeDashboard.css';
import '../styles/timesheet.css';
import '../styles/manager.css';

const REVIEWABLE_TIMESHEET_STATUSES = ['Submitted', 'Pending'];
const DEFAULT_REPORT_FILTERS = {
  fromDate: '2026-05-01',
  toDate: '2026-05-31',
  employeeId: 'all',
  departmentId: 'all',
  status: 'all',
  exportFormat: 'Excel',
};

function ManagerDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(DEFAULT_MANAGER_SECTION);
  const [employees, setEmployees] = useState(() => mockEmployees.map((item) => ({ ...item })));
  const [timesheets, setTimesheets] = useState(() => mockTimesheets.map(cloneTimesheet));
  const [leaveRequests, setLeaveRequests] = useState(() => mockLeaveRequests.map((item) => ({ ...item })));
  const [feedback, setFeedback] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'manager') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  useEffect(() => {
    const nextSection = searchParams.get('section') || DEFAULT_MANAGER_SECTION;

    if (!isValidManagerSection(nextSection)) {
      setSearchParams({}, { replace: true });
      setSection(DEFAULT_MANAGER_SECTION);
      return;
    }

    setSection(normalizeManagerSection(nextSection));
  }, [searchParams, setSearchParams]);

  const currentManager = useMemo(() => buildCurrentManager(session), [session]);

  const teamEmployees = useMemo(
    () => getScopedEmployees(employees, currentManager),
    [currentManager, employees],
  );

  const teamEmployeeIds = useMemo(
    () => new Set(teamEmployees.map((employee) => employee.id)),
    [teamEmployees],
  );

  const scopedTimesheets = useMemo(
    () => timesheets.filter((timesheet) => teamEmployeeIds.has(timesheet.employeeId)),
    [teamEmployeeIds, timesheets],
  );

  const scopedLeaveRequests = useMemo(
    () => leaveRequests.filter((request) => teamEmployeeIds.has(request.employeeId)),
    [leaveRequests, teamEmployeeIds],
  );

  const scopedDepartments = useMemo(() => {
    const departmentIds = new Set(teamEmployees.map((employee) => employee.departmentId));
    return mockDepartments.filter((department) => departmentIds.has(department.id));
  }, [teamEmployees]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const handleApproveTimesheet = (timesheetId) => {
    const timesheet = scopedTimesheets.find((item) => item.id === timesheetId);

    if (!timesheet) {
      showFeedback('danger', 'Không tìm thấy bảng công trong phạm vi quản lý.');
      return;
    }

    if (!isTimesheetReviewable(timesheet)) {
      showFeedback('danger', 'Bảng công này đã được xử lý, không thể duyệt lại.');
      return;
    }

    setTimesheets((current) =>
      current.map((item) =>
        item.id === timesheetId
          ? {
              ...item,
              status: 'Approved',
              locked: true,
              approvedAt: new Date().toISOString(),
              rejectionReason: '',
            }
          : item,
      ),
    );

    showFeedback('success', `Đã duyệt bảng công ${timesheet.code} và khóa chỉnh sửa.`);
  };

  const handleApproveLeave = (requestId) => {
    const request = scopedLeaveRequests.find((item) => item.id === requestId);
    const employee = request ? employees.find((item) => item.id === request.employeeId) : null;

    if (!request || !employee) {
      showFeedback('danger', 'Không tìm thấy đơn nghỉ phép trong phạm vi quản lý.');
      return;
    }

    if (request.status !== 'Pending') {
      showFeedback('danger', 'Đơn nghỉ phép này đã được xử lý, không thể duyệt lại.');
      return;
    }

    if (employee.leaveBalance < request.totalDays) {
      showFeedback('danger', `Số dư phép của ${employee.fullName} không đủ. Vui lòng từ chối hoặc yêu cầu kiểm tra lại.`);
      return;
    }

    setLeaveRequests((current) =>
      current.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: 'Approved',
              approvedAt: new Date().toISOString(),
              rejectionReason: '',
            }
          : item,
      ),
    );

    setEmployees((current) =>
      current.map((item) =>
        item.id === request.employeeId
          ? {
              ...item,
              leaveBalance: roundNumber(item.leaveBalance - request.totalDays),
            }
          : item,
      ),
    );

    showFeedback('success', `Đã duyệt đơn ${request.code} và trừ ${request.totalDays} ngày phép.`);
  };

  const handleOpenRejectDialog = (type, id) => {
    setRejectDialog({
      type,
      id,
      reason: '',
      error: '',
    });
  };

  const handleSubmitReject = () => {
    if (!rejectDialog?.reason.trim()) {
      setRejectDialog((current) => ({
        ...current,
        error: 'Vui lòng nhập lý do từ chối.',
      }));
      return;
    }

    if (rejectDialog.type === 'timesheet') {
      const timesheet = scopedTimesheets.find((item) => item.id === rejectDialog.id);

      if (!timesheet || !isTimesheetReviewable(timesheet)) {
        showFeedback('danger', 'Bảng công này đã được xử lý hoặc nằm ngoài phạm vi quản lý.');
        setRejectDialog(null);
        return;
      }

      setTimesheets((current) =>
        current.map((item) =>
          item.id === rejectDialog.id
            ? {
                ...item,
                status: 'Rejected',
                locked: false,
                rejectionReason: rejectDialog.reason.trim(),
                rejectedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      showFeedback('success', `Đã từ chối bảng công ${timesheet.code}.`);
      setRejectDialog(null);
      return;
    }

    const request = scopedLeaveRequests.find((item) => item.id === rejectDialog.id);

    if (!request || request.status !== 'Pending') {
      showFeedback('danger', 'Đơn nghỉ phép này đã được xử lý hoặc nằm ngoài phạm vi quản lý.');
      setRejectDialog(null);
      return;
    }

    setLeaveRequests((current) =>
      current.map((item) =>
        item.id === rejectDialog.id
          ? {
              ...item,
              status: 'Rejected',
              rejectionReason: rejectDialog.reason.trim(),
              rejectedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    showFeedback('success', `Đã từ chối đơn nghỉ phép ${request.code}.`);
    setRejectDialog(null);
  };

  const handleRequestLeaveCheck = (requestId) => {
    const request = scopedLeaveRequests.find((item) => item.id === requestId);

    if (!request) {
      showFeedback('danger', 'Không tìm thấy đơn nghỉ phép trong phạm vi quản lý.');
      return;
    }

    showFeedback('info', `Đã ghi nhận yêu cầu kiểm tra lại số dư phép cho đơn ${request.code}.`);
  };

  const sectionProps = {
    overview: {
      currentManager,
      employees: teamEmployees,
      timesheets: scopedTimesheets,
      leaveRequests: scopedLeaveRequests,
      departments: scopedDepartments,
      onOpenSection: (sectionKey) => navigate(getManagerSectionHref(sectionKey)),
    },
    'timesheet-approvals': {
      timesheets: scopedTimesheets,
      employees: teamEmployees,
      departments: mockDepartments,
      feedback,
      onApprove: handleApproveTimesheet,
      onReject: (id) => handleOpenRejectDialog('timesheet', id),
      onViewDetail: (id) => setDetail({ type: 'timesheet', id }),
    },
    'leave-approvals': {
      leaveRequests: scopedLeaveRequests,
      employees: teamEmployees,
      departments: mockDepartments,
      feedback,
      onApprove: handleApproveLeave,
      onReject: (id) => handleOpenRejectDialog('leave', id),
      onRequestCheck: handleRequestLeaveCheck,
      onViewDetail: (id) => setDetail({ type: 'leave', id }),
    },
    team: {
      employees: teamEmployees,
      timesheets: scopedTimesheets,
      leaveRequests: scopedLeaveRequests,
      departments: mockDepartments,
    },
    'timesheet-reports': {
      timesheets: scopedTimesheets,
      employees: teamEmployees,
      departments: scopedDepartments,
      feedback,
      onFeedback: showFeedback,
    },
  };

  return (
    <div className="dashboard-page employee-workspace-page manager-workspace-page">
      <ManagerContentRouter section={section} sectionProps={sectionProps} />

      <ManagerDetailModal
        detail={detail}
        timesheets={scopedTimesheets}
        leaveRequests={scopedLeaveRequests}
        employees={teamEmployees}
        departments={mockDepartments}
        onClose={() => setDetail(null)}
      />

      <RejectDialog
        dialog={rejectDialog}
        timesheets={scopedTimesheets}
        leaveRequests={scopedLeaveRequests}
        onChange={(reason) =>
          setRejectDialog((current) => ({
            ...current,
            reason,
            error: '',
          }))
        }
        onClose={() => setRejectDialog(null)}
        onSubmit={handleSubmitReject}
      />
    </div>
  );
}

function ManagerContentRouter({ section, sectionProps }) {
  switch (section) {
    case 'timesheet-approvals':
      return <ManagerTimesheetApproval {...sectionProps['timesheet-approvals']} />;
    case 'leave-approvals':
      return <ManagerLeaveApproval {...sectionProps['leave-approvals']} />;
    case 'team':
      return <ManagerEmployees {...sectionProps.team} />;
    case 'timesheet-reports':
      return <ManagerTimesheetReport {...sectionProps['timesheet-reports']} />;
    default:
      return <ManagerOverview {...sectionProps.overview} />;
  }
}

function ManagerOverview({
  currentManager,
  employees,
  timesheets,
  leaveRequests,
  departments,
  onOpenSection,
}) {
  const pendingTimesheets = timesheets.filter(isTimesheetReviewable);
  const pendingLeaves = leaveRequests.filter((request) => request.status === 'Pending');
  const warningTimesheets = timesheets.filter((timesheet) => timesheet.warnings?.length > 0);
  const primaryDepartment = departments[0]?.name || 'Phòng ban trực thuộc';
  const todayTasks = [
    ...pendingTimesheets.map((timesheet) => ({
      id: timesheet.id,
      type: 'timesheet',
      label: `Bảng công ${timesheet.code}`,
      meta: `${getEmployeeName(employees, timesheet.employeeId)} | ${formatDate(timesheet.workDate)}`,
      section: 'timesheet-approvals',
      tone: timesheet.warnings?.length ? 'warning' : 'info',
    })),
    ...pendingLeaves.map((request) => ({
      id: request.id,
      type: 'leave',
      label: `Đơn nghỉ ${request.code}`,
      meta: `${getEmployeeName(employees, request.employeeId)} | ${request.totalDays} ngày`,
      section: 'leave-approvals',
      tone: 'warning',
    })),
  ].slice(0, 6);

  const stats = [
    {
      icon: FiClock,
      label: 'Bảng công chờ duyệt',
      value: pendingTimesheets.length,
      note: 'Submitted/Pending trong phạm vi quản lý.',
      accent: 'info',
    },
    {
      icon: FiCalendar,
      label: 'Đơn nghỉ chờ duyệt',
      value: pendingLeaves.length,
      note: 'Các đơn Pending của nhân viên trực thuộc.',
      accent: 'warning',
    },
    {
      icon: FiUsers,
      label: 'Nhân viên trực thuộc',
      value: employees.length,
      note: primaryDepartment,
      accent: 'success',
    },
    {
      icon: FiAlertTriangle,
      label: 'Cảnh báo bất thường',
      value: warningTimesheets.length,
      note: 'Missing Out, đi muộn hoặc dữ liệu mâu thuẫn.',
      accent: 'danger',
    },
  ];

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">Manager Workspace</span>
          <h1>Tổng quan Manager</h1>
          <p>Theo dõi nhanh bảng công, đơn nghỉ phép và nhân sự thuộc phạm vi quản lý của {currentManager.name}.</p>
        </div>
      </div>

      <section className="timesheet-summary-grid manager-summary-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className={`dashboard-stat-card manager-stat-card manager-stat-card--${stat.accent}`}>
              <div className="dashboard-stat-card__icon">
                <Icon />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.note}</p>
            </article>
          );
        })}
      </section>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Hôm nay</span>
                <h2>Việc cần xử lý hôm nay</h2>
              </div>
              <div className="dashboard-panel__actions manager-panel-actions">
                <button
                  type="button"
                  className="dashboard-button dashboard-button--ghost"
                  onClick={() => onOpenSection('timesheet-approvals')}
                >
                  <FiClock />
                  Bảng công
                </button>
                <button
                  type="button"
                  className="dashboard-button dashboard-button--primary"
                  onClick={() => onOpenSection('leave-approvals')}
                >
                  <FiCalendar />
                  Đơn nghỉ phép
                </button>
              </div>
            </div>

            <div className="dashboard-list manager-task-list">
              {todayTasks.length > 0 ? (
                todayTasks.map((task) => (
                  <div key={`${task.type}-${task.id}`} className="dashboard-list__item">
                    <div className="manager-task-list__copy">
                      <span className={`dashboard-status-badge ${task.tone === 'warning' ? 'dashboard-status-badge--warning' : 'dashboard-status-badge--info'}`}>
                        {task.type === 'timesheet' ? 'Timesheet' : 'Leave'}
                      </span>
                      <strong>{task.label}</strong>
                      <span>{task.meta}</span>
                    </div>
                    <button
                      type="button"
                      className="dashboard-button dashboard-button--ghost manager-compact-button"
                      onClick={() => onOpenSection(task.section)}
                    >
                      Xử lý
                    </button>
                  </div>
                ))
              ) : (
                <div className="timesheet-empty-state">Không có dữ liệu để xử lý hôm nay.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Phạm vi</span>
                <h2>Dữ liệu đang xem</h2>
              </div>
            </div>
            <div className="employee-info-grid employee-info-grid--single">
              <div className="employee-info-card">
                <span>Manager hiện tại</span>
                <strong>{currentManager.name}</strong>
              </div>
              <div className="employee-info-card">
                <span>Phòng ban</span>
                <strong>{primaryDepartment}</strong>
              </div>
              <div className="employee-info-card">
                <span>ID nhân viên được quản lý</span>
                <strong>{currentManager.managedEmployeeIds.join(', ')}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function ManagerTimesheetApproval({
  timesheets,
  employees,
  departments,
  feedback,
  onApprove,
  onReject,
  onViewDetail,
}) {
  const rows = [...timesheets].sort(sortPendingFirst);

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-06</span>
          <h1>Bảng công cần duyệt</h1>
          <p>Duyệt, từ chối và kiểm tra cảnh báo bảng công của nhân viên trực thuộc.</p>
        </div>
      </div>

      <ManagerFeedback feedback={feedback} />

      <section className="dashboard-panel manager-table-panel">
        <div className="table-scroll">
          <table className="manager-table manager-table--timesheets manager-table-carded">
            <thead>
              <tr>
                <th>Mã bảng công</th>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Ngày/kỳ công</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Tổng giờ</th>
                <th>Trạng thái</th>
                <th>Cảnh báo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((timesheet) => {
                  const employee = getEmployeeById(employees, timesheet.employeeId);
                  const reviewable = isTimesheetReviewable(timesheet);

                  return (
                    <tr key={timesheet.id}>
                      <td data-label="Mã bảng công" className="cell-nowrap">
                        <div className="manager-cell-stack">
                          <strong>{timesheet.code}</strong>
                          <span>{timesheet.locked ? 'Đã khóa' : 'Có thể xử lý'}</span>
                        </div>
                      </td>
                      <td data-label="Nhân viên">
                        <div className="manager-cell-stack">
                          <strong>{employee?.fullName || '--'}</strong>
                          <span>{employee?.email || '--'}</span>
                        </div>
                      </td>
                      <td data-label="Phòng ban">{getDepartmentName(departments, timesheet.departmentId)}</td>
                      <td data-label="Ngày/kỳ công">
                        <div className="manager-cell-stack">
                          <strong>{formatDate(timesheet.workDate)}</strong>
                          <span>{timesheet.periodLabel}</span>
                        </div>
                      </td>
                      <td data-label="Check-in" className="cell-nowrap">{timesheet.checkIn || '--'}</td>
                      <td data-label="Check-out" className="cell-nowrap">{timesheet.checkOut || '--'}</td>
                      <td data-label="Tổng giờ" className="cell-nowrap"><strong>{formatHoursValue(timesheet.totalHours)}</strong></td>
                      <td data-label="Trạng thái" className="cell-nowrap">
                        <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>
                          {timesheet.status}
                        </span>
                      </td>
                      <td data-label="Cảnh báo">
                        <WarningList warnings={timesheet.warnings} />
                      </td>
                      <td data-label="Hành động" className="manager-actions-cell">
                        <div className="manager-row-actions">
                          <button
                            type="button"
                            className="dashboard-button dashboard-button--ghost manager-action-button"
                            onClick={() => onViewDetail(timesheet.id)}
                          >
                            <FiEye />
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className="dashboard-button manager-action-button manager-button--approve"
                            onClick={() => onApprove(timesheet.id)}
                            disabled={!reviewable}
                          >
                            <FiCheck />
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="dashboard-button manager-action-button manager-button--reject"
                            onClick={() => onReject(timesheet.id)}
                            disabled={!reviewable}
                          >
                            <FiXCircle />
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="manager-table-empty">Không có bảng công nào trong phạm vi quản lý.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ManagerLeaveApproval({
  leaveRequests,
  employees,
  departments,
  feedback,
  onApprove,
  onReject,
  onRequestCheck,
  onViewDetail,
}) {
  const rows = [...leaveRequests].sort(sortLeavePendingFirst);

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-07</span>
          <h1>Đơn nghỉ phép</h1>
          <p>Duyệt hoặc từ chối đơn nghỉ phép của nhân viên trực thuộc.</p>
        </div>
      </div>

      <ManagerFeedback feedback={feedback} />

      <section className="dashboard-panel manager-table-panel">
        <div className="table-scroll">
          <table className="manager-table manager-table--leaves manager-table-carded">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Nhân viên</th>
                <th>Loại nghỉ</th>
                <th>Thời gian nghỉ</th>
                <th>Số ngày</th>
                <th>Lý do</th>
                <th>Số dư phép</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((request) => {
                  const employee = getEmployeeById(employees, request.employeeId);
                  const balance = employee?.leaveBalance ?? 0;
                  const insufficientBalance = balance < request.totalDays;
                  const reviewable = request.status === 'Pending';

                  return (
                    <tr key={request.id}>
                      <td data-label="Mã đơn" className="cell-nowrap"><strong>{request.code}</strong></td>
                      <td data-label="Nhân viên">
                        <div className="manager-cell-stack">
                          <strong>{employee?.fullName || '--'}</strong>
                          <span>{getDepartmentName(departments, employee?.departmentId)}</span>
                        </div>
                      </td>
                      <td data-label="Loại nghỉ">{request.type}</td>
                      <td data-label="Thời gian nghỉ">
                        <div className="manager-cell-stack">
                          <strong>{formatDate(request.startDate)}</strong>
                          <span>đến {formatDate(request.endDate)}</span>
                        </div>
                      </td>
                      <td data-label="Số ngày" className="cell-nowrap"><strong>{request.totalDays} ngày</strong></td>
                      <td data-label="Lý do" className="manager-reason-cell">{request.reason}</td>
                      <td data-label="Số dư phép">
                        <div className="manager-cell-stack">
                          <strong>{balance} ngày</strong>
                          {insufficientBalance ? (
                            <span className="manager-warning-text">Không đủ số dư phép</span>
                          ) : (
                            <span>Đủ điều kiện</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Trạng thái" className="cell-nowrap">
                        <span className={`dashboard-status-badge ${getStatusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td data-label="Hành động" className="manager-actions-cell">
                        <div className="manager-row-actions">
                          <button
                            type="button"
                            className="dashboard-button dashboard-button--ghost manager-action-button"
                            onClick={() => onViewDetail(request.id)}
                          >
                            <FiEye />
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className="dashboard-button manager-action-button manager-button--approve"
                            onClick={() => onApprove(request.id)}
                            disabled={!reviewable || insufficientBalance}
                          >
                            <FiCheck />
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="dashboard-button manager-action-button manager-button--reject"
                            onClick={() => onReject(request.id)}
                            disabled={!reviewable}
                          >
                            <FiXCircle />
                            Từ chối
                          </button>
                          {reviewable && insufficientBalance ? (
                            <button
                              type="button"
                              className="dashboard-button dashboard-button--ghost manager-action-button"
                              onClick={() => onRequestCheck(request.id)}
                            >
                              <FiAlertTriangle />
                              Kiểm tra lại
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="manager-table-empty">Không có đơn nghỉ phép nào trong phạm vi quản lý.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ManagerEmployees({ employees, timesheets, leaveRequests, departments }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');

  const visibleEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !normalizedQuery ||
        employee.fullName.toLowerCase().includes(normalizedQuery) ||
        employee.email.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, query, statusFilter]);

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ||
    visibleEmployees[0] ||
    null;

  const recentTimesheets = selectedEmployee
    ? timesheets
        .filter((timesheet) => timesheet.employeeId === selectedEmployee.id)
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, 4)
    : [];

  const recentLeaves = selectedEmployee
    ? leaveRequests
        .filter((request) => request.employeeId === selectedEmployee.id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .slice(0, 4)
    : [];

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">Team</span>
          <h1>Nhân sự phụ trách</h1>
          <p>Danh sách nhân viên thuộc phạm vi quản lý trực tiếp.</p>
        </div>
      </div>

      <section className="dashboard-panel manager-table-panel">
        <div className="manager-toolbar">
          <label className="topbar__search manager-search" htmlFor="manager-employee-search">
            <FiSearch />
            <input
              id="manager-employee-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
            />
          </label>
          <div className="employee-filter-group">
            {['all', 'Active', 'Inactive'].map((status) => (
              <button
                key={status}
                type="button"
                className={`employee-chip${statusFilter === status ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'Tất cả' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="table-scroll">
          <table className="manager-table manager-table--employees manager-table-carded">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Phòng ban</th>
                <th>Chức vụ</th>
                <th>Trạng thái</th>
                <th>Số dư phép</th>
                <th>Giờ tháng này</th>
                <th>Đơn nghỉ chờ</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.length > 0 ? (
                visibleEmployees.map((employee) => {
                  const pendingLeaveCount = leaveRequests.filter(
                    (request) => request.employeeId === employee.id && request.status === 'Pending',
                  ).length;

                  return (
                    <tr key={employee.id} className={selectedEmployee?.id === employee.id ? 'is-selected' : ''}>
                      <td data-label="Họ tên"><strong>{employee.fullName}</strong></td>
                      <td data-label="Email">{employee.email}</td>
                      <td data-label="Phòng ban">{getDepartmentName(departments, employee.departmentId)}</td>
                      <td data-label="Chức vụ">{employee.title}</td>
                      <td data-label="Trạng thái" className="cell-nowrap">
                        <span className={`dashboard-status-badge ${getStatusClass(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td data-label="Số dư phép" className="cell-nowrap"><strong>{employee.leaveBalance} ngày</strong></td>
                      <td data-label="Giờ tháng này" className="cell-nowrap"><strong>{formatHoursValue(employee.monthlyHours)}</strong></td>
                      <td data-label="Đơn nghỉ chờ" className="cell-nowrap">{pendingLeaveCount} đơn</td>
                      <td data-label="Hành động" className="manager-actions-cell">
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost manager-action-button"
                          onClick={() => setSelectedEmployeeId(employee.id)}
                        >
                          <FiEye />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="manager-table-empty">Không tìm thấy nhân viên phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EmployeeDetailPanel
        employee={selectedEmployee}
        departments={departments}
        timesheets={recentTimesheets}
        leaveRequests={recentLeaves}
      />
    </section>
  );
}

function EmployeeDetailPanel({ employee, departments, timesheets, leaveRequests }) {
  if (!employee) {
    return (
      <section className="dashboard-panel employee-section__panel">
        <div className="timesheet-empty-state">Chưa chọn nhân viên để xem chi tiết.</div>
      </section>
    );
  }

  return (
    <section className="dashboard-panel employee-section__panel">
      <div className="profile-header manager-profile-header">
        <div className="profile-avatar">{getInitials(employee.fullName)}</div>
        <div>
          <h2>{employee.fullName}</h2>
          <p>{employee.title} | {getDepartmentName(departments, employee.departmentId)}</p>
          <div className={`dashboard-status-badge ${getStatusClass(employee.status)}`}>
            {employee.status}
          </div>
        </div>
      </div>

      <div className="employee-info-grid manager-employee-detail-grid">
        <div className="employee-info-card">
          <span>Email</span>
          <strong>{employee.email}</strong>
        </div>
        <div className="employee-info-card">
          <span>Số điện thoại</span>
          <strong>{employee.phone}</strong>
        </div>
        <InfoItem label="Phòng ban" value={getDepartmentName(departments, employee.departmentId)} />
        <InfoItem label="Chức vụ" value={employee.title} />
        <InfoItem label="Trạng thái" value={employee.status} />
        <InfoItem label="Số dư phép" value={`${employee.leaveBalance} ngày`} />
        <InfoItem label="Tổng giờ tháng này" value={formatHoursValue(employee.monthlyHours)} />
        <InfoItem label="Địa điểm" value={employee.location} />
      </div>

      <div className="manager-detail-section">
        <h3>Lịch sử chấm công gần đây</h3>
        <div className="dashboard-list">
          {timesheets.length > 0 ? (
            timesheets.map((timesheet) => (
              <div key={timesheet.id} className="dashboard-list__item">
                <div>
                  <strong>{formatDate(timesheet.workDate)}</strong>
                  <span>{timesheet.checkIn || '--'} - {timesheet.checkOut || '--'} | {formatHoursValue(timesheet.totalHours)}</span>
                </div>
                <div className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>
                  {timesheet.status}
                </div>
              </div>
            ))
          ) : (
            <div className="timesheet-empty-state">Chưa có lịch sử chấm công gần đây.</div>
          )}
        </div>
      </div>

      <div className="manager-detail-section">
        <h3>Lịch sử đơn nghỉ phép gần đây</h3>
        <div className="dashboard-list">
          {leaveRequests.length > 0 ? (
            leaveRequests.map((request) => (
              <div key={request.id} className="dashboard-list__item">
                <div>
                  <strong>{request.type}</strong>
                  <span>{formatDate(request.startDate)} - {formatDate(request.endDate)} | {request.totalDays} ngày</span>
                </div>
                <div className={`dashboard-status-badge ${getStatusClass(request.status)}`}>
                  {request.status}
                </div>
              </div>
            ))
          ) : (
            <div className="timesheet-empty-state">Chưa có lịch sử đơn nghỉ phép gần đây.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function ManagerTimesheetReport({ timesheets, employees, departments, feedback, onFeedback }) {
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);

  const previewRows = useMemo(() => {
    return timesheets
      .filter((timesheet) => {
        const employee = getEmployeeById(employees, timesheet.employeeId);
        const matchesDate =
          (!filters.fromDate || timesheet.workDate >= filters.fromDate) &&
          (!filters.toDate || timesheet.workDate <= filters.toDate);
        const matchesEmployee = filters.employeeId === 'all' || timesheet.employeeId === filters.employeeId;
        const matchesDepartment = filters.departmentId === 'all' || employee?.departmentId === filters.departmentId;
        const matchesStatus = filters.status === 'all' || timesheet.status === filters.status;

        return matchesDate && matchesEmployee && matchesDepartment && matchesStatus;
      })
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
  }, [employees, filters, timesheets]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleExport = () => {
    if (previewRows.length === 0) {
      onFeedback('danger', 'Không có dữ liệu để xuất.');
      return;
    }

    if (filters.exportFormat === 'PDF') {
      onFeedback('info', 'Chức năng PDF đang được mô phỏng.');
      return;
    }

    exportCsv(previewRows, employees, departments, filters);
    onFeedback('success', `Đã xuất ${previewRows.length} dòng dữ liệu timesheet dạng CSV.`);
  };

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-09</span>
          <h1>Báo cáo timesheet</h1>
          <p>Lọc và xuất dữ liệu timesheet trong phạm vi nhóm/phòng ban được quản lý.</p>
        </div>
      </div>

      <ManagerFeedback feedback={feedback} />

      <section className="dashboard-panel">
        <div className="timesheet-filter-bar manager-report-filter">
          <label htmlFor="report-from-date">
            <span>Từ ngày</span>
            <input
              id="report-from-date"
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleChange}
            />
          </label>
          <label htmlFor="report-to-date">
            <span>Đến ngày</span>
            <input
              id="report-to-date"
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleChange}
            />
          </label>
          <label htmlFor="report-employee">
            <span>Nhân viên</span>
            <select
              id="report-employee"
              name="employeeId"
              value={filters.employeeId}
              onChange={handleChange}
            >
              <option value="all">Tất cả nhân viên</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="report-department">
            <span>Phòng ban</span>
            <select
              id="report-department"
              name="departmentId"
              value={filters.departmentId}
              onChange={handleChange}
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="report-status">
            <span>Trạng thái timesheet</span>
            <select
              id="report-status"
              name="status"
              value={filters.status}
              onChange={handleChange}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
          <label htmlFor="report-format">
            <span>Định dạng xuất</span>
            <select
              id="report-format"
              name="exportFormat"
              value={filters.exportFormat}
              onChange={handleChange}
            >
              <option value="Excel">Excel/CSV</option>
              <option value="PDF">PDF</option>
            </select>
          </label>
          <div className="timesheet-filter-bar__actions">
            <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport}>
              <FiDownload />
              Xuất báo cáo
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-panel manager-table-panel">
        <div className="dashboard-panel__heading">
          <div>
            <span className="dashboard-panel__eyebrow">Preview</span>
            <h2>Dữ liệu sau khi lọc</h2>
          </div>
        </div>

        <div className="table-scroll">
          <table className="manager-table manager-table--reports manager-table-carded">
            <thead>
              <tr>
                <th>Mã bảng công</th>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Ngày</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Tổng giờ</th>
                <th>Trạng thái</th>
                <th>Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length > 0 ? (
                previewRows.map((timesheet) => {
                  const employee = getEmployeeById(employees, timesheet.employeeId);

                  return (
                    <tr key={timesheet.id}>
                      <td data-label="Mã bảng công" className="cell-nowrap"><strong>{timesheet.code}</strong></td>
                      <td data-label="Nhân viên">{employee?.fullName || '--'}</td>
                      <td data-label="Phòng ban">{getDepartmentName(departments, employee?.departmentId)}</td>
                      <td data-label="Ngày" className="cell-nowrap">{formatDate(timesheet.workDate)}</td>
                      <td data-label="Check-in" className="cell-nowrap">{timesheet.checkIn || '--'}</td>
                      <td data-label="Check-out" className="cell-nowrap">{timesheet.checkOut || '--'}</td>
                      <td data-label="Tổng giờ" className="cell-nowrap"><strong>{formatHoursValue(timesheet.totalHours)}</strong></td>
                      <td data-label="Trạng thái" className="cell-nowrap">
                        <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>
                          {timesheet.status}
                        </span>
                      </td>
                      <td data-label="Cảnh báo">
                        <WarningList warnings={timesheet.warnings} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="manager-table-empty">Không có dữ liệu để xuất.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ManagerDetailModal({ detail, timesheets, leaveRequests, employees, departments, onClose }) {
  if (!detail) {
    return null;
  }

  if (detail.type === 'timesheet') {
    const timesheet = timesheets.find((item) => item.id === detail.id);
    const employee = timesheet ? getEmployeeById(employees, timesheet.employeeId) : null;

    if (!timesheet) {
      return null;
    }

    return (
      <ModalShell title={`Chi tiết bảng công ${timesheet.code}`} onClose={onClose}>
        <div className="employee-info-grid">
          <InfoItem label="Nhân viên" value={employee?.fullName || '--'} />
          <InfoItem label="Email" value={employee?.email || '--'} />
          <InfoItem label="Phòng ban" value={getDepartmentName(departments, timesheet.departmentId)} />
          <InfoItem label="Ngày/kỳ công" value={timesheet.periodLabel} />
          <InfoItem label="Check-in" value={timesheet.checkIn || '--'} />
          <InfoItem label="Check-out" value={timesheet.checkOut || '--'} />
          <InfoItem label="Tổng giờ làm" value={formatHoursValue(timesheet.totalHours)} />
          <InfoItem label="Khóa chỉnh sửa" value={timesheet.locked ? 'Đã khóa' : 'Chưa khóa'} />
        </div>
        <div className="manager-detail-section">
          <h3>Trạng thái và cảnh báo</h3>
          <div className="manager-modal-row">
            <div className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>
              {timesheet.status}
            </div>
            <WarningList warnings={timesheet.warnings} />
          </div>
          {timesheet.rejectionReason ? (
            <p className="manager-modal-note">Lý do từ chối: {timesheet.rejectionReason}</p>
          ) : null}
        </div>
      </ModalShell>
    );
  }

  const request = leaveRequests.find((item) => item.id === detail.id);
  const employee = request ? getEmployeeById(employees, request.employeeId) : null;

  if (!request) {
    return null;
  }

  return (
    <ModalShell title={`Chi tiết đơn nghỉ ${request.code}`} onClose={onClose}>
      <div className="employee-info-grid">
        <InfoItem label="Nhân viên" value={employee?.fullName || '--'} />
        <InfoItem label="Loại nghỉ" value={request.type} />
        <InfoItem label="Ngày bắt đầu" value={formatDate(request.startDate)} />
        <InfoItem label="Ngày kết thúc" value={formatDate(request.endDate)} />
        <InfoItem label="Số ngày nghỉ" value={`${request.totalDays} ngày`} />
        <InfoItem label="Số dư phép hiện tại" value={`${employee?.leaveBalance ?? 0} ngày`} />
      </div>
      <div className="manager-detail-section">
        <h3>Lý do</h3>
        <p className="manager-modal-note">{request.reason}</p>
        <div className={`dashboard-status-badge ${getStatusClass(request.status)}`}>
          {request.status}
        </div>
        {request.rejectionReason ? (
          <p className="manager-modal-note">Lý do từ chối: {request.rejectionReason}</p>
        ) : null}
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <article className="modal-card manager-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="manager-modal__header">
          <h2>{title}</h2>
          <button type="button" className="manager-modal__close" onClick={onClose} aria-label="Đóng">
            <FiX />
          </button>
        </div>
        {children}
      </article>
    </div>
  );
}

function RejectDialog({ dialog, timesheets, leaveRequests, onChange, onClose, onSubmit }) {
  if (!dialog) {
    return null;
  }

  const item =
    dialog.type === 'timesheet'
      ? timesheets.find((timesheet) => timesheet.id === dialog.id)
      : leaveRequests.find((request) => request.id === dialog.id);
  const code = item?.code || '';

  return (
    <ModalShell title={`Từ chối ${dialog.type === 'timesheet' ? 'bảng công' : 'đơn nghỉ phép'} ${code}`} onClose={onClose}>
      <form
        className="correction-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="manager-reject-reason">
          <span>Lý do từ chối</span>
          <textarea
            id="manager-reject-reason"
            rows="5"
            value={dialog.reason}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Nhập lý do để nhân viên có thể điều chỉnh hoặc bổ sung thông tin..."
            autoFocus
          />
          {dialog.error ? <small>{dialog.error}</small> : null}
        </label>
        <div className="dashboard-panel__actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="dashboard-button manager-button--reject">
            <FiXCircle />
            Xác nhận từ chối
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ManagerFeedback({ feedback }) {
  if (!feedback) {
    return null;
  }

  return (
    <div className={`submit-timesheet-panel__helper manager-feedback is-${feedback.type}`}>
      {feedback.message}
    </div>
  );
}

function WarningList({ warnings = [] }) {
  if (!warnings.length) {
    return <span className="manager-muted">Không có</span>;
  }

  return (
    <div className="manager-warning-list">
      {warnings.map((warning) => (
        <span
          key={`${warning.code}-${warning.label}`}
          className={`warning-badge ${warning.tone === 'danger' ? 'warning-badge--danger' : 'warning-badge--warning'}`}
        >
          {warning.label}
        </span>
      ))}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="employee-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildCurrentManager(session) {
  const sessionManagedEmployeeIds = Array.isArray(session?.managedEmployeeIds)
    ? session.managedEmployeeIds
    : [];

  return {
    ...mockCurrentUser,
    ...session,
    id: session?.id || mockCurrentUser.id,
    role: 'manager',
    departmentId: session?.departmentId || mockCurrentUser.departmentId,
    managedEmployeeIds: sessionManagedEmployeeIds.length
      ? sessionManagedEmployeeIds
      : mockCurrentUser.managedEmployeeIds,
  };
}

function getScopedEmployees(employees, currentManager) {
  const managedIds = currentManager.managedEmployeeIds || [];

  if (managedIds.length > 0) {
    return employees.filter((employee) => managedIds.includes(employee.id));
  }

  return employees.filter((employee) => employee.departmentId === currentManager.departmentId);
}

function isTimesheetReviewable(timesheet) {
  return REVIEWABLE_TIMESHEET_STATUSES.includes(timesheet.status);
}

function sortPendingFirst(a, b) {
  const aPending = isTimesheetReviewable(a) ? 0 : 1;
  const bPending = isTimesheetReviewable(b) ? 0 : 1;

  if (aPending !== bPending) {
    return aPending - bPending;
  }

  return b.workDate.localeCompare(a.workDate);
}

function sortLeavePendingFirst(a, b) {
  const aPending = a.status === 'Pending' ? 0 : 1;
  const bPending = b.status === 'Pending' ? 0 : 1;

  if (aPending !== bPending) {
    return aPending - bPending;
  }

  return b.startDate.localeCompare(a.startDate);
}

function getEmployeeById(employees, employeeId) {
  return employees.find((employee) => employee.id === employeeId) || null;
}

function getEmployeeName(employees, employeeId) {
  return getEmployeeById(employees, employeeId)?.fullName || 'Không xác định';
}

function getDepartmentName(departments, departmentId) {
  return departments.find((department) => department.id === departmentId)?.name || '--';
}

function getStatusClass(status) {
  switch (status) {
    case 'Approved':
    case 'Active':
      return 'dashboard-status-badge--success';
    case 'Pending':
    case 'Submitted':
      return 'dashboard-status-badge--warning';
    case 'Rejected':
    case 'Missing Out':
      return 'dashboard-status-badge--danger';
    default:
      return 'dashboard-status-badge--neutral';
  }
}

function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatHoursValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '--';
  }

  return `${roundNumber(numericValue)}h`;
}

function roundNumber(value) {
  return Math.round(value * 10) / 10;
}

function cloneTimesheet(timesheet) {
  return {
    ...timesheet,
    warnings: [...(timesheet.warnings || [])],
  };
}

function exportCsv(rows, employees, departments, filters) {
  const headers = [
    'Ma bang cong',
    'Nhan vien',
    'Phong ban',
    'Ngay',
    'Check-in',
    'Check-out',
    'Tong gio',
    'Trang thai',
    'Canh bao',
  ];

  const csvRows = rows.map((timesheet) => {
    const employee = getEmployeeById(employees, timesheet.employeeId);

    return [
      timesheet.code,
      employee?.fullName || '',
      getDepartmentName(departments, employee?.departmentId),
      formatDate(timesheet.workDate),
      timesheet.checkIn || '',
      timesheet.checkOut || '',
      roundNumber(timesheet.totalHours),
      timesheet.status,
      (timesheet.warnings || []).map((warning) => warning.label).join('; '),
    ];
  });

  const csvContent = [headers, ...csvRows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timesheet-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const normalizedValue = String(value ?? '');

  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replaceAll('"', '""')}"`;
  }

  return normalizedValue;
}

export default ManagerDashboard;
