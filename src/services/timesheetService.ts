import { mockTimesheetSummaries } from '../data/mockTimesheet';
import type {
  AppError,
  Attendance,
  CorrectionRequest,
  TimesheetPeriodData,
  TimesheetRow,
  TimesheetSummary,
} from '../types';
import { getUserAttendanceRecords } from './attendanceService';
import {
  getCorrectionByAttendanceId,
  getCorrectionsByUser,
  hasPendingCorrections,
} from './correctionService';
import {
  getPeriodConfig,
  isDateWithinRange,
  isEarlyOut,
  isLate,
} from '../utils/dateUtils';

const TIMESHEET_STORAGE_KEY = 'timesheet_pro_timesheet_summaries';

type PeriodType = 'week' | 'month' | string;

function parseStoredSummaries(): TimesheetSummary[] | null {
  const rawValue = localStorage.getItem(TIMESHEET_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function ensureTimesheetSummaries(): TimesheetSummary[] {
  const parsed = parseStoredSummaries();

  if (parsed) {
    return parsed;
  }

  localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(mockTimesheetSummaries));
  return [...mockTimesheetSummaries];
}

function writeTimesheetSummaries(nextSummaries: TimesheetSummary[]): void {
  localStorage.setItem(TIMESHEET_STORAGE_KEY, JSON.stringify(nextSummaries));
}

function getPeriodKey(
  periodType: PeriodType,
  periodConfig: { startKey: string; endKey: string },
): string {
  return `${periodType}-${periodConfig.startKey}-${periodConfig.endKey}`;
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

export function getTimesheetStatus(
  userEmail: string,
  periodType: PeriodType,
  anchorDate = new Date(),
): TimesheetSummary | null {
  const periodConfig = getPeriodConfig(periodType, anchorDate);
  const periodKey = getPeriodKey(periodType, periodConfig);

  return (
    ensureTimesheetSummaries().find(
      (item) => item.userEmail === userEmail && item.periodKey === periodKey,
    ) || null
  );
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
  const summary = getTimesheetStatus(userEmail, periodType, anchorDate);

  const rows = attendanceRecords.map((record): TimesheetRow => {
    const correction = getCorrectionByAttendanceId(record.id);
    const warnings = getAttendanceWarnings(record, correction);

    return {
      ...record,
      warnings,
      correction,
      timesheetStatus:
        summary?.status === 'Submitted' || summary?.status === 'Approved' || summary?.status === 'Rejected'
          ? summary.status
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

  return {
    rows,
    corrections,
    summary: summary || {
      id: `timesheet-${userEmail}-${periodType}-${periodConfig.startKey}`,
      userEmail,
      periodType,
      periodLabel: periodConfig.label,
      periodKey: getPeriodKey(periodType, periodConfig),
      attendanceIds: rows.map((row) => row.id),
      status: 'Draft',
      submittedAt: null,
    },
    period: periodConfig,
    stats: {
      totalDays: rows.length,
      validDays: validRows,
      warningDays: warningRows,
      pendingCorrections,
    },
  };
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

export function submitTimesheet(
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

  const summaries = ensureTimesheetSummaries();
  const nextSummary: TimesheetSummary = {
    id: currentSummary?.id || `timesheet-${userEmail}-${periodType}-${periodConfig.startKey}`,
    userEmail,
    periodType,
    periodLabel: periodConfig.label,
    periodKey,
    attendanceIds: records.map((record) => record.id),
    status: 'Submitted',
    submittedAt: new Date().toISOString(),
  };

  const existingIndex = summaries.findIndex(
    (item) => item.userEmail === userEmail && item.periodKey === periodKey,
  );

  const nextSummaries = [...summaries];

  if (existingIndex >= 0) {
    nextSummaries[existingIndex] = nextSummary;
  } else {
    nextSummaries.push(nextSummary);
  }

  writeTimesheetSummaries(nextSummaries);
  return nextSummary;
}

export function hasPendingCorrectionsInPeriod(userEmail: string, attendanceIds: string[]): boolean {
  return hasPendingCorrections(userEmail, attendanceIds);
}
