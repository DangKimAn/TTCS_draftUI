import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiPlus,
  FiPower,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_HR_SECTION,
  getHrSectionHref,
  isValidHrSection,
  normalizeHrSection,
} from '../config/hrMenu';
import {
  currentHrUser as mockCurrentHrUser,
  departments as mockDepartments,
  employees as mockEmployees,
  leaveRequests as mockLeaveRequests,
  leaveTypes as mockLeaveTypes,
  payrollReports as mockPayrollReports,
  timesheets as mockTimesheets,
} from '../data/mockData';
import { formatDate } from '../utils/dateUtils';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './EmployeeDashboard.css';
import '../styles/timesheet.css';
import '../styles/hr.css';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const currentYear = 2026;

const emptyEmployeeForm = {
  fullName: '',
  email: '',
  departmentId: '',
  title: '',
  role: 'employee',
  salaryCoefficient: '2.0',
  leaveBalance: '12',
  status: 'Active',
};

const emptyLeaveTypeForm = {
  code: '',
  name: '',
  isPaid: true,
  defaultDaysPerYear: '0',
  note: '',
  status: 'Active',
};

function HRDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(DEFAULT_HR_SECTION);
  const [employees, setEmployees] = useState(() => mockEmployees.map((employee) => ({ ...employee })));
  const [leaveTypes, setLeaveTypes] = useState(() => mockLeaveTypes.map((type) => ({ ...type })));
  const [feedback, setFeedback] = useState(null);
  const [employeeModal, setEmployeeModal] = useState(null);
  const [confirmEmployee, setConfirmEmployee] = useState(null);
  const [policyModal, setPolicyModal] = useState(null);

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'hr') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  useEffect(() => {
    const nextSection = searchParams.get('section') || DEFAULT_HR_SECTION;

    if (!isValidHrSection(nextSection)) {
      setSearchParams({}, { replace: true });
      setSection(DEFAULT_HR_SECTION);
      return;
    }

    setSection(normalizeHrSection(nextSection));
  }, [searchParams, setSearchParams]);

  const currentHr = useMemo(() => buildCurrentHr(session), [session]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const handleSaveEmployee = (form, mode, employeeId) => {
    const validationErrors = validateEmployeeForm(form, employees, employeeId);

    if (Object.keys(validationErrors).length > 0) {
      return validationErrors;
    }

    if (mode === 'edit') {
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === employeeId
            ? {
                ...employee,
                fullName: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                departmentId: form.departmentId,
                title: form.title.trim(),
                role: form.role,
                salaryCoefficient: Number(form.salaryCoefficient),
                leaveBalance: Number(form.leaveBalance),
                status: form.status,
                isActive: form.status === 'Active',
              }
            : employee,
        ),
      );
      showFeedback('success', 'Đã cập nhật thông tin nhân viên.');
      setEmployeeModal(null);
      return {};
    }

    const newEmployee = {
      id: `emp-${String(employees.length + 1).padStart(3, '0')}`,
      employeeCode: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      departmentId: form.departmentId,
      title: form.title.trim(),
      role: form.role,
      status: 'Active',
      isActive: true,
      leaveBalance: Number(form.leaveBalance || 12),
      monthlyHours: 0,
      salaryCoefficient: Number(form.salaryCoefficient),
      phone: '--',
      location: '--',
      startedAt: new Date().toISOString().slice(0, 10),
      profileStatus: 'new-review',
    };

    setEmployees((current) => [newEmployee, ...current]);
    showFeedback('success', `Đã tạo tài khoản nhân viên ${newEmployee.fullName}.`);
    setEmployeeModal(null);
    return {};
  };

  const handleToggleEmployee = (employee) => {
    if (employee.id === currentHr.id && employee.status === 'Active') {
      showFeedback('danger', 'HR không thể tự vô hiệu hóa chính tài khoản đang đăng nhập.');
      return;
    }

    if (employee.status === 'Inactive') {
      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                status: 'Active',
                isActive: true,
              }
            : item,
        ),
      );
      showFeedback('success', `Đã kích hoạt lại tài khoản ${employee.fullName}.`);
      return;
    }

    setConfirmEmployee(employee);
  };

  const handleConfirmDeactivate = () => {
    if (!confirmEmployee) {
      return;
    }

    setEmployees((current) =>
      current.map((employee) =>
        employee.id === confirmEmployee.id
          ? {
              ...employee,
              status: 'Inactive',
              isActive: false,
              profileStatus: 'inactive-recent',
            }
          : employee,
      ),
    );
    showFeedback('success', `Đã vô hiệu hóa tài khoản ${confirmEmployee.fullName}.`);
    setConfirmEmployee(null);
  };

  const handleSaveLeaveType = (form, mode, leaveTypeId) => {
    const validationErrors = validateLeaveTypeForm(form, leaveTypes, leaveTypeId);

    if (Object.keys(validationErrors).length > 0) {
      return validationErrors;
    }

    if (mode === 'edit') {
      setLeaveTypes((current) =>
        current.map((type) =>
          type.id === leaveTypeId
            ? {
                ...type,
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                isPaid: form.isPaid,
                defaultDaysPerYear: Number(form.defaultDaysPerYear || 0),
                note: form.note.trim(),
                status: form.status,
              }
            : type,
        ),
      );
      showFeedback('success', 'Đã cập nhật loại nghỉ phép.');
      setPolicyModal(null);
      return {};
    }

    const newType = {
      id: form.code.trim().toLowerCase().replaceAll(' ', '-'),
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      isPaid: form.isPaid,
      defaultDaysPerYear: Number(form.defaultDaysPerYear || 0),
      note: form.note.trim(),
      status: form.status,
      hasUsageHistory: false,
    };

    setLeaveTypes((current) => [newType, ...current]);
    showFeedback('success', `Đã thêm loại nghỉ ${newType.name}.`);
    setPolicyModal(null);
    return {};
  };

  const handleToggleLeaveType = (leaveType) => {
    const nextStatus = leaveType.status === 'Active' ? 'Inactive' : 'Active';
    setLeaveTypes((current) =>
      current.map((type) =>
        type.id === leaveType.id
          ? {
              ...type,
              status: nextStatus,
            }
          : type,
      ),
    );
    showFeedback(
      'success',
      nextStatus === 'Active'
        ? `Đã kích hoạt lại loại nghỉ ${leaveType.name}.`
        : `Đã vô hiệu hóa loại nghỉ ${leaveType.name}.`,
    );
  };

  const commonProps = {
    currentHr,
    employees,
    departments: mockDepartments,
    leaveTypes,
    leaveRequests: mockLeaveRequests,
    timesheets: mockTimesheets,
    payrollReports: mockPayrollReports,
    feedback,
    onFeedback: showFeedback,
  };

  return (
    <div className="dashboard-page employee-workspace-page hr-workspace-page">
      <HRContentRouter
        section={section}
        commonProps={commonProps}
        onNavigate={(sectionKey) => navigate(getHrSectionHref(sectionKey))}
        onOpenEmployeeModal={setEmployeeModal}
        onToggleEmployee={handleToggleEmployee}
        onOpenPolicyModal={setPolicyModal}
        onToggleLeaveType={handleToggleLeaveType}
      />

      <EmployeeModal
        modal={employeeModal}
        employees={employees}
        departments={mockDepartments}
        leaveRequests={mockLeaveRequests}
        timesheets={mockTimesheets}
        onClose={() => setEmployeeModal(null)}
        onSave={handleSaveEmployee}
      />

      <ConfirmModal
        employee={confirmEmployee}
        onClose={() => setConfirmEmployee(null)}
        onConfirm={handleConfirmDeactivate}
      />

      <LeaveTypeModal
        modal={policyModal}
        leaveTypes={leaveTypes}
        onClose={() => setPolicyModal(null)}
        onSave={handleSaveLeaveType}
      />
    </div>
  );
}

function HRContentRouter({
  section,
  commonProps,
  onNavigate,
  onOpenEmployeeModal,
  onToggleEmployee,
  onOpenPolicyModal,
  onToggleLeaveType,
}) {
  switch (section) {
    case 'employees':
      return (
        <HREmployees
          {...commonProps}
          onOpenEmployeeModal={onOpenEmployeeModal}
          onToggleEmployee={onToggleEmployee}
        />
      );
    case 'reports':
      return <HRReports {...commonProps} />;
    case 'policies':
      return (
        <HRPolicies
          {...commonProps}
          onOpenPolicyModal={onOpenPolicyModal}
          onToggleLeaveType={onToggleLeaveType}
        />
      );
    default:
      return <HROverview {...commonProps} onNavigate={onNavigate} />;
  }
}

function HROverview({
  currentHr,
  employees,
  leaveTypes,
  leaveRequests,
  timesheets,
  payrollReports,
  onNavigate,
}) {
  const activeCount = employees.filter((employee) => employee.status === 'Active').length;
  const inactiveCount = employees.filter((employee) => employee.status === 'Inactive').length;
  const activeLeaveTypes = leaveTypes.filter((type) => type.status === 'Active').length;
  const payrollReady = payrollReports.filter((report) => report.status === 'Ready').length;
  const pendingDataCount =
    timesheets.filter((timesheet) => ['Pending', 'Submitted'].includes(timesheet.status)).length +
    leaveRequests.filter((request) => request.status === 'Pending').length;
  const newProfiles = employees.filter((employee) => employee.profileStatus === 'new-review');
  const recentInactive = employees.filter((employee) => employee.profileStatus === 'inactive-recent');

  const stats = [
    { icon: FiUsers, label: 'Tổng hồ sơ nhân viên', value: employees.length, tone: 'info' },
    { icon: FiCheck, label: 'Nhân viên Active', value: activeCount, tone: 'success' },
    { icon: FiPower, label: 'Nhân viên Inactive', value: inactiveCount, tone: 'neutral' },
    { icon: FiFileText, label: 'Báo cáo lương sẵn sàng', value: payrollReady, tone: 'info' },
    { icon: FiShield, label: 'Loại nghỉ đang áp dụng', value: activeLeaveTypes, tone: 'success' },
    { icon: FiAlertTriangle, label: 'Dữ liệu còn ảnh hưởng lương', value: pendingDataCount, tone: 'warning' },
  ];

  const tasks = [
    ...newProfiles.map((employee) => ({
      id: `new-${employee.id}`,
      title: 'Nhân viên mới cần kiểm tra hồ sơ',
      meta: `${employee.fullName} | ${employee.email}`,
      section: 'employees',
      tone: 'info',
    })),
    ...recentInactive.map((employee) => ({
      id: `inactive-${employee.id}`,
      title: 'Tài khoản inactive gần đây',
      meta: `${employee.fullName} | ${employee.employeeCode}`,
      section: 'employees',
      tone: 'neutral',
    })),
    {
      id: 'payroll-current',
      title: 'Báo cáo lương tháng hiện tại',
      meta: pendingDataCount > 0 ? 'Cần kiểm tra dữ liệu chưa approved.' : 'Dữ liệu đã sẵn sàng để xuất.',
      section: 'reports',
      tone: pendingDataCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'pending-data',
      title: 'Cảnh báo timesheet/leave chưa approved',
      meta: `${pendingDataCount} bản ghi cần kiểm tra trước khi chốt lương.`,
      section: 'reports',
      tone: pendingDataCount > 0 ? 'warning' : 'success',
    },
  ].slice(0, 6);

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">HR Workspace</span>
          <h1>Tổng quan HR</h1>
          <p>{currentHr.name} đang xem dữ liệu nhân sự, chính sách và báo cáo toàn công ty.</p>
        </div>
      </div>

      <section className="hr-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className={`dashboard-stat-card hr-stat-card hr-stat-card--${stat.tone}`}>
              <div className="dashboard-stat-card__icon">
                <Icon />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </section>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Việc cần xử lý</span>
                <h2>Công việc HR cần xử lý</h2>
              </div>
              <div className="dashboard-panel__actions hr-panel-actions">
                <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => onNavigate('employees')}>
                  <FiUsers />
                  Nhân sự
                </button>
                <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => onNavigate('reports')}>
                  <FiBarChart2 />
                  Báo cáo
                </button>
                <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => onNavigate('policies')}>
                  <FiShield />
                  Chính sách
                </button>
              </div>
            </div>

            <div className="dashboard-list">
              {tasks.map((task) => (
                <div key={task.id} className="dashboard-list__item">
                  <div className="hr-task-copy">
                    <span className={`dashboard-status-badge ${getToneClass(task.tone)}`}>{task.title}</span>
                    <strong>{task.meta}</strong>
                  </div>
                  <button type="button" className="dashboard-button dashboard-button--ghost hr-small-button" onClick={() => onNavigate(task.section)}>
                    Xử lý
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Quyền HR</span>
                <h2>Phạm vi thao tác</h2>
              </div>
            </div>
            <div className="employee-info-grid employee-info-grid--single">
              <InfoItem label="Người dùng" value={currentHr.name} />
              <InfoItem label="Vai trò" value={currentHr.role} />
              <InfoItem label="Quyền" value={currentHr.permissions.join(', ')} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function HREmployees({
  currentHr,
  employees,
  departments,
  leaveRequests,
  timesheets,
  feedback,
  onOpenEmployeeModal,
  onToggleEmployee,
}) {
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        employee.fullName.toLowerCase().includes(normalizedQuery) ||
        employee.email.toLowerCase().includes(normalizedQuery);
      const matchesDepartment = departmentFilter === 'all' || employee.departmentId === departmentFilter;
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;

      return matchesQuery && matchesDepartment && matchesRole && matchesStatus;
    });
  }, [departmentFilter, employees, query, roleFilter, statusFilter]);

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-11 / UC-12</span>
          <h1>Nhân sự</h1>
          <p>Quản lý hồ sơ, tạo tài khoản và vô hiệu hóa/kích hoạt lại nhân viên toàn công ty.</p>
        </div>
        <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => onOpenEmployeeModal({ mode: 'create' })}>
          <FiPlus />
          Thêm nhân viên
        </button>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel hr-table-panel">
        <div className="hr-toolbar">
          <label className="topbar__search hr-search" htmlFor="hr-employee-search">
            <FiSearch />
            <input
              id="hr-employee-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
            />
          </label>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="all">Tất cả phòng ban</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="hr">hr</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="hr-table hr-table--employees hr-table-carded">
            <thead>
              <tr>
                <th>Mã nhân viên</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Phòng ban</th>
                <th>Chức vụ</th>
                <th>Vai trò</th>
                <th>Số dư phép</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td data-label="Mã nhân viên" className="cell-nowrap"><strong>{employee.employeeCode}</strong></td>
                    <td data-label="Họ tên"><strong>{employee.fullName}</strong></td>
                    <td data-label="Email">{employee.email}</td>
                    <td data-label="Phòng ban">{getDepartmentName(departments, employee.departmentId)}</td>
                    <td data-label="Chức vụ">{employee.title}</td>
                    <td data-label="Vai trò" className="cell-nowrap">{employee.role}</td>
                    <td data-label="Số dư phép" className="cell-nowrap">{employee.leaveBalance} ngày</td>
                    <td data-label="Trạng thái" className="cell-nowrap">
                      <span className={`dashboard-status-badge ${getStatusClass(employee.status)}`}>{employee.status}</span>
                    </td>
                    <td data-label="Hành động" className="hr-actions-cell">
                      <div className="hr-row-actions">
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => onOpenEmployeeModal({ mode: 'detail', employeeId: employee.id })}
                        >
                          <FiEye />
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => onOpenEmployeeModal({ mode: 'edit', employeeId: employee.id })}
                        >
                          <FiEdit3 />
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`dashboard-button hr-action-button ${employee.status === 'Active' ? 'hr-button--danger' : 'hr-button--success'}`}
                          onClick={() => onToggleEmployee(employee)}
                          disabled={employee.id === currentHr.id && employee.status === 'Active'}
                        >
                          {employee.status === 'Active' ? <FiPower /> : <FiRefreshCw />}
                          {employee.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="hr-table-empty">Không tìm thấy nhân viên phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function HRReports({ employees, departments, leaveTypes, leaveRequests, timesheets, feedback, onFeedback }) {
  const [activeTab, setActiveTab] = useState('payroll');

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-08 / UC-09</span>
          <h1>Báo cáo</h1>
          <p>Xuất báo cáo lương và timesheet toàn công ty bằng dữ liệu mock.</p>
        </div>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel">
        <div className="hr-tabs">
          <button type="button" className={activeTab === 'payroll' ? 'is-active' : ''} onClick={() => setActiveTab('payroll')}>
            Báo cáo lương
          </button>
          <button type="button" className={activeTab === 'timesheet' ? 'is-active' : ''} onClick={() => setActiveTab('timesheet')}>
            Báo cáo timesheet
          </button>
        </div>
      </section>

      {activeTab === 'payroll' ? (
        <PayrollReportTab
          employees={employees}
          departments={departments}
          leaveTypes={leaveTypes}
          leaveRequests={leaveRequests}
          timesheets={timesheets}
          onFeedback={onFeedback}
        />
      ) : (
        <TimesheetReportTab
          employees={employees}
          departments={departments}
          timesheets={timesheets}
          onFeedback={onFeedback}
        />
      )}
    </section>
  );
}

function PayrollReportTab({ employees, departments, leaveTypes, leaveRequests, timesheets, onFeedback }) {
  const [filters, setFilters] = useState({
    month: '5',
    year: String(currentYear),
    departmentId: 'all',
    dataStatus: 'approved',
  });

  const allRows = useMemo(() => {
    return employees
      .filter((employee) => filters.departmentId === 'all' || employee.departmentId === filters.departmentId)
      .map((employee) => buildPayrollRow(employee, departments, leaveTypes, leaveRequests, timesheets, filters));
  }, [departments, employees, filters, leaveRequests, leaveTypes, timesheets]);

  const previewRows = useMemo(
    () => allRows.filter((row) => filters.dataStatus === 'all' || row.isReady),
    [allRows, filters.dataStatus],
  );

  const hasPendingData = allRows.some((row) => !row.isReady);

  const handleExport = () => {
    if (previewRows.length === 0) {
      onFeedback('danger', 'Không có dữ liệu để xuất.');
      return;
    }

    if (previewRows.length > 50) {
      onFeedback('info', 'Báo cáo lớn, hệ thống sẽ xử lý nền và gửi link tải sau.');
      return;
    }

    exportCsv(
      `payroll-report-${filters.year}-${String(filters.month).padStart(2, '0')}.csv`,
      [
        'Ma nhan vien',
        'Ho ten',
        'Phong ban',
        'Tong gio lam',
        'Ngay nghi co luong',
        'Ngay nghi khong luong',
        'He so luong',
        'Trang thai du lieu',
      ],
      previewRows.map((row) => [
        row.employeeCode,
        row.fullName,
        row.departmentName,
        row.totalHours,
        row.paidLeaveDays,
        row.unpaidLeaveDays,
        row.salaryCoefficient,
        row.dataStatus,
      ]),
    );
    onFeedback('success', `Đã xuất ${previewRows.length} dòng báo cáo lương.`);
  };

  return (
    <>
      <section className="dashboard-panel">
        <div className="hr-report-filter">
          <label>
            <span>Tháng</span>
            <select name="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
                <option key={month} value={month}>Tháng {month.padStart(2, '0')}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Năm</span>
            <input name="year" type="number" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))} />
          </label>
          <label>
            <span>Phòng ban</span>
            <select name="departmentId" value={filters.departmentId} onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="all">Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Trạng thái dữ liệu</span>
            <select name="dataStatus" value={filters.dataStatus} onChange={(event) => setFilters((current) => ({ ...current, dataStatus: event.target.value }))}>
              <option value="approved">Chỉ Approved</option>
              <option value="all">Tất cả</option>
            </select>
          </label>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport}>
            <FiDownload />
            Xuất Excel
          </button>
        </div>
        {hasPendingData ? (
          <div className="hr-inline-alert">
            Còn dữ liệu chưa được phê duyệt, hãy kiểm tra trước khi xuất lương.
          </div>
        ) : null}
      </section>

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--payroll hr-table-carded">
            <thead>
              <tr>
                <th>Mã nhân viên</th>
                <th>Họ tên</th>
                <th>Phòng ban</th>
                <th>Tổng giờ làm</th>
                <th>Nghỉ có lương</th>
                <th>Nghỉ không lương</th>
                <th>Hệ số lương</th>
                <th>Trạng thái dữ liệu</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={row.employeeId}>
                    <td data-label="Mã nhân viên" className="cell-nowrap"><strong>{row.employeeCode}</strong></td>
                    <td data-label="Họ tên">{row.fullName}</td>
                    <td data-label="Phòng ban">{row.departmentName}</td>
                    <td data-label="Tổng giờ làm" className="cell-nowrap">{row.totalHours}h</td>
                    <td data-label="Nghỉ có lương" className="cell-nowrap">{row.paidLeaveDays} ngày</td>
                    <td data-label="Nghỉ không lương" className="cell-nowrap">{row.unpaidLeaveDays} ngày</td>
                    <td data-label="Hệ số lương" className="cell-nowrap">{row.salaryCoefficient}</td>
                    <td data-label="Trạng thái dữ liệu">
                      <span className={`dashboard-status-badge ${row.isReady ? 'dashboard-status-badge--success' : 'dashboard-status-badge--warning'}`}>
                        {row.dataStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="hr-table-empty">Không có dữ liệu để xuất.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TimesheetReportTab({ employees, departments, timesheets, onFeedback }) {
  const [filters, setFilters] = useState({
    fromDate: '2026-05-01',
    toDate: '2026-05-31',
    employeeId: 'all',
    departmentId: 'all',
    status: 'all',
    exportFormat: 'Excel',
  });

  const previewRows = useMemo(() => {
    return timesheets.filter((timesheet) => {
      const employee = getEmployeeById(employees, timesheet.employeeId);
      const matchesDate =
        (!filters.fromDate || timesheet.workDate >= filters.fromDate) &&
        (!filters.toDate || timesheet.workDate <= filters.toDate);
      const matchesEmployee = filters.employeeId === 'all' || timesheet.employeeId === filters.employeeId;
      const matchesDepartment = filters.departmentId === 'all' || employee?.departmentId === filters.departmentId;
      const matchesStatus = filters.status === 'all' || timesheet.status === filters.status;

      return matchesDate && matchesEmployee && matchesDepartment && matchesStatus;
    });
  }, [employees, filters, timesheets]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleExport = () => {
    if (previewRows.length === 0) {
      onFeedback('danger', 'Không có dữ liệu để xuất.');
      return;
    }

    if (filters.exportFormat === 'PDF') {
      onFeedback('info', 'Chức năng PDF đang được mô phỏng trong phiên bản demo.');
      return;
    }

    exportCsv(
      `timesheet-report-${filters.fromDate || 'all'}-${filters.toDate || 'all'}.csv`,
      ['Ma bang cong', 'Nhan vien', 'Phong ban', 'Ngay', 'Check-in', 'Check-out', 'Tong gio', 'Trang thai'],
      previewRows.map((timesheet) => {
        const employee = getEmployeeById(employees, timesheet.employeeId);
        return [
          timesheet.code,
          employee?.fullName || '',
          getDepartmentName(departments, employee?.departmentId),
          formatDate(timesheet.workDate),
          timesheet.checkIn || '',
          timesheet.checkOut || '',
          timesheet.totalHours,
          timesheet.status,
        ];
      }),
    );
    onFeedback('success', `Đã xuất ${previewRows.length} dòng timesheet.`);
  };

  return (
    <>
      <section className="dashboard-panel">
        <div className="hr-report-filter">
          <label>
            <span>Từ ngày</span>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} />
          </label>
          <label>
            <span>Đến ngày</span>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleChange} />
          </label>
          <label>
            <span>Nhân viên</span>
            <select name="employeeId" value={filters.employeeId} onChange={handleChange}>
              <option value="all">Tất cả nhân viên</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Phòng ban</span>
            <select name="departmentId" value={filters.departmentId} onChange={handleChange}>
              <option value="all">Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Trạng thái</span>
            <select name="status" value={filters.status} onChange={handleChange}>
              <option value="all">Tất cả trạng thái</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
          <label>
            <span>Định dạng</span>
            <select name="exportFormat" value={filters.exportFormat} onChange={handleChange}>
              <option value="Excel">Excel/CSV</option>
              <option value="PDF">PDF</option>
            </select>
          </label>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport}>
            <FiDownload />
            Xuất báo cáo
          </button>
        </div>
      </section>

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--timesheet hr-table-carded">
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
                      <td data-label="Tổng giờ" className="cell-nowrap">{timesheet.totalHours}h</td>
                      <td data-label="Trạng thái">
                        <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>{timesheet.status}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="hr-table-empty">Không có dữ liệu để xuất.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function HRPolicies({ leaveTypes, feedback, onOpenPolicyModal, onToggleLeaveType }) {
  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-10</span>
          <h1>Chính sách nghỉ phép</h1>
          <p>Quản lý loại nghỉ phép, trạng thái áp dụng và quy tắc mặc định.</p>
        </div>
        <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => onOpenPolicyModal({ mode: 'create' })}>
          <FiPlus />
          Thêm loại nghỉ
        </button>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--policies hr-table-carded">
            <thead>
              <tr>
                <th>Mã loại nghỉ</th>
                <th>Tên loại nghỉ</th>
                <th>Có lương</th>
                <th>Số ngày/năm</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map((type) => (
                <tr key={type.id}>
                  <td data-label="Mã loại nghỉ" className="cell-nowrap"><strong>{type.code}</strong></td>
                  <td data-label="Tên loại nghỉ">{type.name}</td>
                  <td data-label="Có lương">
                    <span className={`dashboard-status-badge ${type.isPaid ? 'dashboard-status-badge--success' : 'dashboard-status-badge--warning'}`}>
                      {type.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td data-label="Số ngày/năm" className="cell-nowrap">{type.defaultDaysPerYear} ngày</td>
                  <td data-label="Trạng thái">
                    <span className={`dashboard-status-badge ${getStatusClass(type.status)}`}>{type.status}</span>
                  </td>
                  <td data-label="Ghi chú">
                    <div className="hr-cell-stack">
                      <span>{type.note || '--'}</span>
                      {type.hasUsageHistory ? (
                        <small>Loại nghỉ đã có dữ liệu sử dụng, hệ thống chỉ cho phép vô hiệu hóa.</small>
                      ) : null}
                    </div>
                  </td>
                  <td data-label="Hành động" className="hr-actions-cell">
                    <div className="hr-row-actions">
                      <button
                        type="button"
                        className="dashboard-button dashboard-button--ghost hr-action-button"
                        onClick={() => onOpenPolicyModal({ mode: 'edit', leaveTypeId: type.id })}
                      >
                        <FiEdit3 />
                        Sửa
                      </button>
                      <button
                        type="button"
                        className={`dashboard-button hr-action-button ${type.status === 'Active' ? 'hr-button--danger' : 'hr-button--success'}`}
                        onClick={() => onToggleLeaveType(type)}
                      >
                        {type.status === 'Active' ? <FiPower /> : <FiRefreshCw />}
                        {type.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function EmployeeModal({ modal, employees, departments, leaveRequests, timesheets, onClose, onSave }) {
  const employee = modal?.employeeId ? getEmployeeById(employees, modal.employeeId) : null;
  const [form, setForm] = useState(emptyEmployeeForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (modal?.mode === 'edit' && employee) {
      setForm({
        fullName: employee.fullName,
        email: employee.email,
        departmentId: employee.departmentId,
        title: employee.title,
        role: employee.role,
        salaryCoefficient: String(employee.salaryCoefficient),
        leaveBalance: String(employee.leaveBalance),
        status: employee.status,
      });
    } else {
      setForm(emptyEmployeeForm);
    }
    setErrors({});
  }, [employee, modal]);

  if (!modal) {
    return null;
  }

  if (modal.mode === 'detail' && employee) {
    const recentLeaves = leaveRequests
      .filter((request) => request.employeeId === employee.id)
      .slice(0, 4);
    const recentTimesheets = timesheets
      .filter((timesheet) => timesheet.employeeId === employee.id)
      .slice(0, 4);

    return (
      <ModalShell title={`Chi tiết nhân viên ${employee.employeeCode}`} onClose={onClose}>
        <div className="employee-info-grid hr-detail-grid">
          <InfoItem label="Họ tên" value={employee.fullName} />
          <InfoItem label="Email" value={employee.email} />
          <InfoItem label="Phòng ban" value={getDepartmentName(departments, employee.departmentId)} />
          <InfoItem label="Chức vụ" value={employee.title} />
          <InfoItem label="Vai trò" value={employee.role} />
          <InfoItem label="Trạng thái" value={employee.status} />
          <InfoItem label="Số dư phép" value={`${employee.leaveBalance} ngày`} />
          <InfoItem label="Tổng giờ tháng này" value={`${employee.monthlyHours}h`} />
        </div>

        <div className="hr-modal-section">
          <h3>Lịch sử đơn nghỉ gần đây</h3>
          <div className="dashboard-list">
            {recentLeaves.length > 0 ? recentLeaves.map((request) => (
              <div key={request.id} className="dashboard-list__item">
                <div>
                  <strong>{request.type}</strong>
                  <span>{formatDate(request.startDate)} - {formatDate(request.endDate)} | {request.totalDays} ngày</span>
                </div>
                <span className={`dashboard-status-badge ${getStatusClass(request.status)}`}>{request.status}</span>
              </div>
            )) : <div className="timesheet-empty-state">Chưa có đơn nghỉ gần đây.</div>}
          </div>
        </div>

        <div className="hr-modal-section">
          <h3>Lịch sử timesheet gần đây</h3>
          <div className="dashboard-list">
            {recentTimesheets.length > 0 ? recentTimesheets.map((timesheet) => (
              <div key={timesheet.id} className="dashboard-list__item">
                <div>
                  <strong>{timesheet.code}</strong>
                  <span>{formatDate(timesheet.workDate)} | {timesheet.totalHours}h</span>
                </div>
                <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>{timesheet.status}</span>
              </div>
            )) : <div className="timesheet-empty-state">Chưa có timesheet gần đây.</div>}
          </div>
        </div>
      </ModalShell>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = onSave(form, modal.mode, modal.employeeId);
    setErrors(validationErrors);
  };

  return (
    <ModalShell title={modal.mode === 'edit' ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên'} onClose={onClose}>
      <form className="hr-form-grid" onSubmit={handleSubmit}>
        <FormField label="Họ tên" name="fullName" value={form.fullName} error={errors.fullName} onChange={handleChange} />
        <FormField label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
        <label>
          <span>Phòng ban</span>
          <select name="departmentId" value={form.departmentId} onChange={handleChange}>
            <option value="">Chọn phòng ban</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
          {errors.departmentId ? <small>{errors.departmentId}</small> : null}
        </label>
        <FormField label="Chức vụ" name="title" value={form.title} error={errors.title} onChange={handleChange} />
        <label>
          <span>Vai trò</span>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="">Chọn vai trò</option>
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="hr">hr</option>
          </select>
          {errors.role ? <small>{errors.role}</small> : null}
        </label>
        <FormField label="Hệ số lương" name="salaryCoefficient" type="number" step="0.1" value={form.salaryCoefficient} error={errors.salaryCoefficient} onChange={handleChange} />
        <FormField label="Số dư phép mặc định" name="leaveBalance" type="number" value={form.leaveBalance} error={errors.leaveBalance} onChange={handleChange} />
        <label>
          <span>Trạng thái</span>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <div className="dashboard-panel__actions hr-form-actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="dashboard-button dashboard-button--primary">
            <FiCheck />
            Lưu
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal({ employee, onClose, onConfirm }) {
  if (!employee) {
    return null;
  }

  return (
    <ModalShell title="Xác nhận vô hiệu hóa" onClose={onClose}>
      <p className="hr-modal-note">Tài khoản {employee.fullName} sẽ chuyển sang Inactive. Dữ liệu lịch sử vẫn được giữ lại.</p>
      <div className="dashboard-panel__actions hr-form-actions">
        <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Hủy</button>
        <button type="button" className="dashboard-button hr-button--danger" onClick={onConfirm}>
          <FiPower />
          Vô hiệu hóa
        </button>
      </div>
    </ModalShell>
  );
}

function LeaveTypeModal({ modal, leaveTypes, onClose, onSave }) {
  const leaveType = modal?.leaveTypeId ? leaveTypes.find((type) => type.id === modal.leaveTypeId) : null;
  const [form, setForm] = useState(emptyLeaveTypeForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (modal?.mode === 'edit' && leaveType) {
      setForm({
        code: leaveType.code,
        name: leaveType.name,
        isPaid: leaveType.isPaid,
        defaultDaysPerYear: String(leaveType.defaultDaysPerYear),
        note: leaveType.note,
        status: leaveType.status,
      });
    } else {
      setForm(emptyLeaveTypeForm);
    }
    setErrors({});
  }, [leaveType, modal]);

  if (!modal) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'isPaid' ? value === 'true' : value,
    }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = onSave(form, modal.mode, modal.leaveTypeId);
    setErrors(validationErrors);
  };

  return (
    <ModalShell title={modal.mode === 'edit' ? 'Sửa loại nghỉ phép' : 'Thêm loại nghỉ phép'} onClose={onClose}>
      {leaveType?.hasUsageHistory ? (
        <div className="hr-inline-alert">Loại nghỉ đã có dữ liệu sử dụng, hệ thống chỉ cho phép vô hiệu hóa.</div>
      ) : null}
      <form className="hr-form-grid" onSubmit={handleSubmit}>
        <FormField label="Mã loại nghỉ" name="code" value={form.code} error={errors.code} onChange={handleChange} />
        <FormField label="Tên loại nghỉ" name="name" value={form.name} error={errors.name} onChange={handleChange} />
        <label>
          <span>Có lương không</span>
          <select name="isPaid" value={String(form.isPaid)} onChange={handleChange}>
            <option value="true">Có lương</option>
            <option value="false">Không lương</option>
          </select>
        </label>
        <FormField label="Số ngày mặc định" name="defaultDaysPerYear" type="number" value={form.defaultDaysPerYear} error={errors.defaultDaysPerYear} onChange={handleChange} />
        <label>
          <span>Trạng thái</span>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <label className="hr-form-full">
          <span>Ghi chú</span>
          <textarea name="note" rows="4" value={form.note} onChange={handleChange} />
        </label>
        <div className="dashboard-panel__actions hr-form-actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="dashboard-button dashboard-button--primary">
            <FiCheck />
            Lưu
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <article className="modal-card hr-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="hr-modal__header">
          <h2>{title}</h2>
          <button type="button" className="hr-modal__close" onClick={onClose} aria-label="Đóng">
            <FiX />
          </button>
        </div>
        {children}
      </article>
    </div>
  );
}

function FormField({ label, name, type = 'text', step, value, error, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type={type} step={step} value={value} onChange={onChange} />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function HRFeedback({ feedback }) {
  if (!feedback) {
    return null;
  }

  return (
    <div className={`submit-timesheet-panel__helper hr-feedback is-${feedback.type}`}>
      {feedback.message}
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

function buildCurrentHr(session) {
  return {
    ...mockCurrentHrUser,
    ...session,
    id: session?.id || mockCurrentHrUser.id,
    role: 'hr',
    permissions: session?.permissions?.length ? session.permissions : mockCurrentHrUser.permissions,
  };
}

function validateEmployeeForm(form, employees, currentEmployeeId) {
  const errors = {};
  const normalizedEmail = form.email.trim().toLowerCase();

  if (!form.fullName.trim()) {
    errors.fullName = 'Họ tên không được trống.';
  }

  if (!normalizedEmail) {
    errors.email = 'Email không được trống.';
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.email = 'Email không đúng định dạng.';
  } else if (employees.some((employee) => employee.email.toLowerCase() === normalizedEmail && employee.id !== currentEmployeeId)) {
    errors.email = 'Email đã tồn tại trong danh sách nhân viên.';
  }

  if (!form.departmentId) {
    errors.departmentId = 'Phòng ban không được trống.';
  }

  if (!form.title.trim()) {
    errors.title = 'Chức vụ không được trống.';
  }

  if (!form.role) {
    errors.role = 'Vai trò không được trống.';
  }

  if (Number(form.salaryCoefficient) <= 0) {
    errors.salaryCoefficient = 'Hệ số lương phải lớn hơn 0.';
  }

  if (Number(form.leaveBalance) < 0) {
    errors.leaveBalance = 'Số dư phép không được âm.';
  }

  return errors;
}

function validateLeaveTypeForm(form, leaveTypes, currentLeaveTypeId) {
  const errors = {};
  const normalizedCode = form.code.trim().toUpperCase();

  if (!normalizedCode) {
    errors.code = 'Mã loại nghỉ không được trống.';
  } else if (leaveTypes.some((type) => type.code.toUpperCase() === normalizedCode && type.id !== currentLeaveTypeId)) {
    errors.code = 'Mã loại nghỉ không được trùng.';
  }

  if (!form.name.trim()) {
    errors.name = 'Tên loại nghỉ không được trống.';
  }

  if (Number(form.defaultDaysPerYear) < 0) {
    errors.defaultDaysPerYear = 'Số ngày mặc định không được âm.';
  }

  return errors;
}

function buildPayrollRow(employee, departments, leaveTypes, leaveRequests, timesheets, filters) {
  const periodPrefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
  const employeeTimesheets = timesheets.filter(
    (timesheet) => timesheet.employeeId === employee.id && timesheet.workDate.startsWith(periodPrefix),
  );
  const employeeLeaves = leaveRequests.filter(
    (request) => request.employeeId === employee.id && request.startDate.startsWith(periodPrefix),
  );
  const hasPendingTimesheet = employeeTimesheets.some((timesheet) => ['Pending', 'Submitted'].includes(timesheet.status));
  const hasPendingLeave = employeeLeaves.some((request) => request.status === 'Pending');
  const approvedLeaves = employeeLeaves.filter((request) => request.status === 'Approved');
  const paidLeaveDays = approvedLeaves.reduce((total, request) => {
    const leaveType = leaveTypes.find((type) => type.id === request.leaveTypeId);
    return total + (leaveType?.isPaid ? request.totalDays : 0);
  }, 0);
  const unpaidLeaveDays = approvedLeaves.reduce((total, request) => {
    const leaveType = leaveTypes.find((type) => type.id === request.leaveTypeId);
    return total + (!leaveType?.isPaid ? request.totalDays : 0);
  }, 0);
  const totalHours = employeeTimesheets
    .filter((timesheet) => filters.dataStatus === 'all' || timesheet.status === 'Approved')
    .reduce((total, timesheet) => total + Number(timesheet.totalHours || 0), 0);
  const isReady = !hasPendingTimesheet && !hasPendingLeave;

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    departmentName: getDepartmentName(departments, employee.departmentId),
    totalHours: roundNumber(totalHours),
    paidLeaveDays,
    unpaidLeaveDays,
    salaryCoefficient: employee.salaryCoefficient,
    isReady,
    dataStatus: isReady ? 'Sẵn sàng xuất lương' : 'Còn dữ liệu chưa duyệt',
  };
}

function getEmployeeById(employees, employeeId) {
  return employees.find((employee) => employee.id === employeeId) || null;
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
      return 'dashboard-status-badge--danger';
    case 'Inactive':
      return 'dashboard-status-badge--neutral';
    default:
      return 'dashboard-status-badge--neutral';
  }
}

function getToneClass(tone) {
  switch (tone) {
    case 'success':
      return 'dashboard-status-badge--success';
    case 'warning':
      return 'dashboard-status-badge--warning';
    case 'info':
      return 'dashboard-status-badge--info';
    default:
      return 'dashboard-status-badge--neutral';
  }
}

function roundNumber(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function exportCsv(fileName, headers, rows) {
  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
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

export default HRDashboard;
