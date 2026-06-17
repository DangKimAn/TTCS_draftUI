import axios from 'axios';
import type { AppError, Attendance, AttendanceStatus } from '../types';
import httpClient from '../utils/httpClient';
import { getAuthSession } from '../utils/storage';
import { getCurrentDeviceInfo as readCurrentDeviceInfo } from '../utils/deviceInfo';
import {
  calculateWorkingHours as calculateWorkingHoursValue,
  formatTimeFromIso,
  getTodayDateKey,
} from '../utils/timeUtils';

const ATTENDANCE_IP_KEY = 'timesheet_pro_mock_ip';
const DEFAULT_IP = '192.168.1.20';
const ALTERNATE_IP = '10.0.0.15';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface BackendAttendanceEntry {
  timesheetEntryID?: string;
  id?: string;
  monthlyTimesheetID?: string;
  date?: string;
  status?: string;
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  IPAddress?: string;
  ipAddress?: string;
  canRequestCorrection?: boolean;
  isWarning?: boolean;
}

const attendanceCacheByKey = new Map<string, Attendance[]>();

function createAttendanceError(message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  return error;
}

function getResponseMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number') {
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

function getAttendanceErrorCode(message: string, status?: number, fallbackCode = 'ATTENDANCE_API_FAILED'): string {
  const normalizedMessage = message.toLowerCase();

  if (status === 401 || status === 403) {
    return 'ATTENDANCE_UNAUTHORIZED';
  }

  if (normalizedMessage.includes('already checked in')) {
    return 'ALREADY_CHECKED_IN';
  }

  if (normalizedMessage.includes('already checked out') || normalizedMessage.includes('already completed')) {
    return 'ALREADY_COMPLETED';
  }

  if (normalizedMessage.includes("haven't checked in") || normalizedMessage.includes('not checked in')) {
    return 'NOT_CHECKED_IN';
  }

  if (normalizedMessage.includes('ip address')) {
    return 'ATTENDANCE_IP_MISMATCH';
  }

  if (status === 404) {
    return 'ATTENDANCE_NOT_FOUND';
  }

  return fallbackCode;
}

function normalizeAttendanceError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode?: string,
): AppError {
  // 1. bắt lỗi đã qua Interceptor chuẩn hóa
  if (error && typeof error === 'object' && 'status' in error) {
    const err = error as any;
    const message = err.message || fallbackMessage;
    const status = err.status;

    return createAttendanceError(
      message,
      getAttendanceErrorCode(message, status, fallbackCode),
    );
  }

  // 2. Đoạn code AxiosError cũ giữ nguyên phía dưới
  if (axios.isAxiosError(error)) {
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;
    const status = error.response?.status;

    return createAttendanceError(
      message,
      getAttendanceErrorCode(message, status, fallbackCode),
    );
  }

  if (error instanceof Error) {
    return createAttendanceError(error.message || fallbackMessage, fallbackCode);
  }

  return createAttendanceError(fallbackMessage, fallbackCode);
}


function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function formatNullableTime(isoValue: string | null): string | null {
  if (!isoValue) {
    return null;
  }

  const formatted = formatTimeFromIso(isoValue);
  return formatted === '--' ? null : formatted;
}

function resolveRecordDate(entry: BackendAttendanceEntry, checkInIso: string | null): string {
  if (entry.date) {
    return entry.date;
  }

  return checkInIso?.slice(0, 10) || getTodayDateKey();
}

function resolveRecordOwner(userID: string): string {
  const session = getAuthSession();

  if (session && (session.userID === userID || session.id === userID)) {
    return session.email;
  }

  return userID;
}

function getUserCacheAliases(userKey: string): string[] {
  const session = getAuthSession();
  const aliases = [userKey];

  if (session && (session.userID === userKey || session.id === userKey || session.email === userKey)) {
    aliases.push(session.userID, session.id, session.email);
  }

  return Array.from(new Set(aliases.filter(Boolean)));
}

function sortAttendanceRecords(records: Attendance[]): Attendance[] {
  return [...records].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (right.serverTimeAtCheckIn || '').localeCompare(left.serverTimeAtCheckIn || '');
  });
}

function cacheUserRecords(userKey: string, records: Attendance[]): void {
  const sortedRecords = sortAttendanceRecords(records);

  getUserCacheAliases(userKey).forEach((alias) => {
    attendanceCacheByKey.set(alias, sortedRecords);
  });
}

function resolveAttendanceStatus(
  date: string,
  checkInIso: string | null,
  checkOutIso: string | null,
  rawStatus?: string,
): AttendanceStatus {
  const normalizedStatus = String(rawStatus || '').trim().toLowerCase();

  if (normalizedStatus.includes('missing')) {
    return 'Missing Out';
  }

  if (checkInIso && !checkOutIso) {
    return date < getTodayDateKey() ? 'Missing Out' : 'Working';
  }

  if (checkInIso && checkOutIso) {
    return 'Completed';
  }

  return 'Not Started';
}

function normalizeAttendanceEntry(entry: BackendAttendanceEntry, userID: string): Attendance {
  const checkInIso = toIsoString(entry.checkIn);
  const checkOutIso = toIsoString(entry.checkOut);
  const date = resolveRecordDate(entry, checkInIso);
  const owner = resolveRecordOwner(userID);
  const status = resolveAttendanceStatus(date, checkInIso, checkOutIso, entry.status);
  const entryId =
    entry.timesheetEntryID ||
    entry.id ||
    `attendance-${owner}-${date}-${checkInIso || 'empty'}`;

  return {
    id: entryId,
    userEmail: owner,
    date,
    checkInTime: formatNullableTime(checkInIso),
    checkOutTime: formatNullableTime(checkOutIso),
    totalHours: calculateWorkingHoursValue(checkInIso, checkOutIso),
    status,
    serverTimeAtCheckIn: checkInIso,
    serverTimeAtCheckOut: checkOutIso,
    ipAddressAtCheckIn: entry.IPAddress || entry.ipAddress || null,
    ipAddressAtCheckOut: null,
    deviceInfoAtCheckIn: null,
    deviceInfoAtCheckOut: null,
    hasIpWarning: Boolean(entry.isWarning),
    note: status === 'Missing Out' ? 'Bạn đã quên Check-out. Vui lòng giải trình.' : '',
  };
}

function validateUserID(userID: string): void {
  if (!userID) {
    throw createAttendanceError('Missing user ID', 'ATTENDANCE_USER_MISSING');
  }
}

function getAttendanceRequestHeaders(): Record<string, string> {
  return {
    'x-forwarded-for': getCurrentMockIp(),
  };
}

function getTodayRecordFrom(records: Attendance[]): Attendance | null {
  const todayKey = getTodayDateKey();
  return sortAttendanceRecords(records).find((record) => record.date === todayKey) || null;
}

async function refreshCurrentMonthAttendance(userID: string): Promise<Attendance[]> {
  const now = new Date();
  return getMonthlyAttendance(userID, now.getMonth() + 1, now.getFullYear());
}

export function getCurrentMockIp(): string {
  return localStorage.getItem(ATTENDANCE_IP_KEY) || DEFAULT_IP;
}

export function toggleMockIp(): string {
  const nextIp = getCurrentMockIp() === DEFAULT_IP ? ALTERNATE_IP : DEFAULT_IP;
  localStorage.setItem(ATTENDANCE_IP_KEY, nextIp);
  return nextIp;
}

export function getCurrentDeviceInfo(): string {
  return getCurrentDeviceInfoFromBrowser();
}

function getCurrentDeviceInfoFromBrowser(): string {
  return readCurrentDeviceInfo();
}

export function calculateWorkingHoursForRecord(
  checkInIso: string | null,
  checkOutIso: string | null,
): number | null {
  return calculateWorkingHoursValue(checkInIso, checkOutIso);
}

export { calculateWorkingHoursForRecord as calculateWorkingHours };

export async function getMonthlyAttendance(
  userID: string,
  month: number,
  year: number,
): Promise<Attendance[]> {
  validateUserID(userID);

  try {
    const response = await httpClient.get<
      BackendResponse<BackendAttendanceEntry[]> | BackendAttendanceEntry[]
    >(`/attendance-module/getAllAttendenceOfMonth/${encodeURIComponent(userID)}`, {
      params: { month, year },
    });
    const entries = unwrapBackendData<BackendAttendanceEntry[]>(response.data) || [];
    const records = Array.isArray(entries)
      ? entries.map((entry) => normalizeAttendanceEntry(entry, userID))
      : [];

    cacheUserRecords(userID, records);
    return sortAttendanceRecords(records);
  } catch (error) {
    // Kiểm tra status code = 404 từ cả Axios lỗi gốc và lỗi đã qua chuẩn hóa
    const isNotFoundError =
      (axios.isAxiosError(error) && error.response?.status === 404) ||
      (error && typeof error === 'object' && (error as any).status === 404);

    if (isNotFoundError) {
      cacheUserRecords(userID, []);
      return [];
    }

    throw normalizeAttendanceError(
      error,
      'Không thể tải dữ liệu chấm công.',
      'ATTENDANCE_LOAD_FAILED',
    );
  }

}

export function getUserAttendanceRecords(userKey: string): Attendance[] {
  return sortAttendanceRecords(attendanceCacheByKey.get(userKey) || []);
}

export function markMissingCheckoutRecords(userKey: string): {
  updatedCount: number;
  records: Attendance[];
} {
  const todayKey = getTodayDateKey();
  let updatedCount = 0;
  const records = getUserAttendanceRecords(userKey).map((record): Attendance => {
    const shouldMarkMissing =
      record.date < todayKey &&
      record.checkInTime &&
      !record.checkOutTime &&
      record.status !== 'Missing Out';

    if (!shouldMarkMissing) {
      return record;
    }

    updatedCount += 1;

    return {
      ...record,
      status: 'Missing Out',
      note: record.note || 'Bạn đã quên Check-out. Vui lòng giải trình.',
    };
  });

  if (updatedCount > 0) {
    cacheUserRecords(userKey, records);
  }

  return {
    updatedCount,
    records,
  };
}

export function getTodayAttendance(userKey: string): Attendance | null {
  return getTodayRecordFrom(getUserAttendanceRecords(userKey));
}

export function getAttendanceHistory(userKey: string, limit = 7): Attendance[] {
  return getUserAttendanceRecords(userKey).slice(0, limit);
}

export async function checkIn(userID: string): Promise<Attendance> {
  validateUserID(userID);

  try {
    const deviceInfo = getCurrentDeviceInfo();
    await httpClient.post<BackendResponse<unknown>>(
      `/attendance-module/checkIn/${encodeURIComponent(userID)}`,
      { deviceInfo },
      { headers: getAttendanceRequestHeaders() },
    );
  } catch (error) {
    throw normalizeAttendanceError(
      error,
      'Không thể Check-in. Vui lòng thử lại.',
      'ATTENDANCE_CHECKIN_FAILED',
    );
  }

  const records = await refreshCurrentMonthAttendance(userID);
  const todayRecord = getTodayRecordFrom(records);

  if (!todayRecord) {
    throw createAttendanceError(
      'Check-in thành công nhưng chưa đồng bộ được bản ghi hôm nay.',
      'ATTENDANCE_SYNC_FAILED',
    );
  }

  return todayRecord;
}

export async function checkOut(userID: string): Promise<Attendance> {
  validateUserID(userID);

  try {
    const deviceInfo = getCurrentDeviceInfo();
    await httpClient.post<BackendResponse<unknown>>(
      `/attendance-module/checkOut/${encodeURIComponent(userID)}`,
      { deviceInfo },
      { headers: getAttendanceRequestHeaders() },
    );
  } catch (error) {
    throw normalizeAttendanceError(
      error,
      'Không thể Check-out. Vui lòng thử lại.',
      'ATTENDANCE_CHECKOUT_FAILED',
    );
  }

  const records = await refreshCurrentMonthAttendance(userID);
  const todayRecord = getTodayRecordFrom(records);

  if (!todayRecord) {
    throw createAttendanceError(
      'Check-out thành công nhưng chưa đồng bộ được bản ghi hôm nay.',
      'ATTENDANCE_SYNC_FAILED',
    );
  }

  return todayRecord;
}
