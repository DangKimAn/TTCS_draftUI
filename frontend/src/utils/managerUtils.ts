import { formatDate } from './dateUtils';
import { currentUser as mockCurrentUser } from '../data/mockData';
import { API_CONFIG } from '../config/api';

export const REVIEWABLE_TIMESHEET_STATUSES = ['Submitted', 'Pending'];

export function mergeEmployees(currentEmployees: any[], nextEmployees: any[]) {
  const employeeMap = new Map();

  currentEmployees.forEach((employee) => {
    if (employee?.id) {
      employeeMap.set(employee.id, employee);
    }
  });

  nextEmployees.forEach((employee) => {
    if (!employee?.id) {
      return;
    }

    employeeMap.set(employee.id, {
      ...employeeMap.get(employee.id),
      ...employee,
    });
  });

  return [...employeeMap.values()];
}

export function buildEmployeeFromLeaveRequest(request: any) {
  const sender = request.sender || {};
  const id = request.employeeId || sender.userID || sender.id;

  if (!id) {
    return null;
  }

  const fullName =
    request.employeeName ||
    sender.fullName ||
    sender.name ||
    sender.username ||
    sender.email ||
    id;
  const departmentId = request.departmentId || sender.departmentID || sender.departmentId || '';

  return {
    id,
    employeeCode: id ? `EMP-${String(id).slice(0, 8)}` : 'EMP',
    fullName,
    email: request.employeeEmail || sender.email || '',
    departmentId,
    departmentName: sender.departmentName || '',
    title: 'Nhan vien',
    role: 'employee',
    status: sender.isActive === false ? 'Inactive' : 'Active',
    isActive: sender.isActive !== false,
    leaveBalance: Number(request.leaveBalance ?? sender.remainDaysofLeave ?? 0),
    monthlyHours: 0,
    salaryCoefficient: Number(sender.salaryCoefficient || 0),
    phone: sender.phone || '',
    location: sender.location || '',
    startedAt: sender.startedAt || '',
    profileStatus: 'verified',
  };
}

export function buildEmployeeFromCorrectionRequest(request: any) {
  const employee = request.employee || {};
  const id = employee.userID || request.userID || '';

  if (!id) {
    return null;
  }

  return {
    id,
    employeeCode: `EMP-${String(id).slice(0, 8)}`,
    fullName: employee.fullName || employee.name || employee.username || employee.email || id,
    email: employee.email || request.userEmail || '',
    departmentId: employee.departmentID || employee.departmentId || '',
    departmentName: employee.departmentName || '',
    title: 'Nhan vien',
    role: 'employee',
    status: employee.isActive === false ? 'Inactive' : 'Active',
    isActive: employee.isActive !== false,
    leaveBalance: Number(employee.remainDaysofLeave || 0),
    monthlyHours: 0,
    salaryCoefficient: Number(employee.salaryCoefficient || 0),
    phone: '',
    location: '',
    startedAt: '',
    profileStatus: 'verified',
  };
}

export function buildCurrentManager(session: any) {
  const sessionManagedEmployeeIds = Array.isArray(session?.managedEmployeeIds)
    ? session.managedEmployeeIds
    : [];
  const fallbackManager = API_CONFIG.ENABLE_MOCK_FALLBACK
    ? mockCurrentUser
    : {
        id: '',
        departmentId: '',
        managedEmployeeIds: [],
      };

  return {
    ...fallbackManager,
    ...session,
    id: session?.id || fallbackManager.id,
    role: 'manager',
    departmentId: session?.departmentId || fallbackManager.departmentId,
    managedEmployeeIds: session
      ? sessionManagedEmployeeIds
      : fallbackManager.managedEmployeeIds,
  };
}

export function getScopedEmployees(employees: any[], currentManager: any) {
  const managedIds = currentManager.managedEmployeeIds || [];

  if (managedIds.length > 0) {
    const managedEmployees = employees.filter((employee) => managedIds.includes(employee.id));

    if (managedEmployees.length > 0) {
      return managedEmployees;
    }
  }

  const departmentEmployees = employees.filter((employee) => employee.departmentId === currentManager.departmentId);

  return departmentEmployees.length > 0 ? departmentEmployees : employees;
}

export function isTimesheetReviewable(timesheet: any) {
  return REVIEWABLE_TIMESHEET_STATUSES.includes(timesheet.status);
}

export function getEmployeeById(employees: any[], employeeId: string) {
  return employees.find((employee) => employee.id === employeeId) || null;
}

export function getDepartmentName(departments: any[], departmentId: string) {
  return departments.find((department) => department.id === departmentId)?.name || '--';
}

export function roundNumber(value: number) {
  return Math.round(value * 10) / 10;
}

export function cloneTimesheet(timesheet: any) {
  return {
    ...timesheet,
    warnings: [...(timesheet.warnings || [])],
  };
}

export function exportCsv(rows: any[], employees: any[], departments: any[], filters: any) {
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
      (timesheet.warnings || []).map((warning: any) => warning.label).join('; '),
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

function escapeCsvValue(value: any) {
  const normalizedValue = String(value ?? '');

  if (/[",\n]/.test(normalizedValue)) {
    return `"${normalizedValue.replaceAll('"', '""')}"`;
  }

  return normalizedValue;
}
