export type Role = 'employee' | 'manager' | 'hr' | 'admin' | 'unknown';

export type AttendanceStatus = 'Not Started' | 'Working' | 'Completed' | 'Missing Out';

export type RequestStatus = 'Draft' | 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string;
  managedEmployeeIds?: string[];
  permissions?: string[];
  isActive: boolean;
  avatar?: string;
}

export interface AuthSession {
  token: string;
  accessToken: string;
  refreshToken: string;
  id: string;
  userID: string;
  email: string;
  name: string;
  role: Role;
  roleId?: string | null;
  departmentId: string;
  managedEmployeeIds: string[];
  permissions: string[];
  isActive: boolean;
  provider: string;
  loggedInAt: string;
  avatar?: string;
}

export interface Attendance {
  id: string;
  userEmail: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number | null;
  status: AttendanceStatus;
  serverTimeAtCheckIn: string | null;
  serverTimeAtCheckOut: string | null;
  ipAddressAtCheckIn: string | null;
  ipAddressAtCheckOut: string | null;
  deviceInfoAtCheckIn: string | null;
  deviceInfoAtCheckOut: string | null;
  hasIpWarning: boolean;
  note: string;
}

export interface CorrectionRequest {
  id: string;
  userEmail: string;
  attendanceId: string;
  date: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  reasonReject?: string;
  reviewedAt?: string | null;
}

export interface LeaveRequest {
  id: string;
  userEmail?: string;
  employeeId?: string;
  code?: string;
  leaveTypeId?: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: RequestStatus;
  isUnpaid?: boolean;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface TimesheetWarning {
  code: string;
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | string;
}

export interface Timesheet {
  id: string;
  code?: string;
  employeeId: string;
  departmentId?: string;
  departmentName?: string;
  workDate?: string;
  date?: string;
  periodLabel?: string;
  employeeName?: string;
  checkIn: string;
  checkOut: string;
  totalHours?: number;
  status: RequestStatus | 'On Time' | 'Late' | 'Early Leave' | 'Missing Check-out';
  locked?: boolean;
  warnings?: TimesheetWarning[];
  note?: string;
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface TimesheetSummary {
  id: string;
  userEmail: string;
  periodType: 'week' | 'month' | string;
  periodLabel: string;
  periodKey: string;
  attendanceIds: string[];
  status: RequestStatus;
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface TimesheetRow extends Attendance {
  warnings: string[];
  correction: CorrectionRequest | null;
  timesheetStatus: RequestStatus | 'Open';
}

export interface TimesheetPeriodData {
  rows: TimesheetRow[];
  corrections: CorrectionRequest[];
  summary: TimesheetSummary;
  period: {
    startDate: Date;
    endDate: Date;
    startKey: string;
    endKey: string;
    label: string;
  };
  stats: {
    totalDays: number;
    validDays: number;
    warningDays: number;
    pendingCorrections: number;
  };
}

export interface ApiEmployee {
  id: string;
  name: string;
  department: string;
  position: string;
}

export interface ApiTimesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'On Time' | 'Late' | 'Early Leave' | 'Missing Check-out';
  note: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface AppError extends Error {
  code?: string;
}
