import axios from 'axios';
import type {
  AppError,
  Attendance,
  CorrectionRequest,
  RequestStatus,
  Timesheet,
  TimesheetPeriodData,
  TimesheetRow,
  TimesheetSummary,
  TimesheetWarning,
} from '../types';
import { getMonthlyAttendance, getUserAttendanceRecords } from './attendanceService';
import {
  getCorrectionByAttendanceId,
  getCorrectionsByUser,
  hasPendingCorrections,
  loadCorrectionsByUser,
} from './correctionService';
import httpClient from '../utils/httpClient';
import {
  getPeriodConfig,
  isDateWithinRange,
  isEarlyOut,
  isLate,
} from '../utils/dateUtils';

type PeriodType = 'week' | 'month' | string;
type ReviewStatus = 'Approved' | 'Rejected' | 'accepted' | 'rejected' | 'approved';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface BackendMonthlyTimesheet {
  monthlyTimesheetID?: string;
  id?: string;
  userID?: string;
  month?: number;
  year?: number;
  status?: string;
  reasonReject?: string | null;
  canSubmit?: boolean;
  isSubmitted?: boolean;
  reviewedAt?: string | null;
  createdAt?: string | null;
}

interface BackendDepartmentUser {
  userID?: string;
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  fullName?: string;
  departmentID?: string;
  departmentId?: string;
  departmentName?: string;
  roleId?: string | null;
  remainDaysofLeave?: number;
  isActive?: boolean;
}

export interface MonthlyTimesheetData extends TimesheetSummary {
  monthlyTimesheetID: string;
  userID: string;
  month: number;
  year: number;
  canSubmit: boolean;
  isSubmitted: boolean;
  rawStatus?: string;
  reviewedAt?: string | null;
}

export interface ManagerReviewTimesheetResult {
  employees: Array<Record<string, any>>;
  timesheets: Timesheet[];
}

const monthlyTimesheetCache = new Map<string, MonthlyTimesheetData>();

function createTimesheetError(message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  return error;
}

function getResponseMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === 'string' || typeof data === 'number') {
    return String(data);
  }

  if (typeof data !== 'object') {
    return null;
  }

  const payload = data as BackendResponse<unknown>;

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  return null;
}

function normalizeTimesheetError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode = 'TIMESHEET_API_FAILED',
): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;

    if (status === 404) {
      return createTimesheetError(message, 'TIMESHEET_NOT_FOUND');
    }

    if (status === 401 || status === 403) {
      return createTimesheetError(message, 'TIMESHEET_UNAUTHORIZED');
    }

    if (status === 409) {
      return createTimesheetError(message, 'TIMESHEET_CONFLICT');
    }

    return createTimesheetError(message, fallbackCode);
  }

  if (error instanceof Error) {
    return createTimesheetError(error.message || fallbackMessage, fallbackCode);
  }

  return createTimesheetError(fallbackMessage, fallbackCode);
}

function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function validateUserID(userID: string): void {
  if (!userID) {
    throw createTimesheetError('Missing user ID.', 'TIMESHEET_USER_MISSING');
  }
}

function validateMonthYear(month: number, year: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    throw createTimesheetError('Invalid month or year.', 'TIMESHEET_PERIOD_INVALID');
  }
}

function getPeriodKey(
  periodType: PeriodType,
  periodConfig: { startKey: string; endKey: string },
): string {
  return `${periodType}-${periodConfig.startKey}-${periodConfig.endKey}`;
}

function getMonthlyCacheKey(userID: string, month: number, year: number): string {
  return `${userID}-${year}-${month}`;
}

function cacheMonthlyTimesheet(timesheet: MonthlyTimesheetData): MonthlyTimesheetData {
  monthlyTimesheetCache.set(
    getMonthlyCacheKey(timesheet.userID, timesheet.month, timesheet.year),
    timesheet,
  );

  return timesheet;
}

function updateCachedMonthlyTimesheet(
  monthlyTimesheetID: string,
  updates: Partial<MonthlyTimesheetData>,
): MonthlyTimesheetData | null {
  let updatedTimesheet: MonthlyTimesheetData | null = null;

  monthlyTimesheetCache.forEach((value, key) => {
    if (value.monthlyTimesheetID !== monthlyTimesheetID) {
      return;
    }

    const nextValue = {
      ...value,
      ...updates,
    };

    monthlyTimesheetCache.set(key, nextValue);
    updatedTimesheet = nextValue;
  });

  return updatedTimesheet;
}

function normalizeRequestStatus(
  rawStatus?: string,
  isSubmitted?: boolean,
): RequestStatus {
  const normalizedStatus = String(rawStatus || '').trim().toLowerCase();

  switch (normalizedStatus) {
    case 'submitted':
      return 'Submitted';
    case 'accepted':
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
      return 'Pending';
    case 'draft':
      return 'Draft';
    default:
      return isSubmitted ? 'Submitted' : 'Draft';
  }
}

function getMonthPeriodLabel(month: number, year: number): string {
  return `Thang ${month}/${year}`;
}

function normalizeMonthlyTimesheet(
  payload: BackendMonthlyTimesheet,
  userID: string,
  month: number,
  year: number,
): MonthlyTimesheetData {
  const monthlyTimesheetID = payload.monthlyTimesheetID || payload.id;

  if (!monthlyTimesheetID) {
    throw createTimesheetError('Monthly timesheet response is missing ID.', 'TIMESHEET_RESPONSE_INVALID');
  }

  const status = normalizeRequestStatus(payload.status, payload.isSubmitted);
  const periodConfig = getPeriodConfig('month', new Date(year, month - 1, 1));

  return {
    id: monthlyTimesheetID,
    monthlyTimesheetID,
    userID: payload.userID || userID,
    userEmail: payload.userID || userID,
    month: payload.month || month,
    year: payload.year || year,
    periodType: 'month',
    periodLabel: getMonthPeriodLabel(payload.month || month, payload.year || year),
    periodKey: getPeriodKey('month', periodConfig),
    attendanceIds: [],
    status,
    submittedAt: payload.isSubmitted ? payload.createdAt || null : null,
    rejectedAt: status === 'Rejected' ? payload.reviewedAt || null : undefined,
    approvedAt: status === 'Approved' ? payload.reviewedAt || null : undefined,
    rejectionReason: payload.reasonReject || undefined,
    canSubmit: Boolean(payload.canSubmit),
    isSubmitted: Boolean(payload.isSubmitted),
    rawStatus: payload.status,
    reviewedAt: payload.reviewedAt || null,
  };
}

function findCachedMonthlyTimesheet(
  userKey: string,
  month: number,
  year: number,
): MonthlyTimesheetData | null {
  return monthlyTimesheetCache.get(getMonthlyCacheKey(userKey, month, year)) || null;
}

function findCachedSummaryForPeriod(
  userKey: string,
  periodType: PeriodType,
  anchorDate: Date,
): MonthlyTimesheetData | null {
  const month = anchorDate.getMonth() + 1;
  const year = anchorDate.getFullYear();

  return (
    findCachedMonthlyTimesheet(userKey, month, year) ||
    [...monthlyTimesheetCache.values()].find(
      (item) => item.month === month && item.year === year && item.userID === userKey,
    ) ||
    null
  );
}

function applySummaryToRows(rows: TimesheetRow[], summary: TimesheetSummary): TimesheetRow[] {
  return rows.map((row) => ({
    ...row,
    timesheetStatus:
      summary.status === 'Submitted' || summary.status === 'Approved' || summary.status === 'Rejected'
        ? summary.status
        : row.status === 'Working'
          ? 'Open'
          : 'Draft',
  }));
}

function createDraftSummary(
  userEmail: string,
  periodType: PeriodType,
  periodConfig: { label: string; startKey: string; endKey: string },
  attendanceIds: string[],
): TimesheetSummary {
  return {
    id: `timesheet-${userEmail}-${periodType}-${periodConfig.startKey}`,
    userEmail,
    periodType,
    periodLabel: periodConfig.label,
    periodKey: getPeriodKey(periodType, periodConfig),
    attendanceIds,
    status: 'Draft',
    submittedAt: null,
  };
}

function mergeMonthlySummaryWithPeriod(
  monthlySummary: MonthlyTimesheetData,
  userEmail: string,
  periodType: PeriodType,
  periodConfig: { label: string; startKey: string; endKey: string },
  attendanceIds: string[],
): MonthlyTimesheetData {
  return {
    ...monthlySummary,
    userEmail,
    periodType,
    periodLabel: periodType === 'month' ? monthlySummary.periodLabel : periodConfig.label,
    periodKey: getPeriodKey(periodType, periodConfig),
    attendanceIds,
  };
}

function toWarningCode(label: string): string {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getWarningTone(label: string): TimesheetWarning['tone'] {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes('missing') || normalizedLabel.includes('ip')) {
    return 'danger';
  }

  if (normalizedLabel.includes('late') || normalizedLabel.includes('early')) {
    return 'warning';
  }

  return 'info';
}

function buildWarningsFromRecords(records: Attendance[]): TimesheetWarning[] {
  const uniqueWarnings = new Map<string, TimesheetWarning>();

  records.forEach((record) => {
    getAttendanceWarnings(record, null).forEach((label) => {
      const code = toWarningCode(label);
      uniqueWarnings.set(code, {
        code,
        label,
        tone: getWarningTone(label),
      });
    });
  });

  return [...uniqueWarnings.values()];
}

function normalizeDepartmentUser(user: BackendDepartmentUser, fallbackDepartmentID: string): Record<string, any> {
  const id = user.userID || user.id || '';
  const fullName = user.fullName || user.name || user.username || user.email || id;

  return {
    id,
    employeeCode: id ? `EMP-${id.slice(0, 8)}` : 'EMP',
    fullName,
    email: user.email || '',
    departmentId: user.departmentID || user.departmentId || fallbackDepartmentID,
    departmentName: user.departmentName || '',
    title: 'Nhan vien',
    role: 'employee',
    status: user.isActive === false ? 'Inactive' : 'Active',
    isActive: user.isActive !== false,
    leaveBalance: Number(user.remainDaysofLeave || 0),
    monthlyHours: 0,
    salaryCoefficient: 0,
    phone: '',
    location: '',
    startedAt: '',
    profileStatus: 'verified',
  };
}

function buildManagerTimesheet(
  monthlyTimesheet: MonthlyTimesheetData,
  employee: Record<string, any>,
  records: Attendance[],
): Timesheet {
  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date));
  const firstRecord = sortedRecords[0] || null;
  const lastRecord = sortedRecords[sortedRecords.length - 1] || null;
  const lastCheckoutRecord = [...sortedRecords].reverse().find((record) => record.checkOutTime);
  const totalHours = sortedRecords.reduce((total, record) => total + (record.totalHours || 0), 0);
  const monthText = String(monthlyTimesheet.month).padStart(2, '0');
  const shortEmployeeId = String(employee.id || monthlyTimesheet.userID).slice(0, 8).toUpperCase();

  return {
    id: monthlyTimesheet.monthlyTimesheetID,
    code: `TS-${monthlyTimesheet.year}${monthText}-${shortEmployeeId}`,
    employeeId: employee.id,
    departmentId: employee.departmentId,
    workDate: lastRecord?.date || `${monthlyTimesheet.year}-${monthText}-01`,
    date: lastRecord?.date || `${monthlyTimesheet.year}-${monthText}-01`,
    periodLabel: monthlyTimesheet.periodLabel,
    employeeName: employee.fullName,
    checkIn: firstRecord?.checkInTime || '',
    checkOut: lastCheckoutRecord?.checkOutTime || '',
    totalHours: Math.round(totalHours * 10) / 10,
    status: monthlyTimesheet.status,
    locked: monthlyTimesheet.status === 'Approved',
    warnings: buildWarningsFromRecords(sortedRecords),
    rejectionReason: monthlyTimesheet.rejectionReason,
    approvedAt: monthlyTimesheet.approvedAt,
    rejectedAt: monthlyTimesheet.rejectedAt,
  };
}

function isReviewableMonthlyTimesheet(timesheet: MonthlyTimesheetData): boolean {
  return timesheet.status === 'Submitted' || timesheet.status === 'Pending';
}

async function fetchDepartmentUsers(departmentID: string): Promise<BackendDepartmentUser[]> {
  const response = await httpClient.get<BackendResponse<BackendDepartmentUser[]> | BackendDepartmentUser[]>(
    `/user/getByDepartment/${encodeURIComponent(departmentID)}`,
  );

  const users = unwrapBackendData<BackendDepartmentUser[]>(response.data);
  return Array.isArray(users) ? users : [];
}

export function getAttendanceWarnings(
  record: Attendance | null | undefined,
  correction: CorrectionRequest | null | undefined,
): string[] {
  const warnings = [];

  if (isLate(record?.checkInTime)) {
    warnings.push('Late');
  }

  if (record?.checkOutTime && isEarlyOut(record.checkOutTime)) {
    warnings.push('Early Out');
  }

  if (!record?.checkOutTime || record?.status === 'Missing Out') {
    warnings.push('Missing Out');
  }

  if (record?.hasIpWarning) {
    warnings.push('IP Warning');
  }

  if (correction?.status === 'Pending') {
    warnings.push('Correction Pending');
  }

  return warnings;
}

export async function getMonthlyTimesheet(
  userID: string,
  month: number,
  year: number,
): Promise<MonthlyTimesheetData> {
  validateUserID(userID);
  validateMonthYear(month, year);

  try {
    const response = await httpClient.get<
      BackendResponse<BackendMonthlyTimesheet> | BackendMonthlyTimesheet
    >(`/time-sheet/monthlyTimesheet/${encodeURIComponent(userID)}`, {
      params: { month, year },
    });
    const payload = unwrapBackendData<BackendMonthlyTimesheet>(response.data);

    if (!payload) {
      throw createTimesheetError('Monthly timesheet response is empty.', 'TIMESHEET_RESPONSE_INVALID');
    }

    return cacheMonthlyTimesheet(normalizeMonthlyTimesheet(payload, userID, month, year));
  } catch (error) {
    throw normalizeTimesheetError(
      error,
      'Khong the tai bang cong thang.',
      'TIMESHEET_LOAD_FAILED',
    );
  }
}

export async function createMonthlyTimesheet(
  userID: string,
  month: number,
  year: number,
): Promise<MonthlyTimesheetData> {
  validateUserID(userID);
  validateMonthYear(month, year);

  try {
    const response = await httpClient.post<
      BackendResponse<BackendMonthlyTimesheet> | BackendMonthlyTimesheet
    >(
      `/time-sheet/monthlyTimesheet/${encodeURIComponent(userID)}`,
      { month, year },
    );
    const payload = unwrapBackendData<BackendMonthlyTimesheet>(response.data);

    if (!payload) {
      throw createTimesheetError('Monthly timesheet response is empty.', 'TIMESHEET_RESPONSE_INVALID');
    }

    return cacheMonthlyTimesheet(normalizeMonthlyTimesheet(payload, userID, month, year));
  } catch (error) {
    throw normalizeTimesheetError(
      error,
      'Khong the tao bang cong thang.',
      'TIMESHEET_CREATE_FAILED',
    );
  }
}

async function submitMonthlyTimesheetRequest(timesheetID: string): Promise<MonthlyTimesheetData | null> {
  if (!timesheetID) {
    throw createTimesheetError('Missing timesheet ID.', 'TIMESHEET_ID_MISSING');
  }

  try {
    const response = await httpClient.patch<
      BackendResponse<BackendMonthlyTimesheet> | BackendMonthlyTimesheet
    >(`/time-sheet/submitMonthlyTimesheet/${encodeURIComponent(timesheetID)}`);
    const payload = unwrapBackendData<BackendMonthlyTimesheet>(response.data);

    if (payload?.monthlyTimesheetID || payload?.id) {
      const cached = updateCachedMonthlyTimesheet(timesheetID, {
        status: 'Submitted',
        isSubmitted: true,
        canSubmit: false,
        submittedAt: new Date().toISOString(),
      });

      if (cached) {
        return cached;
      }
    }

    return updateCachedMonthlyTimesheet(timesheetID, {
      status: 'Submitted',
      isSubmitted: true,
      canSubmit: false,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw normalizeTimesheetError(
      error,
      'Khong the gui xac nhan bang cong.',
      'TIMESHEET_SUBMIT_FAILED',
    );
  }
}

function submitCachedTimesheet(
  userEmail: string,
  periodType: PeriodType,
  anchorDate = new Date(),
): TimesheetSummary {
  const periodConfig = getPeriodConfig(periodType, anchorDate);
  const periodKey = getPeriodKey(periodType, periodConfig);
  const records = getUserAttendanceRecords(userEmail).filter((record) =>
    isDateWithinRange(record.date, periodConfig.startKey, periodConfig.endKey),
  );
  const corrections = getCorrectionsByUser(userEmail).filter((item) =>
    isDateWithinRange(item.date, periodConfig.startKey, periodConfig.endKey),
  );
  const currentSummary = getTimesheetStatus(userEmail, periodType, anchorDate);
  const submitState = canSubmitTimesheet(records, corrections, currentSummary);

  if (!submitState.allowed) {
    const error = new Error(submitState.reason) as AppError;
    error.code = 'TIMESHEET_SUBMIT_BLOCKED';
    throw error;
  }

  const summary: TimesheetSummary = {
    id: currentSummary?.id || `timesheet-${userEmail}-${periodType}-${periodConfig.startKey}`,
    userEmail,
    periodType,
    periodLabel: periodConfig.label,
    periodKey,
    attendanceIds: records.map((record) => record.id),
    status: 'Submitted',
    submittedAt: new Date().toISOString(),
  };

  return summary;
}

export function submitTimesheet(timesheetID: string): Promise<MonthlyTimesheetData | null>;
export function submitTimesheet(
  userEmail: string,
  periodType: PeriodType,
  anchorDate?: Date,
): TimesheetSummary;
export function submitTimesheet(
  firstArg: string,
  periodType?: PeriodType,
  anchorDate = new Date(),
): Promise<MonthlyTimesheetData | null> | TimesheetSummary {
  if (periodType === undefined) {
    return submitMonthlyTimesheetRequest(firstArg);
  }

  return submitCachedTimesheet(firstArg, periodType, anchorDate);
}

export async function reviewTimesheet(
  timesheetID: string,
  status: ReviewStatus,
  reason?: string,
): Promise<MonthlyTimesheetData | null> {
  if (!timesheetID) {
    throw createTimesheetError('Missing timesheet ID.', 'TIMESHEET_ID_MISSING');
  }

  const accept = String(status).toLowerCase() === 'approved' || String(status).toLowerCase() === 'accepted';

  try {
    const response = await httpClient.patch<
      BackendResponse<BackendMonthlyTimesheet> | BackendMonthlyTimesheet
    >(
      `/time-sheet/reviewMonthlyTimesheet/${encodeURIComponent(timesheetID)}`,
      {
        accept,
        reasonReject: accept ? undefined : reason || '',
      },
    );
    const payload = unwrapBackendData<BackendMonthlyTimesheet>(response.data);
    const nextStatus: RequestStatus = accept ? 'Approved' : 'Rejected';

    if (payload?.monthlyTimesheetID || payload?.id) {
      const normalized = normalizeMonthlyTimesheet(payload, payload.userID || '', payload.month || 1, payload.year || new Date().getFullYear());
      return cacheMonthlyTimesheet({
        ...normalized,
        status: nextStatus,
      });
    }

    return updateCachedMonthlyTimesheet(timesheetID, {
      status: nextStatus,
      canSubmit: !accept,
      isSubmitted: accept,
      reviewedAt: new Date().toISOString(),
      approvedAt: accept ? new Date().toISOString() : undefined,
      rejectedAt: accept ? undefined : new Date().toISOString(),
      rejectionReason: accept ? undefined : reason,
    });
  } catch (error) {
    throw normalizeTimesheetError(
      error,
      'Khong the duyet bang cong.',
      'TIMESHEET_REVIEW_FAILED',
    );
  }
}

export function getTimesheetStatus(
  userEmail: string,
  periodType: PeriodType,
  anchorDate = new Date(),
): MonthlyTimesheetData | null {
  return findCachedSummaryForPeriod(userEmail, periodType, anchorDate);
}

export function getTimesheetByPeriod(
  userEmail: string,
  periodType: PeriodType,
  anchorDate = new Date(),
): TimesheetPeriodData {
  const periodConfig = getPeriodConfig(periodType, anchorDate);
  const attendanceRecords = getUserAttendanceRecords(userEmail).filter((record) =>
    isDateWithinRange(record.date, periodConfig.startKey, periodConfig.endKey),
  );

  const corrections = getCorrectionsByUser(userEmail);
  const monthlySummary = getTimesheetStatus(userEmail, periodType, anchorDate);

  const rows = attendanceRecords.map((record): TimesheetRow => {
    const correction = getCorrectionByAttendanceId(record.id);
    const warnings = getAttendanceWarnings(record, correction);

    return {
      ...record,
      warnings,
      correction,
      timesheetStatus:
        monthlySummary?.status === 'Submitted' ||
        monthlySummary?.status === 'Approved' ||
        monthlySummary?.status === 'Rejected'
          ? monthlySummary.status
          : record.status === 'Working'
            ? 'Open'
            : 'Draft',
    };
  });

  const validRows = rows.filter(
    (row) =>
      row.checkInTime &&
      row.checkOutTime &&
      row.status !== 'Missing Out' &&
      row.correction?.status !== 'Pending',
  ).length;
  const warningRows = rows.filter((row) => row.warnings.length > 0).length;
  const pendingCorrections = corrections.filter(
    (item) =>
      item.status === 'Pending' &&
      isDateWithinRange(item.date, periodConfig.startKey, periodConfig.endKey),
  ).length;
  const summary = monthlySummary
    ? mergeMonthlySummaryWithPeriod(
        monthlySummary,
        userEmail,
        periodType,
        periodConfig,
        rows.map((row) => row.id),
      )
    : createDraftSummary(
        userEmail,
        periodType,
        periodConfig,
        rows.map((row) => row.id),
      );

  return {
    rows: applySummaryToRows(rows, summary),
    corrections,
    summary,
    period: periodConfig,
    stats: {
      totalDays: rows.length,
      validDays: validRows,
      warningDays: warningRows,
      pendingCorrections,
    },
  };
}

export async function getMonthlyTimesheetPeriodData({
  userID,
  userEmail,
  month,
  year,
  periodType = 'month',
  anchorDate = new Date(year, month - 1, 1),
  createIfMissing = true,
}: {
  userID: string;
  userEmail: string;
  month: number;
  year: number;
  periodType?: PeriodType;
  anchorDate?: Date;
  createIfMissing?: boolean;
}): Promise<TimesheetPeriodData> {
  validateUserID(userID);
  validateMonthYear(month, year);

  let monthlyTimesheet: MonthlyTimesheetData;

  try {
    monthlyTimesheet = await getMonthlyTimesheet(userID, month, year);
  } catch (error) {
    if ((error as AppError).code !== 'TIMESHEET_NOT_FOUND' || !createIfMissing) {
      throw error;
    }

    monthlyTimesheet = await createMonthlyTimesheet(userID, month, year);
  }

  if (userEmail && userEmail !== userID) {
    monthlyTimesheetCache.set(getMonthlyCacheKey(userEmail, month, year), {
      ...monthlyTimesheet,
      userEmail,
    });
  }

  await getMonthlyAttendance(userID, month, year);
  await loadCorrectionsByUser(userID, userEmail || userID);
  const data = getTimesheetByPeriod(userEmail || userID, periodType, anchorDate);

  return data;
}

export async function getManagerMonthlyTimesheetsForReview(
  departmentID: string,
  month: number,
  year: number,
): Promise<ManagerReviewTimesheetResult> {
  if (!departmentID) {
    throw createTimesheetError('Missing department ID.', 'TIMESHEET_DEPARTMENT_MISSING');
  }

  validateMonthYear(month, year);

  try {
    const users = await fetchDepartmentUsers(departmentID);
    const employees = users
      .map((user) => normalizeDepartmentUser(user, departmentID))
      .filter((employee) => employee.id);
    const reviewTimesheets = await Promise.all(
      employees.map(async (employee) => {
        try {
          const monthlyTimesheet = await getMonthlyTimesheet(employee.id, month, year);

          if (!isReviewableMonthlyTimesheet(monthlyTimesheet)) {
            return null;
          }

          const records = await getMonthlyAttendance(employee.id, month, year).catch(() => []);
          return buildManagerTimesheet(monthlyTimesheet, employee, records);
        } catch (error) {
          if ((error as AppError).code === 'TIMESHEET_NOT_FOUND') {
            return null;
          }

          throw error;
        }
      }),
    );
    const timesheets = reviewTimesheets.filter(Boolean) as Timesheet[];
    const hoursByEmployee = new Map<string, number>();

    timesheets.forEach((timesheet) => {
      hoursByEmployee.set(timesheet.employeeId, timesheet.totalHours || 0);
    });

    return {
      employees: employees.map((employee) => ({
        ...employee,
        monthlyHours: hoursByEmployee.get(employee.id) || employee.monthlyHours || 0,
      })),
      timesheets,
    };
  } catch (error) {
    throw normalizeTimesheetError(
      error,
      'Khong the tai danh sach bang cong can duyet.',
      'TIMESHEET_REVIEW_LIST_FAILED',
    );
  }
}

export function canSubmitTimesheet(
  records: Attendance[],
  corrections: CorrectionRequest[],
  summary: TimesheetSummary | null,
): { allowed: boolean; reason: string } {
  if (!records.length) {
    return {
      allowed: false,
      reason: 'Chua co du lieu cham cong trong ky nay.',
    };
  }

  if (summary?.status === 'Submitted' || summary?.status === 'Approved') {
    return {
      allowed: false,
      reason: 'Bang cong da duoc gui xac nhan va dang cho duyet.',
    };
  }

  const hasMissingOut = records.some(
    (record) =>
      record.status === 'Missing Out' ||
      !record.checkInTime ||
      !record.checkOutTime,
  );

  if (hasMissingOut) {
    return {
      allowed: false,
      reason: 'Ban van con ngay cong thieu du lieu, chua the gui xac nhan.',
    };
  }

  const pendingCorrection = corrections.some((item) => item.status === 'Pending');

  if (pendingCorrection) {
    return {
      allowed: false,
      reason: 'Vui long doi quan ly duyet yeu cau chinh sua truoc khi chot cong.',
    };
  }

  return {
    allowed: true,
    reason: 'Du lieu hop le va san sang gui xac nhan den quan ly.',
  };
}

export function hasPendingCorrectionsInPeriod(userEmail: string, attendanceIds: string[]): boolean {
  return hasPendingCorrections(userEmail, attendanceIds);
}
