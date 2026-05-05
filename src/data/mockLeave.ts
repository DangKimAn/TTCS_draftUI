import type { LeaveRequest } from '../types';

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-001',
    userEmail: 'employee@timesheet.com',
    type: 'Annual Leave',
    startDate: '2026-04-12',
    endDate: '2026-04-12',
    totalDays: 1,
    reason: 'Giai quyet cong viec gia dinh.',
    status: 'Approved',
    isUnpaid: false,
    createdAt: '2026-04-01T08:00:00.000Z',
  },
  {
    id: 'leave-002',
    userEmail: 'employee@timesheet.com',
    type: 'Personal Leave',
    startDate: '2026-04-18',
    endDate: '2026-04-19',
    totalDays: 2,
    reason: 'Di cong tac gia dinh ngan ngay.',
    status: 'Pending',
    isUnpaid: false,
    createdAt: '2026-04-04T09:30:00.000Z',
  },
  {
    id: 'leave-003',
    userEmail: 'employee@timesheet.com',
    type: 'Sick Leave',
    startDate: '2026-03-21',
    endDate: '2026-03-21',
    totalDays: 1,
    reason: 'Suc khoe khong on dinh.',
    status: 'Rejected',
    isUnpaid: false,
    createdAt: '2026-03-18T02:15:00.000Z',
  },
];

export const mockLeavePolicy: { totalAnnualDays: number } = {
  totalAnnualDays: 12,
};
