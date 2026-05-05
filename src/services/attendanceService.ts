import { createMockAttendanceSeed } from '../data/mockAttendance';
import type { AppError, Attendance, User } from '../types';
import { getCurrentDeviceInfo as readCurrentDeviceInfo } from '../utils/deviceInfo';
import {
  calculateWorkingHours as calculateWorkingHoursValue,
  formatTimeFromIso,
  getTodayDateKey,
} from '../utils/timeUtils';

const ATTENDANCE_STORAGE_KEY = 'timesheet_pro_attendance_records';
const ATTENDANCE_IP_KEY = 'timesheet_pro_mock_ip';
const DEFAULT_IP = '192.168.1.20';
const ALTERNATE_IP = '10.0.0.15';

type AttendanceUser = Pick<User, 'email' | 'role'>;

function parseStoredRecords(): Attendance[] | null {
  const storedValue = localStorage.getItem(ATTENDANCE_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeRecords(nextRecords: Attendance[]): void {
  const previousRaw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);

  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(nextRecords));
  } catch (error) {
    if (previousRaw) {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, previousRaw);
    }

    const saveError = new Error('Attendance save failed') as AppError;
    saveError.code = 'ATTENDANCE_SAVE_FAILED';
    throw saveError;
  }
}

function ensureSeedRecords(): Attendance[] {
  const parsedRecords = parseStoredRecords();

  if (parsedRecords) {
    return parsedRecords;
  }

  const seedRecords = createMockAttendanceSeed();
  writeRecords(seedRecords);
  return seedRecords;
}

function getAllRecords(): Attendance[] {
  return ensureSeedRecords();
}

function createAttendanceId(userEmail: string, dateKey: string): string {
  return `attendance-${userEmail}-${dateKey}`;
}

function createUnauthorizedError(): AppError {
  const error = new Error('Attendance is only available for employee role') as AppError;
  error.code = 'ATTENDANCE_UNAUTHORIZED';
  return error;
}

function ensureEmployeeUser(user: AttendanceUser | null | undefined): asserts user is AttendanceUser {
  if (!user?.email || user?.role !== 'employee') {
    throw createUnauthorizedError();
  }
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

export function getUserAttendanceRecords(userEmail: string): Attendance[] {
  return getAllRecords()
    .filter((record) => record.userEmail === userEmail)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function markMissingCheckoutRecords(userEmail: string): {
  updatedCount: number;
  records: Attendance[];
} {
  const records = getAllRecords();
  const todayKey = getTodayDateKey();
  let updatedCount = 0;

  const nextRecords = records.map((record): Attendance => {
    const shouldMarkMissing =
      record.userEmail === userEmail &&
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
      note: 'Ban da quen check-out. Vui long giai trinh.',
    };
  });

  if (updatedCount > 0) {
    writeRecords(nextRecords);
  }

  return {
    updatedCount,
    records: nextRecords
      .filter((record) => record.userEmail === userEmail)
      .sort((left, right) => right.date.localeCompare(left.date)),
  };
}

export function getTodayAttendance(userEmail: string): Attendance | null {
  const todayKey = getTodayDateKey();

  return getAllRecords().find(
    (record) => record.userEmail === userEmail && record.date === todayKey,
  ) || null;
}

export function getAttendanceHistory(userEmail: string, limit = 7): Attendance[] {
  return getUserAttendanceRecords(userEmail).slice(0, limit);
}

export async function checkIn(user: AttendanceUser): Promise<Attendance> {
  ensureEmployeeUser(user);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 700);
  });

  const records = getAllRecords();
  const todayKey = getTodayDateKey();
  const existingRecord = records.find(
    (record) => record.userEmail === user.email && record.date === todayKey,
  );

  if (existingRecord?.status === 'Working' || (existingRecord?.checkInTime && !existingRecord?.checkOutTime)) {
    const error = new Error('Already checked in') as AppError;
    error.code = 'ALREADY_CHECKED_IN';
    throw error;
  }

  if (existingRecord?.checkInTime && existingRecord?.checkOutTime) {
    const error = new Error('Attendance already completed') as AppError;
    error.code = 'ALREADY_COMPLETED';
    throw error;
  }

  const serverTime = new Date().toISOString();
  const ipAddress = getCurrentMockIp();
  const deviceInfo = getCurrentDeviceInfoFromBrowser();

  const nextRecord: Attendance = {
    id: createAttendanceId(user.email, todayKey),
    userEmail: user.email,
    date: todayKey,
    checkInTime: formatTimeFromIso(serverTime),
    checkOutTime: null,
    totalHours: null,
    status: 'Working',
    serverTimeAtCheckIn: serverTime,
    serverTimeAtCheckOut: null,
    ipAddressAtCheckIn: ipAddress,
    ipAddressAtCheckOut: null,
    deviceInfoAtCheckIn: deviceInfo,
    deviceInfoAtCheckOut: null,
    hasIpWarning: false,
    note: '',
  };

  const filteredRecords = records.filter(
    (record) => !(record.userEmail === user.email && record.date === todayKey),
  );

  writeRecords([...filteredRecords, nextRecord]);
  return nextRecord;
}

export async function checkOut(user: AttendanceUser): Promise<Attendance> {
  ensureEmployeeUser(user);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 700);
  });

  const records = getAllRecords();
  const todayKey = getTodayDateKey();
  const currentRecord = records.find(
    (record) => record.userEmail === user.email && record.date === todayKey,
  );

  if (!currentRecord?.checkInTime) {
    const error = new Error('Not checked in yet') as AppError;
    error.code = 'NOT_CHECKED_IN';
    throw error;
  }

  if (currentRecord.checkOutTime) {
    const error = new Error('Attendance already completed') as AppError;
    error.code = 'ALREADY_COMPLETED';
    throw error;
  }

  const serverTime = new Date().toISOString();
  const ipAddress = getCurrentMockIp();
  const deviceInfo = getCurrentDeviceInfoFromBrowser();
  const hasIpWarning =
    Boolean(currentRecord.ipAddressAtCheckIn) &&
    currentRecord.ipAddressAtCheckIn !== ipAddress;

  const normalizedTotalHours = calculateWorkingHoursValue(
    currentRecord.serverTimeAtCheckIn,
    serverTime,
  );

  const note = hasIpWarning
    ? 'IP thay doi bat thuong, quan ly se xem xet.'
    : currentRecord.note || '';

  const updatedRecord: Attendance = {
    ...currentRecord,
    checkOutTime: formatTimeFromIso(serverTime),
    totalHours: normalizedTotalHours,
    status: 'Completed',
    serverTimeAtCheckOut: serverTime,
    ipAddressAtCheckOut: ipAddress,
    deviceInfoAtCheckOut: deviceInfo,
    hasIpWarning,
    note,
  };

  const nextRecords = records.map((record) =>
    record.id === updatedRecord.id ? updatedRecord : record,
  );

  writeRecords(nextRecords);
  return updatedRecord;
}
