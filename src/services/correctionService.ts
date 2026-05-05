import { mockCorrections } from '../data/mockCorrections';
import type { AppError, CorrectionRequest } from '../types';

const CORRECTION_STORAGE_KEY = 'timesheet_pro_corrections';

type CorrectionRequestPayload = Pick<
  CorrectionRequest,
  'userEmail' | 'attendanceId' | 'date' | 'reason'
> &
  Partial<Pick<CorrectionRequest, 'requestedCheckIn' | 'requestedCheckOut'>>;

function parseStoredCorrections(): CorrectionRequest[] | null {
  const rawValue = localStorage.getItem(CORRECTION_STORAGE_KEY);

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

function ensureCorrections(): CorrectionRequest[] {
  const parsed = parseStoredCorrections();

  if (parsed) {
    return parsed;
  }

  localStorage.setItem(CORRECTION_STORAGE_KEY, JSON.stringify(mockCorrections));
  return [...mockCorrections];
}

function writeCorrections(nextCorrections: CorrectionRequest[]): void {
  localStorage.setItem(CORRECTION_STORAGE_KEY, JSON.stringify(nextCorrections));
}

export function getCorrectionsByUser(userEmail: string): CorrectionRequest[] {
  return ensureCorrections()
    .filter((item) => item.userEmail === userEmail)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getCorrectionByAttendanceId(attendanceId: string): CorrectionRequest | null {
  return ensureCorrections().find((item) => item.attendanceId === attendanceId) || null;
}

export function hasPendingCorrections(userEmail: string, attendanceIds: string[] = []): boolean {
  return ensureCorrections().some(
    (item) =>
      item.userEmail === userEmail &&
      attendanceIds.includes(item.attendanceId) &&
      item.status === 'Pending',
  );
}

export function createCorrectionRequest(payload: CorrectionRequestPayload): CorrectionRequest {
  const corrections = ensureCorrections();

  const duplicatePending = corrections.find(
    (item) =>
      item.userEmail === payload.userEmail &&
      item.attendanceId === payload.attendanceId &&
      item.status === 'Pending',
  );

  if (duplicatePending) {
    const error = new Error('Pending correction already exists') as AppError;
    error.code = 'CORRECTION_PENDING_EXISTS';
    throw error;
  }

  const nextCorrection: CorrectionRequest = {
    id: `correction-${payload.userEmail}-${payload.date}-${Date.now()}`,
    userEmail: payload.userEmail,
    attendanceId: payload.attendanceId,
    date: payload.date,
    requestedCheckIn: payload.requestedCheckIn || null,
    requestedCheckOut: payload.requestedCheckOut || null,
    reason: payload.reason,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  writeCorrections([...corrections, nextCorrection]);
  return nextCorrection;
}
