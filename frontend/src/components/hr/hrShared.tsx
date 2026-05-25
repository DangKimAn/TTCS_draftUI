import { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';

export const currentYear = 2026;

export const emptyEmployeeForm = {
  fullName: '',
  email: '',
  password: '',
  departmentId: '',
  title: '',
  role: 'employee',
  salaryCoefficient: '2.0',
  leaveBalance: '12',
  status: 'Active',
};

export const emptyLeaveTypeForm = {
  code: '',
  name: '',
  isPaid: true,
  defaultDaysPerYear: '0',
  note: '',
  status: 'Active',
};

export type EmployeeForm = typeof emptyEmployeeForm;
export type LeaveTypeForm = typeof emptyLeaveTypeForm;
export type FormErrors = Record<string, string>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
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

export function FormField({
  label,
  name,
  type = 'text',
  step = undefined,
  value,
  error,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  value: string;
  error?: string;
  onChange: (event: any) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type={type} step={step} value={value} onChange={onChange} />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

export function HRFeedback({ feedback }: { feedback: { type: string; message: string } | null }) {
  if (!feedback) {
    return null;
  }

  return (
    <div className={`submit-timesheet-panel__helper hr-feedback is-${feedback.type}`}>
      {feedback.message}
    </div>
  );
}

export function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="employee-info-card" style={{ minWidth: 0 }}>
      <span>{label}</span>
      <strong className="truncate" title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</strong>
    </div>
  );
}

export function validateEmployeeForm(
  form: EmployeeForm,
  employees: Array<Record<string, any>>,
  currentEmployeeId?: string,
  options: { requirePassword?: boolean } = {},
) {
  const errors: FormErrors = {};
  const normalizedEmail = form.email.trim().toLowerCase();

  if (!form.fullName.trim()) {
    errors.fullName = 'Họ tên không được trống.';
  }

  if (!normalizedEmail) {
    errors.email = 'Email không được trống.';
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.email = 'Email không đúng định dạng.';
  } else if (
    employees.some((employee) => employee.email?.toLowerCase() === normalizedEmail && employee.id !== currentEmployeeId)
  ) {
    errors.email = 'Email đã tồn tại trong danh sách nhân viên.';
  }

  if (options.requirePassword && !form.password.trim()) {
    errors.password = 'Mật khẩu tạm thời không được trống.';
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
    errors.leaveBalance = 'Số ngày phép còn lại không được âm.';
  }

  return errors;
}

export function validateLeaveTypeForm(
  form: LeaveTypeForm,
  leaveTypes: Array<Record<string, any>>,
  currentLeaveTypeId?: string,
) {
  const errors: FormErrors = {};
  const normalizedCode = form.code.trim().toUpperCase();

  if (!normalizedCode) {
    errors.code = 'Mã loại nghỉ không được trống.';
  } else if (
    leaveTypes.some((type) => type.code?.toUpperCase() === normalizedCode && type.id !== currentLeaveTypeId)
  ) {
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

export function buildPayrollRow(
  employee: Record<string, any>,
  departments: Array<Record<string, any>>,
  leaveTypes: Array<Record<string, any>>,
  leaveRequests: Array<Record<string, any>>,
  timesheets: Array<Record<string, any>>,
  filters: Record<string, any>,
) {
  const periodPrefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
  const employeeTimesheets = timesheets.filter(
    (timesheet) => timesheet.employeeId === employee.id && String(timesheet.workDate || '').startsWith(periodPrefix),
  );
  const employeeLeaves = leaveRequests.filter(
    (request) => request.employeeId === employee.id && String(request.startDate || '').startsWith(periodPrefix),
  );
  const hasPendingTimesheet = employeeTimesheets.some((timesheet) =>
    ['Pending', 'Submitted'].includes(timesheet.status),
  );
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

export function getEmployeeById(employees: Array<Record<string, any>>, employeeId?: string) {
  return employees.find((employee) => employee.id === employeeId) || null;
}

export function getDepartmentName(departments: Array<Record<string, any>>, departmentId?: string) {
  const department = departments.find((item) => item.id === departmentId || item.departmentID === departmentId);
  return department?.name || department?.departmentName || '--';
}

export function getStatusClass(status?: string) {
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

export function formatHrRole(role?: string) {
  switch (String(role || '').toLowerCase()) {
    case 'manager':
      return 'Quản lý';
    case 'admin':
    case 'hr':
      return 'Quản trị nhân sự';
    case 'employee':
      return 'Nhân viên';
    default:
      return role || '--';
  }
}

export function formatHrStatus(status?: string) {
  switch (status) {
    case 'Active':
      return 'Đang hoạt động';
    case 'Inactive':
      return 'Ngừng hoạt động';
    case 'Pending':
      return 'Chờ duyệt';
    case 'Submitted':
      return 'Đã gửi';
    case 'Approved':
      return 'Đã duyệt';
    case 'Rejected':
      return 'Từ chối';
    case 'Ready':
      return 'Sẵn sàng';
    default:
      return status || '--';
  }
}

export function getToneClass(tone?: string) {
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

export function roundNumber(value: unknown) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function formatRange(startDate?: string, endDate?: string) {
  return `${formatDate(startDate || '')} - ${formatDate(endDate || '')}`;
}

