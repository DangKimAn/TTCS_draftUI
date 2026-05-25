import axios from 'axios';
import httpClient from '../utils/httpClient';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface HrUserPayload {
  fullName: string;
  email: string;
  password?: string;
  departmentName?: string;
  role: string;
  salaryCoefficient: number;
  leaveBalance: number;
  isActive: boolean;
}

export interface HrImportError {
  row: number;
  message: string;
}

export interface HrImportSuccess {
  row: number;
  employeeCode: string;
  username: string;
}

export interface HrImportResult {
  importedCount: number;
  errors: HrImportError[];
  successes: HrImportSuccess[];
}

interface LeaveTypePayload {
  code: string;
  name: string;
  isPaid: boolean;
  status?: string;
}

export async function fetchHrUsers(departments: Array<Record<string, any>> = []) {
  try {
    const response = await httpClient.get<BackendResponse<Record<string, any>[]> | Record<string, any>[]>(
      '/user/',
    );
    const users = unwrapBackendData<Record<string, any>[]>(response.data);

    return Array.isArray(users) ? users.map((user) => normalizeHrEmployee(user, departments)).filter((user) => user.id) : [];
  } catch (error) {
    throw normalizeHrError(error, 'Không thể tải danh sách nhân viên.');
  }
}

export async function fetchDepartments() {
  try {
    const response = await httpClient.get<BackendResponse<Record<string, any>[]> | Record<string, any>[]>('/department');
    const departments = unwrapBackendData<Record<string, any>[]>(response.data);
    return Array.isArray(departments) ? departments : [];
  } catch (error) {
    throw normalizeHrError(error, 'Không thể tải danh sách phòng ban.');
  }
}

export async function createHrUser(payload: HrUserPayload, departments: Array<Record<string, any>> = []) {
  const backendPayload = buildUserPayload(payload, true);

  try {
    const response = await httpClient.post<BackendResponse<Record<string, any>> | Record<string, any>>(
      '/user/',
      backendPayload,
    );
    const user = unwrapBackendData<Record<string, any>>(response.data);

    return user ? normalizeHrEmployee(user, departments) : null;
  } catch (error) {
    if (!shouldTryRegisterFallback(error)) {
      throw normalizeHrError(error, 'Không thể tạo nhân viên.');
    }

    try {
      const response = await httpClient.post<BackendResponse<Record<string, any>> | Record<string, any>>(
        '/auth/register',
        {
          email: backendPayload.email,
          username: backendPayload.username,
          password: backendPayload.password,
          departmentName: backendPayload.departmentName,
        },
      );
      const user = unwrapBackendData<Record<string, any>>(response.data);

      return user ? normalizeHrEmployee(user, departments) : null;
    } catch (fallbackError) {
      throw normalizeHrError(fallbackError, 'Không thể tạo nhân viên.');
    }
  }
}

export async function importHrUsersExcel(file: File): Promise<HrImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await httpClient.post<BackendResponse<HrImportResult> | HrImportResult>(
      '/employees/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const result = unwrapBackendData<any>(response.data);

    return {
      importedCount: Number(result?.importedCount || 0),
      errors: Array.isArray(result?.errors) ? result.errors : [],
      successes: Array.isArray(result?.successes)
        ? result.successes.map((s: any) => ({
            row: Number(s.row || 0),
            employeeCode: s.userID ? `EMP-${String(s.userID).slice(0, 8).toUpperCase()}` : 'EMP',
            username: String(s.username || ''),
          }))
        : [],
    };
  } catch (error) {
    const normalizedError = normalizeHrError(error, 'Không thể import nhân viên từ Excel.') as Error & {
      details?: unknown;
      importErrors?: HrImportError[];
      importSuccesses?: HrImportSuccess[];
    };

    if (axios.isAxiosError(error)) {
      normalizedError.importErrors = getImportErrors(error.response?.data);
      const data = error.response?.data as any;
      normalizedError.importSuccesses = Array.isArray(data?.successes)
        ? data.successes.map((s: any) => ({
            row: Number(s.row || 0),
            employeeCode: s.userID ? `EMP-${String(s.userID).slice(0, 8).toUpperCase()}` : 'EMP',
            username: String(s.username || ''),
          }))
        : [];
    } else {
      normalizedError.importErrors = getImportErrors((error as { details?: unknown })?.details);
      normalizedError.importSuccesses = [];
    }

    throw normalizedError;
  }
}

export async function updateHrUser(
  userID: string,
  payload: HrUserPayload,
  departments: Array<Record<string, any>> = [],
) {
  try {
    const response = await httpClient.patch<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/user/${encodeURIComponent(userID)}`,
      buildUserPayload(payload, false),
    );
    const user = unwrapBackendData<Record<string, any>>(response.data);

    return user ? normalizeHrEmployee(user, departments) : null;
  } catch (error) {
    throw normalizeHrError(error, 'Không thể cập nhật nhân viên.');
  }
}

export async function deactivateHrUser(userID: string) {
  try {
    const response = await httpClient.patch<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/user/deactivate/${encodeURIComponent(userID)}`,
    );

    return unwrapBackendData<Record<string, any>>(response.data);
  } catch (error) {
    throw normalizeHrError(error, 'Không thể vô hiệu hóa nhân viên.');
  }
}

export async function activateHrUser(userID: string) {
  try {
    const response = await httpClient.patch<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/user/activate/${encodeURIComponent(userID)}`,
    );

    return unwrapBackendData<Record<string, any>>(response.data);
  } catch (error) {
    throw normalizeHrError(error, 'Không thể kích hoạt lại nhân viên.');
  }
}

export async function fetchHrLeaveTypes() {
  try {
    const response = await httpClient.get<BackendResponse<Record<string, any>[]> | Record<string, any>[]>(
      '/type-leave',
      { params: { includeInactive: true } },
    );
    const leaveTypes = unwrapBackendData<Record<string, any>[]>(response.data);

    return Array.isArray(leaveTypes) ? leaveTypes.map(normalizeHrLeaveType).filter((type) => type.id) : [];
  } catch (error) {
    throw normalizeHrError(error, 'Không thể tải loại nghỉ phép.');
  }
}

export async function createHrLeaveType(payload: LeaveTypePayload) {
  try {
    const response = await httpClient.post<BackendResponse<Record<string, any>> | Record<string, any>>(
      '/type-leave',
      buildLeaveTypePayload(payload),
    );
    const leaveType = unwrapBackendData<Record<string, any>>(response.data);

    return leaveType ? normalizeHrLeaveType(leaveType) : null;
  } catch (error) {
    throw normalizeHrError(error, 'Không thể tạo loại nghỉ phép.');
  }
}

export async function updateHrLeaveType(typeLeaveID: string, payload: LeaveTypePayload) {
  try {
    const response = await httpClient.patch<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/type-leave/${encodeURIComponent(typeLeaveID)}`,
      buildLeaveTypePayload(payload),
    );
    const leaveType = unwrapBackendData<Record<string, any>>(response.data);

    return leaveType ? normalizeHrLeaveType(leaveType) : null;
  } catch (error) {
    throw normalizeHrError(error, 'Không thể cập nhật loại nghỉ phép.');
  }
}

export async function deleteHrLeaveType(typeLeaveID: string) {
  try {
    const response = await httpClient.delete<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/type-leave/${encodeURIComponent(typeLeaveID)}`,
    );
    const leaveType = unwrapBackendData<Record<string, any>>(response.data);

    return leaveType ? normalizeHrLeaveType(leaveType) : null;
  } catch (error) {
    throw normalizeHrError(error, 'Không thể xóa loại nghỉ phép.');
  }
}

export async function activateHrLeaveType(typeLeaveID: string) {
  try {
    const response = await httpClient.patch<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/type-leave/${encodeURIComponent(typeLeaveID)}/activate`,
    );
    const leaveType = unwrapBackendData<Record<string, any>>(response.data);

    return leaveType ? normalizeHrLeaveType(leaveType) : null;
  } catch (error) {
    throw normalizeHrError(error, 'Không thể kích hoạt loại nghỉ phép.');
  }
}

export async function deactivateHrLeaveType(typeLeaveID: string) {
  try {
    const response = await httpClient.patch<BackendResponse<Record<string, any>> | Record<string, any>>(
      `/type-leave/${encodeURIComponent(typeLeaveID)}/deactivate`,
    );
    const leaveType = unwrapBackendData<Record<string, any>>(response.data);

    return leaveType ? normalizeHrLeaveType(leaveType) : null;
  } catch (error) {
    throw normalizeHrError(error, 'Không thể vô hiệu hóa loại nghỉ phép.');
  }
}

export async function fetchHrLeaveRequests() {
  try {
    const response = await httpClient.get('/leave-application/all');
    return unwrapBackendData(response.data) || [];
  } catch (error) {
    throw normalizeHrError(error, 'Không thể tải danh sách đơn nghỉ phép.');
  }
}

export async function exportPayrollReport(month: number, year: number) {
  try {
    const response = await httpClient.get('/payroll/export', {
      params: { month, year, format: 'csv' },
      responseType: 'blob',
    });

    downloadBlob(response.data, getDownloadFileName(response.headers, `payroll_report_${month}_${year}.csv`));
  } catch (error) {
    throw normalizeHrError(error, 'Không thể xuất báo cáo lương.');
  }
}

export async function fetchPayrollPreview(month: number, year: number) {
  try {
    const response = await httpClient.get<BackendResponse<Record<string, any>[]> | Record<string, any>[]>(
      '/payroll/export',
      { params: { month, year, format: 'json' } },
    );
    const rows = unwrapBackendData<Record<string, any>[]>(response.data);

    return Array.isArray(rows) ? rows.map(normalizePayrollPreviewRow) : [];
  } catch (error) {
    throw normalizeHrError(error, 'Không thể tải dữ liệu xem trước bảng lương.');
  }
}

export async function exportPayrollReportExcel(month: number, year: number) {
  try {
    const response = await httpClient.get('/payroll/export-excel', {
      params: { month, year },
      responseType: 'blob',
    });

    downloadBlob(
      response.data,
      getDownloadFileName(response.headers, `payroll_report_${month}_${year}.xlsx`),
    );
  } catch (error) {
    throw normalizeHrError(error, 'Không thể xuất báo cáo lương Excel.');
  }
}

export async function exportDepartmentTimesheet(departmentID: string, month: number, year: number) {
  try {
    const response = await httpClient.get(`/time-sheet/export-department/${encodeURIComponent(departmentID)}`, {
      params: { month, year, format: 'csv' },
      responseType: 'blob',
    });

    downloadBlob(response.data, getDownloadFileName(response.headers, `timesheet_department_${departmentID}_${month}_${year}.csv`));
  } catch (error) {
    throw normalizeHrError(error, 'Không thể xuất timesheet phòng ban.');
  }
}

export async function exportDepartmentTimesheetExcel(
  departmentID: string,
  month: number,
  year: number,
) {
  try {
    const response = await httpClient.get(
      `/time-sheet/export-department-excel/${encodeURIComponent(departmentID)}`,
      {
        params: { month, year },
        responseType: 'blob',
      },
    );

    downloadBlob(
      response.data,
      getDownloadFileName(
        response.headers,
        `timesheet_department_${departmentID}_${month}_${year}.xlsx`,
      ),
    );
  } catch (error) {
    throw normalizeHrError(error, 'Không thể xuất timesheet phòng ban Excel.');
  }
}

export function normalizeHrEmployee(payload: Record<string, any>, departments: Array<Record<string, any>> = []) {
  const id = payload.userID || payload.id || payload.employeeId || '';
  const departmentId =
    payload.departmentID ||
    payload.departmentId ||
    findDepartmentIdByName(departments, payload.departmentName || payload.department?.departmentName) ||
    '';
  const role = normalizeRole(payload.role?.nameRole || payload.nameRole || payload.roleName || payload.role);
  const fullName = payload.fullName || payload.name || payload.username || payload.email || id;

  return {
    ...payload,
    id,
    employeeCode: payload.employeeCode || (id ? `EMP-${String(id).slice(0, 8).toUpperCase()}` : 'EMP'),
    fullName,
    email: payload.email || '',
    departmentId,
    title: payload.title || roleToTitle(role),
    role,
    status: payload.status || (payload.isActive === false ? 'Inactive' : 'Active'),
    isActive: payload.isActive !== false,
    leaveBalance: Number(payload.leaveBalance ?? payload.remainDaysofLeave ?? 0),
    monthlyHours: Number(payload.monthlyHours ?? 0),
    salaryCoefficient: Number(payload.salaryCoefficient ?? 0),
    phone: payload.phone || '--',
    location: payload.location || '--',
    startedAt: payload.startedAt || payload.createdAt || '',
    profileStatus: payload.profileStatus || 'verified',
  };
}

export function normalizeHrLeaveType(payload: Record<string, any>) {
  const id = payload.typeLeaveID || payload.id || '';
  const name = payload.nameTypeLeave || payload.name || '';
  const hasSalary = Number(payload.hasSalary ?? (payload.isPaid ? 1 : 0));

  return {
    ...payload,
    id,
    typeLeaveID: id,
    code: payload.code || buildLeaveTypeCode(name || id),
    name,
    isPaid: hasSalary > 0,
    hasSalary,
    defaultDaysPerYear: Number(payload.defaultDaysPerYear ?? (hasSalary > 0 ? 12 : 0)),
    status: payload.status || 'Active',
    note: payload.note || '',
    hasUsageHistory: Boolean(payload.hasUsageHistory || payload.applications?.length),
  };
}

function buildUserPayload(payload: HrUserPayload, includePassword: boolean) {
  const data: Record<string, any> = {
    email: payload.email.trim().toLowerCase(),
    username: payload.fullName.trim(),
    roleName: toBackendRoleName(payload.role),
    departmentName: payload.departmentName || undefined,
    salaryCoefficient: Number(payload.salaryCoefficient || 0),
    remainDaysofLeave: Number(payload.leaveBalance || 0),
    totalDaysofLeave: Number(payload.leaveBalance || 0),
    isActive: payload.isActive,
  };

  if (includePassword || payload.password) {
    data.password = payload.password;
  }

  return data;
}

function buildLeaveTypePayload(payload: LeaveTypePayload) {
  return {
    code: payload.code.trim().toUpperCase(),
    nameTypeLeave: payload.name.trim(),
    hasSalary: payload.isPaid ? 1 : 0,
  };
}

function normalizePayrollPreviewRow(payload: Record<string, any>) {
  const employee = payload.employee || {};
  const totalHours = Number(payload.totalHours ?? payload.normalHours ?? 0);
  const totalExtraHours = Number(payload.totalExtraHours ?? payload.overtimeHours ?? 0);
  const salaryCoefficient = Number(employee.salaryCoefficient ?? payload.salaryCoefficient ?? 0);

  return {
    ...payload,
    id: payload.payrollID || payload.id || `${employee.userID || payload.userID || 'payroll'}-${payload.month || ''}-${payload.year || ''}`,
    employeeId: employee.userID || payload.userID || '',
    employeeCode: employee.employeeCode || (employee.userID ? `EMP-${String(employee.userID).slice(0, 8).toUpperCase()}` : '--'),
    fullName: employee.username || employee.fullName || employee.name || employee.email || payload.userID || '--',
    departmentId: employee.departmentID || employee.department?.departmentID || payload.departmentId || '',
    departmentName: employee.department?.departmentName || payload.departmentName || '--',
    totalHours,
    totalExtraHours,
    salaryCoefficient,
    totalSalaryByHours: payload.totalSalaryByHours ?? payload.salary ?? payload.totalSalary ?? '--',
    dataStatus: payload.dataStatus || 'Ready',
  };
}

function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function normalizeHrError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const message = formatHrErrorMessage(
      getResponseMessage(error.response?.data) || getNetworkErrorMessage(error) || error.message || fallbackMessage,
    );
    const normalizedError = new Error(message) as Error & { code?: string };
    normalizedError.code = String(error.response?.status || error.code || 'HR_API_FAILED');
    return normalizedError;
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

function getNetworkErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error) || error.response) {
    return null;
  }

  if (error.code === 'ECONNABORTED') {
    return 'API backend phản hồi quá lâu. Vui lòng kiểm tra server backend và kết nối database.';
  }

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Không kết nối được API backend. Hãy kiểm tra backend đang chạy tại http://localhost:3000.';
  }

  return null;
}

function shouldTryRegisterFallback(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 400 || status === 403 || status === 404 || status === 405 || status === 500;
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

function formatHrErrorMessage(message: string) {
  const normalized = normalizeText(message).replace(/[.。]+$/g, '');

  const knownMessages: Record<string, string> = {
    'email da ton tai': 'Email đã tồn tại.',
    'email already exists': 'Email đã tồn tại.',
    'phong ban khong ton tai': 'Phòng ban không tồn tại.',
    'department not found': 'Phòng ban không tồn tại.',
    'user not found': 'Không tìm thấy nhân viên.',
    'employee not found': 'Không tìm thấy nhân viên.',
  };

  return knownMessages[normalized] || message;
}

function getImportErrors(data: unknown): HrImportError[] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const payload = data as Record<string, any>;
  const candidates = [
    payload.errors,
    payload.response?.errors,
    payload.data?.errors,
    payload.data?.response?.errors,
  ];
  const errors = candidates.find(Array.isArray);

  return Array.isArray(errors)
    ? errors.map((error) => ({
        row: Number(error.row || 0),
        message: formatHrErrorMessage(String(error.message || 'Dòng dữ liệu không hợp lệ')),
      }))
    : [];
}

function normalizeRole(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (normalized === 'manager') {
    return 'manager';
  }

  if (normalized === 'admin' || normalized === 'hr') {
    return 'hr';
  }

  return 'employee';
}

function toBackendRoleName(role: string) {
  if (role === 'employee') {
    return 'employee';
  }

  if (role === 'hr') {
    return 'admin';
  }

  return role;
}

function roleToTitle(role: string) {
  switch (role) {
    case 'manager':
      return 'Manager';
    case 'hr':
      return 'HR';
    default:
      return 'Nhân viên';
  }
}

function findDepartmentIdByName(departments: Array<Record<string, any>>, departmentName?: string) {
  const normalizedName = normalizeText(departmentName);

  if (!normalizedName) {
    return '';
  }

  const department = departments.find((item) => normalizeText(item.name || item.departmentName) === normalizedName);
  return department?.id || department?.departmentID || '';
}

function buildLeaveTypeCode(value: string) {
  return String(value || 'LEAVE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'LEAVE';
}

function normalizeText(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getDownloadFileName(headers: Record<string, any>, fallback: string) {
  const contentDisposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  const fileNameMatch = typeof contentDisposition === 'string'
    ? contentDisposition.match(/filename="?([^";]+)"?/i)
    : null;

  return fileNameMatch?.[1] || fallback;
}

function downloadBlob(data: BlobPart, fileName: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fetchSystemLogs(limit: number = 200, skip: number = 0, startDate?: string, endDate?: string) {
  try {
    const response = await httpClient.get('/system-log/all', {
      params: { limit, skip, startDate, endDate },
    });
    return unwrapBackendData(response.data) || { logs: [], total: 0 };
  } catch (error) {
    throw normalizeHrError(error, 'Khong the tai nhat ky he thong.');
  }
}

export async function toggleSystemLogAnomaly(logID: string) {
  try {
    const response = await httpClient.patch(`/system-log/toggle-anomaly/${encodeURIComponent(logID)}`);
    return unwrapBackendData(response.data);
  } catch (error) {
    throw normalizeHrError(error, 'Khong the thay doi trang thai log.');
  }
}
