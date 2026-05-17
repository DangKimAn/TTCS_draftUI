import axios from 'axios';
import type { AppError, LeaveRequest, RequestStatus } from '../types';
import httpClient from '../utils/httpClient';

type BackendLeaveStatus = 'pending' | 'approved' | 'rejected' | string;
type ReviewStatus = 'Approved' | 'Rejected' | 'approved' | 'rejected' | 'Denied' | 'denied';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface BackendTypeLeave {
  typeLeaveID?: string;
  id?: string;
  nameTypeLeave?: string;
  name?: string;
  hasSalary?: number | boolean;
  isActive?: boolean;
  status?: string;
}

interface BackendLeaveApplication {
  leaveApplicationID?: string;
  id?: string;
  senderID?: string;
  reviewerID?: string | null;
  typeLeaveID?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  totalDays?: number;
  reason?: string;
  status?: BackendLeaveStatus;
  reasonReject?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  typeLeave?: BackendTypeLeave | null;
  sender?: Record<string, any> | null;
}

export interface LeaveType {
  id: string;
  typeLeaveID: string;
  name: string;
  nameTypeLeave: string;
  isPaid: boolean;
  isActive?: boolean;
  hasSalary: number;
}

export interface LeaveBalance {
  totalAnnualDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  history: LeaveRequest[];
  totalDaysOfLeave: number;
  remainDaysOfLeave: number;
}

export interface LeaveRequestPayload {
  typeLeaveID?: string;
  leaveTypeId?: string;
  type?: string;
  startDate: string;
  endDate: string;
  reason: string;
  totalDays?: number;
  userEmail?: string;
  isUnpaid?: boolean;
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

export async function createLeaveRequest(
  userID: string,
  payload: LeaveRequestPayload,
): Promise<LeaveRequest> {
  validateId(userID, 'Missing user ID.', 'LEAVE_USER_MISSING');

  let typeLeaveID = payload.typeLeaveID || payload.leaveTypeId;

  if (!typeLeaveID) {
    typeLeaveID = await findLeaveTypeIdByName(payload.type);
  }

  if (!typeLeaveID) {
    throw createLeaveError('Vui lòng chọn loại nghỉ phép.', 'LEAVE_TYPE_MISSING');
  }

  try {
    const response = await httpClient.post<
      BackendResponse<BackendLeaveApplication> | BackendLeaveApplication
    >(
      `/leave-application/${encodeURIComponent(userID)}`,
      {
        typeLeaveID,
        startDate: payload.startDate,
        endDate: payload.endDate,
        reason: payload.reason.trim(),
      },
    );
    const data = unwrapBackendData<BackendLeaveApplication>(response.data);

    if (!data) {
      throw createLeaveError('Leave application response is empty.', 'LEAVE_RESPONSE_INVALID');
    }

    return normalizeLeaveRequest(data);
  } catch (error) {
    throw normalizeLeaveError(error, 'Không thể tạo đơn nghỉ phép.', 'LEAVE_CREATE_FAILED');
  }
}

export async function getMyLeaveRequests(userID: string): Promise<LeaveRequest[]> {
  validateId(userID, 'Missing user ID.', 'LEAVE_USER_MISSING');

  try {
    const response = await httpClient.get<
      BackendResponse<BackendLeaveApplication[]> | BackendLeaveApplication[]
    >(`/leave-application/my/${encodeURIComponent(userID)}`);
    const data = unwrapBackendData<BackendLeaveApplication[]>(response.data);

    return normalizeLeaveRequests(data);
  } catch (error) {
    throw normalizeLeaveError(error, 'Không thể tải danh sách đơn nghỉ phép.', 'LEAVE_LIST_FAILED');
  }
}

export async function getLeaveBalance(userID: string): Promise<LeaveBalance> {
  validateId(userID, 'Missing user ID.', 'LEAVE_USER_MISSING');

  try {
    const response = await httpClient.get<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/leave-application/balance/${encodeURIComponent(userID)}`,
    );
    const data = unwrapBackendData<Record<string, any>>(response.data);

    if (!data) {
      throw createLeaveError('Leave balance response is empty.', 'LEAVE_RESPONSE_INVALID');
    }

    return normalizeLeaveBalance(data);
  } catch (error) {
    throw normalizeLeaveError(error, 'Không thể tải số dư phép.', 'LEAVE_BALANCE_FAILED');
  }
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  try {
    const response = await httpClient.get<BackendResponse<BackendTypeLeave[]> | BackendTypeLeave[]>(
      '/type-leave',
    );
    const data = unwrapBackendData<BackendTypeLeave[]>(response.data);

    return Array.isArray(data) ? data.map(normalizeLeaveType).filter((item) => item.id) : [];
  } catch (error) {
    throw normalizeLeaveError(error, 'Không thể tải loại nghỉ phép.', 'LEAVE_TYPES_FAILED');
  }
}

export async function reviewLeave(
  leaveID: string,
  status: ReviewStatus,
  reason?: string,
): Promise<LeaveRequest> {
  validateId(leaveID, 'Missing leave application ID.', 'LEAVE_ID_MISSING');

  const backendStatus = normalizeBackendReviewStatus(status);

  try {
    const response = await httpClient.patch<
      BackendResponse<BackendLeaveApplication> | BackendLeaveApplication
    >(
      `/leave-application/review/${encodeURIComponent(leaveID)}`,
      {
        status: backendStatus,
        reasonReject: backendStatus === 'rejected' ? reason?.trim() || '' : undefined,
      },
    );
    const data = unwrapBackendData<BackendLeaveApplication>(response.data);

    if (!data) {
      throw createLeaveError('Leave review response is empty.', 'LEAVE_RESPONSE_INVALID');
    }

    return normalizeLeaveRequest(data);
  } catch (error) {
    throw normalizeLeaveError(error, 'Không thể cập nhật trạng thái đơn nghỉ phép.', 'LEAVE_REVIEW_FAILED');
  }
}

export async function getDepartmentLeaveRequests(departmentID: string): Promise<LeaveRequest[]> {
  validateId(departmentID, 'Missing department ID.', 'LEAVE_DEPARTMENT_MISSING');

  try {
    const response = await httpClient.get<
      BackendResponse<BackendLeaveApplication[]> | BackendLeaveApplication[]
    >(`/leave-application/department/${encodeURIComponent(departmentID)}`);
    const data = unwrapBackendData<BackendLeaveApplication[]>(response.data);

    return normalizeLeaveRequests(data);
  } catch (error) {
    throw normalizeLeaveError(
      error,
      'Không thể tải đơn nghỉ phép cần duyệt.',
      'LEAVE_DEPARTMENT_LIST_FAILED',
    );
  }
}

export async function getLeaveRequestsByUser(userID: string): Promise<LeaveRequest[]> {
  return getMyLeaveRequests(userID);
}

export async function getLeaveSummary(userID: string): Promise<LeaveBalance> {
  return getLeaveBalance(userID);
}

async function findLeaveTypeIdByName(typeName?: string): Promise<string> {
  const normalizedTypeName = normalizeText(typeName);

  if (!normalizedTypeName) {
    return '';
  }

  const leaveTypes = await getLeaveTypes();
  const matchedType = leaveTypes.find((item) => normalizeText(item.name) === normalizedTypeName);

  return matchedType?.id || '';
}

function createLeaveError(message: string, code?: string): AppError {
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

function normalizeLeaveError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode = 'LEAVE_API_FAILED',
): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;

    if (status === 400) {
      return createLeaveError(message, 'LEAVE_BAD_REQUEST');
    }

    if (status === 401 || status === 403) {
      return createLeaveError(message, 'LEAVE_UNAUTHORIZED');
    }

    if (status === 404) {
      return createLeaveError(message, 'LEAVE_NOT_FOUND');
    }

    if (status === 409) {
      return createLeaveError(message, 'LEAVE_CONFLICT');
    }

    return createLeaveError(message, fallbackCode);
  }

  if (error instanceof Error) {
    return createLeaveError(error.message || fallbackMessage, fallbackCode);
  }

  return createLeaveError(fallbackMessage, fallbackCode);
}

function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function validateId(value: string, message: string, code: string): void {
  if (!value) {
    throw createLeaveError(message, code);
  }
}

function normalizeLeaveRequests(data: BackendLeaveApplication[] | undefined): LeaveRequest[] {
  return Array.isArray(data) ? data.map(normalizeLeaveRequest) : [];
}

function normalizeLeaveRequest(payload: BackendLeaveApplication): LeaveRequest {
  const id = payload.leaveApplicationID || payload.id || '';
  const sender = payload.sender || {};
  const employeeId = payload.senderID || sender.userID || sender.id || '';
  const typeLeave = payload.typeLeave || {};
  const leaveTypeId = payload.typeLeaveID || typeLeave.typeLeaveID || typeLeave.id || '';
  const status = normalizeRequestStatus(payload.status);
  const reviewedAt = payload.reviewedAt || undefined;
  const request = {
    id,
    userEmail: sender.email || employeeId,
    employeeId,
    code: buildLeaveCode(payload.createdAt, id),
    leaveTypeId,
    type: typeLeave.nameTypeLeave || typeLeave.name || payload.typeLeaveID || 'Nghỉ phép',
    startDate: toDateKey(payload.startDate),
    endDate: toDateKey(payload.endDate),
    totalDays: toNumber(payload.duration ?? payload.totalDays, 0),
    reason: payload.reason || '',
    status,
    isUnpaid: typeLeave.hasSalary !== undefined ? Number(typeLeave.hasSalary) <= 0 : false,
    createdAt: payload.createdAt || '',
    approvedAt: status === 'Approved' ? reviewedAt : undefined,
    rejectedAt: status === 'Rejected' ? reviewedAt : undefined,
    rejectionReason: payload.reasonReject || payload.rejectionReason || undefined,
  } as LeaveRequest & Record<string, any>;

  request.employeeName = sender.fullName || sender.name || sender.username || sender.email || employeeId;
  request.employeeEmail = sender.email || '';
  request.departmentId = sender.departmentID || sender.departmentId || '';
  request.leaveBalance = toNumber(sender.remainDaysofLeave, 0);
  request.sender = sender;

  return request;
}

function normalizeLeaveBalance(payload: Record<string, any>): LeaveBalance {
  const history = normalizeLeaveRequests(payload.history);
  const totalAnnualDays = toNumber(payload.totalDaysOfLeave ?? payload.totalAnnualDays, 0);
  const remainingDays = toNumber(payload.remainDaysOfLeave ?? payload.remainingDays, 0);
  const usedDays = toNumber(
    payload.usedDays,
    Math.max(totalAnnualDays - remainingDays, 0),
  );
  const pendingDays = toNumber(
    payload.pendingDays,
    history
      .filter((item) => item.status === 'Pending')
      .reduce((total, item) => total + item.totalDays, 0),
  );

  return {
    totalAnnualDays,
    usedDays,
    pendingDays,
    remainingDays,
    history,
    totalDaysOfLeave: totalAnnualDays,
    remainDaysOfLeave: remainingDays,
  };
}

function normalizeLeaveType(payload: BackendTypeLeave): LeaveType {
  const id = payload.typeLeaveID || payload.id || '';
  const name = payload.nameTypeLeave || payload.name || 'Nghỉ phép';
  const hasSalary = Number(payload.hasSalary ?? 0);

  return {
    id,
    typeLeaveID: id,
    name,
    nameTypeLeave: name,
    isPaid: hasSalary > 0,
    isActive: payload.isActive ?? payload.status !== 'Inactive',
    hasSalary,
  };
}

function normalizeRequestStatus(status?: BackendLeaveStatus): RequestStatus {
  switch (String(status || '').trim().toLowerCase()) {
    case 'approved':
    case 'accepted':
      return 'Approved';
    case 'rejected':
    case 'denied':
      return 'Rejected';
    case 'pending':
      return 'Pending';
    default:
      return 'Pending';
  }
}

function normalizeBackendReviewStatus(status: ReviewStatus): 'approved' | 'rejected' {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'approved' || normalizedStatus === 'accepted') {
    return 'approved';
  }

  return 'rejected';
}

function buildLeaveCode(createdAt: string | undefined, id: string): string {
  const date = createdAt ? new Date(createdAt) : new Date();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
  const suffix = id ? id.slice(0, 8).toUpperCase() : String(Date.now()).slice(-6);

  return `LV-${year}${String(month).padStart(2, '0')}-${suffix}`;
}

function toDateKey(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeText(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
