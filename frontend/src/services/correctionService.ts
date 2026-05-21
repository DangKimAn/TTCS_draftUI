import axios from 'axios';
import httpClient from '../utils/httpClient';
import type { AppError, CorrectionRequest } from '../types';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface BackendCorrectionRequest {
  requestCorrectionID?: string;
  id?: string;
  monthlyTimesheetID?: string;
  timesheetEntryID?: string | null;
  userID?: string;
  reason?: string;
  status?: string;
  reasonReject?: string | null;
  proposedCheckIn?: string | null;
  proposedCheckOut?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  timesheetEntry?: {
    timesheetEntryID?: string;
    date?: string;
  } | null;
  monthlyTimesheet?: {
    month?: number;
    year?: number;
    employee?: Record<string, any> | null;
  } | null;
  employee?: Record<string, any> | null;
  reviewer?: Record<string, any> | null;
}

type CorrectionRequestPayload = Pick<
  CorrectionRequest,
  'userEmail' | 'attendanceId' | 'date' | 'reason'
> &
  Partial<Pick<CorrectionRequest, 'requestedCheckIn' | 'requestedCheckOut'>> & {
    userID?: string;
    monthlyTimesheetID?: string;
  };

type ReviewCorrectionStatus = 'Approved' | 'Rejected' | 'approved' | 'rejected';

const correctionCacheByUser = new Map<string, CorrectionRequest[]>();
const correctionCacheByAttendance = new Map<string, CorrectionRequest>();

function createCorrectionError(message: string, code?: string): AppError {
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

function normalizeCorrectionError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode = 'CORRECTION_API_FAILED',
): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;
    const normalized = createCorrectionError(message, fallbackCode);

    if (status === 400 && message.toLowerCase().includes('pending')) {
      normalized.code = 'CORRECTION_PENDING_EXISTS';
    } else if (status === 401 || status === 403) {
      normalized.code = 'CORRECTION_UNAUTHORIZED';
    } else if (status === 404) {
      normalized.code = 'CORRECTION_NOT_FOUND';
    }

    return normalized;
  }

  if (error instanceof Error) {
    return createCorrectionError(error.message || fallbackMessage, fallbackCode);
  }

  return createCorrectionError(fallbackMessage, fallbackCode);
}

function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function normalizeStatus(status?: string): CorrectionRequest['status'] {
  switch (String(status || '').trim().toLowerCase()) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending';
  }
}

function formatTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 5);
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizeCorrection(payload: BackendCorrectionRequest): CorrectionRequest {
  const employee = payload.employee || payload.monthlyTimesheet?.employee || {};
  const attendanceId = payload.timesheetEntryID || payload.timesheetEntry?.timesheetEntryID || '';

  return {
    id: payload.requestCorrectionID || payload.id || '',
    userEmail: employee.email || payload.userID || '',
    attendanceId,
    date: payload.timesheetEntry?.date || '',
    requestedCheckIn: formatTime(payload.proposedCheckIn),
    requestedCheckOut: formatTime(payload.proposedCheckOut),
    reason: payload.reason || '',
    status: normalizeStatus(payload.status),
    createdAt: payload.createdAt || '',
    reasonReject: payload.reasonReject || undefined,
    reviewedAt: payload.reviewedAt || undefined,
    employee,
    reviewer: payload.reviewer || null,
    userID: payload.userID || employee.userID || '',
    monthlyTimesheetID: payload.monthlyTimesheetID || '',
    month: payload.monthlyTimesheet?.month,
    year: payload.monthlyTimesheet?.year,
  } as CorrectionRequest & Record<string, any>;
}

function cacheCorrections(userKey: string, corrections: CorrectionRequest[], aliases: string[] = []): void {
  const sorted = [...corrections].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const keys = Array.from(new Set([userKey, ...aliases].filter(Boolean)));

  keys.forEach((key) => correctionCacheByUser.set(key, sorted));
  sorted.forEach((item) => {
    if (item.attendanceId) {
      correctionCacheByAttendance.set(item.attendanceId, item);
    }
  });
}

export async function loadCorrectionsByUser(
  userID: string,
  userKey = userID,
): Promise<CorrectionRequest[]> {
  try {
    const response = await httpClient.get<
      BackendResponse<BackendCorrectionRequest[]> | BackendCorrectionRequest[]
    >(`/request-correction/my/${encodeURIComponent(userID)}`);
    const data = unwrapBackendData<BackendCorrectionRequest[]>(response.data) || [];
    const corrections = Array.isArray(data) ? data.map(normalizeCorrection) : [];

    cacheCorrections(userKey, corrections, [userID]);
    return corrections;
  } catch (error) {
    throw normalizeCorrectionError(error, 'Khong the tai yeu cau chinh sua.', 'CORRECTION_LOAD_FAILED');
  }
}

export function getCorrectionsByUser(userEmail: string): CorrectionRequest[] {
  return correctionCacheByUser.get(userEmail) || [];
}

export function getCorrectionByAttendanceId(attendanceId: string): CorrectionRequest | null {
  return correctionCacheByAttendance.get(attendanceId) || null;
}

export function hasPendingCorrections(userEmail: string, attendanceIds: string[] = []): boolean {
  return getCorrectionsByUser(userEmail).some(
    (item) =>
      attendanceIds.includes(item.attendanceId) &&
      item.status === 'Pending',
  );
}

export async function createCorrectionRequest(payload: CorrectionRequestPayload): Promise<CorrectionRequest> {
  if (!payload.userID) {
    throw createCorrectionError('Missing user ID.', 'CORRECTION_USER_MISSING');
  }

  if (!payload.monthlyTimesheetID) {
    throw createCorrectionError('Missing monthly timesheet ID.', 'CORRECTION_TIMESHEET_MISSING');
  }

  try {
    const response = await httpClient.post<
      BackendResponse<BackendCorrectionRequest> | BackendCorrectionRequest
    >(
      `/request-correction/${encodeURIComponent(payload.userID)}`,
      {
        monthlyTimesheetID: payload.monthlyTimesheetID,
        timesheetEntryID: payload.attendanceId || undefined,
        date: payload.date,
        requestedCheckIn: payload.requestedCheckIn || undefined,
        requestedCheckOut: payload.requestedCheckOut || undefined,
        reason: payload.reason,
      },
    );
    const data = unwrapBackendData<BackendCorrectionRequest>(response.data);

    if (!data) {
      throw createCorrectionError('Correction response is empty.', 'CORRECTION_RESPONSE_INVALID');
    }

    const correction = normalizeCorrection(data);
    const current = getCorrectionsByUser(payload.userEmail);
    cacheCorrections(payload.userEmail, [correction, ...current], [payload.userID]);

    return correction;
  } catch (error) {
    throw normalizeCorrectionError(error, 'Khong the tao yeu cau chinh sua.', 'CORRECTION_CREATE_FAILED');
  }
}

export async function getDepartmentCorrectionRequests(
  departmentID: string,
): Promise<CorrectionRequest[]> {
  try {
    const response = await httpClient.get<
      BackendResponse<BackendCorrectionRequest[]> | BackendCorrectionRequest[]
    >(`/request-correction/department/${encodeURIComponent(departmentID)}`, {
      params: { status: 'PENDING' },
    });
    const data = unwrapBackendData<BackendCorrectionRequest[]>(response.data) || [];

    return Array.isArray(data) ? data.map(normalizeCorrection) : [];
  } catch (error) {
    throw normalizeCorrectionError(error, 'Khong the tai correction dang cho.', 'CORRECTION_DEPARTMENT_LOAD_FAILED');
  }
}

export async function reviewCorrectionRequest(
  correctionID: string,
  status: ReviewCorrectionStatus,
  reason?: string,
): Promise<CorrectionRequest> {
  const backendStatus = String(status).toLowerCase() === 'approved' ? 'APPROVED' : 'REJECTED';

  try {
    const response = await httpClient.patch<
      BackendResponse<BackendCorrectionRequest> | BackendCorrectionRequest
    >(
      `/request-correction/review/${encodeURIComponent(correctionID)}`,
      {
        status: backendStatus,
        reasonReject: backendStatus === 'REJECTED' ? reason?.trim() || '' : undefined,
      },
    );
    const data = unwrapBackendData<BackendCorrectionRequest>(response.data);

    if (!data) {
      throw createCorrectionError('Correction review response is empty.', 'CORRECTION_RESPONSE_INVALID');
    }

    return normalizeCorrection(data);
  } catch (error) {
    throw normalizeCorrectionError(error, 'Khong the cap nhat correction.', 'CORRECTION_REVIEW_FAILED');
  }
}
