import { mockLeavePolicy, mockLeaveRequests } from '../data/mockLeave';
import type { LeaveRequest } from '../types';

const LEAVE_STORAGE_KEY = 'timesheet_pro_leave_requests';

type LeaveRequestPayload = Pick<
  LeaveRequest,
  'type' | 'startDate' | 'endDate' | 'totalDays' | 'reason'
> & {
  userEmail: string;
  isUnpaid?: boolean;
};

function parseStoredLeaveRequests(): LeaveRequest[] | null {
  const rawValue = localStorage.getItem(LEAVE_STORAGE_KEY);

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

function ensureLeaveRequests(): LeaveRequest[] {
  const parsed = parseStoredLeaveRequests();

  if (parsed) {
    return parsed;
  }

  localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(mockLeaveRequests));
  return [...mockLeaveRequests];
}

function writeLeaveRequests(nextRequests: LeaveRequest[]): void {
  localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(nextRequests));
}

export function calculateLeaveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function getLeaveRequestsByUser(userEmail: string): LeaveRequest[] {
  return ensureLeaveRequests()
    .filter((item) => item.userEmail === userEmail)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getLeaveSummary(userEmail: string): {
  totalAnnualDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
} {
  const requests = getLeaveRequestsByUser(userEmail);
  const approved = requests
    .filter((item) => item.status === 'Approved' && !item.isUnpaid)
    .reduce((total, item) => total + item.totalDays, 0);
  const pending = requests
    .filter((item) => item.status === 'Pending')
    .reduce((total, item) => total + item.totalDays, 0);

  return {
    totalAnnualDays: mockLeavePolicy.totalAnnualDays,
    usedDays: approved,
    pendingDays: pending,
    remainingDays: Math.max(mockLeavePolicy.totalAnnualDays - approved, 0),
  };
}

export function createLeaveRequest(payload: LeaveRequestPayload): LeaveRequest {
  const requests = ensureLeaveRequests();
  const nextRequest: LeaveRequest = {
    id: `leave-${payload.userEmail}-${Date.now()}`,
    userEmail: payload.userEmail,
    type: payload.type,
    startDate: payload.startDate,
    endDate: payload.endDate,
    totalDays: payload.totalDays,
    reason: payload.reason,
    status: 'Pending',
    isUnpaid: Boolean(payload.isUnpaid),
    createdAt: new Date().toISOString(),
  };

  const nextRequests = [nextRequest, ...requests];
  writeLeaveRequests(nextRequests);
  return nextRequest;
}
