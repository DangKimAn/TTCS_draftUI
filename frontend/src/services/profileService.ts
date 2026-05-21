/**
 * profileService.ts
 *
 * Ưu tiên gọi API thật (GET /user/getByID/:userID).
 * Nếu API không có hoặc lỗi → fallback về localStorage/mock.
 *
 * NOTE: getEmployeeProfile / updateEmployeeProfile dùng localStorage làm
 * demo fallback vì profile update chưa có endpoint riêng (chỉ có PATCH /user/:id
 * cho admin). Các hàm này được giữ lại để UI không bị vỡ nhưng được ghi rõ là
 * "demo fallback", KHÔNG phải production-ready.
 */

import httpClient from '../utils/httpClient';
import { mockEmployeeProfiles } from '../data/mockProfile';
import { API_CONFIG } from '../config/api';

const PROFILE_STORAGE_KEY = 'timesheet_pro_employee_profiles';

// --- API layer ---

export async function fetchProfileByUserID(userID: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await httpClient.get<Record<string, unknown>>(`/user/getByID/${encodeURIComponent(userID)}`);
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return normalizeEmployeeProfile((payload as { data: Record<string, unknown> }).data);
    }
    return normalizeEmployeeProfile(payload);
  } catch {
    // API không khả dụng hoặc lỗi network → caller tự quyết fallback
    return null;
  }
}

export async function fetchProfileByEmail(email: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await httpClient.get<Record<string, unknown>>(`/user/getByEmail/${encodeURIComponent(email)}`);
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return normalizeEmployeeProfile((payload as { data: Record<string, unknown> }).data);
    }
    return normalizeEmployeeProfile(payload);
  } catch {
    return null;
  }
}

export async function uploadAvatar(file: File): Promise<Record<string, unknown> | null> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await httpClient.post<Record<string, unknown>>('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return normalizeEmployeeProfile((payload as { data: Record<string, unknown> }).data);
    }
    return normalizeEmployeeProfile(payload);
  } catch (error) {
    throw new Error('Không thể tải lên ảnh đại diện.');
  }
}

// --- Demo-fallback layer (localStorage + mockProfile) ---
// Chỉ dùng cho những trường hợp chưa có endpoint API phù hợp.

function parseStoredProfiles(): Record<string, unknown>[] | null {
  const rawValue = localStorage.getItem(PROFILE_STORAGE_KEY);

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

function ensureProfiles(): Record<string, unknown>[] {
  const parsed = parseStoredProfiles();

  if (parsed) {
    return parsed;
  }

  // Demo fallback: khởi tạo từ mock nếu localStorage trống
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(mockEmployeeProfiles));
  return [...mockEmployeeProfiles];
}

function writeProfiles(nextProfiles: Record<string, unknown>[]) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));
}

/** Tra cứu profile qua API, fallback về localStorage nếu bật mock */
export async function getEmployeeProfile(email: string): Promise<Record<string, unknown> | null> {
  let apiProfile = await fetchProfileByEmail(email);

  if (!apiProfile && API_CONFIG.ENABLE_MOCK_FALLBACK) {
    apiProfile = normalizeEmployeeProfile(
      ensureProfiles().find((item) => item['email'] === email) ?? null,
    );
  }

  return resolveManagerUsername(apiProfile);
}

/** Demo fallback – cập nhật profile trong localStorage, KHÔNG gọi API (chỉ gọi khi mock) */
export async function updateEmployeeProfile(
  email: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const payload = buildSelfUpdatePayload(updates);

  if (!API_CONFIG.ENABLE_MOCK_FALLBACK) {
    return updateProfileViaApi(payload);
  }

  try {
    return await updateProfileViaApi(payload);
  } catch {
    // Demo-only fallback below.
  }

  const profiles = ensureProfiles();
  const nextProfiles = profiles.map((item) =>
    item['email'] === email ? { ...item, ...payload } : item,
  );

  writeProfiles(nextProfiles);
  return resolveManagerUsername(normalizeEmployeeProfile(
    nextProfiles.find((item) => item['email'] === email) ?? null,
  ));
}

async function resolveManagerUsername(profile: Record<string, unknown> | null): Promise<Record<string, unknown> | null> {
  if (profile && profile.manager && profile.manager !== '--') {
    if (String(profile.manager).includes('-') || String(profile.manager).length > 10) {
      try {
        const managerProfile = await fetchProfileByUserID(String(profile.manager));
        if (managerProfile && managerProfile.username) {
          profile.manager = String(managerProfile.username);
        } else if (managerProfile && managerProfile.name) {
          profile.manager = String(managerProfile.name);
        }
      } catch (e) {
        // Ignore errors if manager profile cannot be fetched
      }
    }
  }
  return profile;
}

async function updateProfileViaApi(payload: Record<string, unknown>) {
  const response = await httpClient.patch<Record<string, unknown>>('/user/me', payload);
  const responsePayload = response.data;

  if (responsePayload && typeof responsePayload === 'object' && 'data' in responsePayload) {
    return resolveManagerUsername(normalizeEmployeeProfile((responsePayload as { data: Record<string, unknown> }).data));
  }

  return resolveManagerUsername(normalizeEmployeeProfile(responsePayload));
}

function buildSelfUpdatePayload(updates: Record<string, unknown>) {
  return {
    linkAvatar: normalizeNullableString(updates.linkAvatar ?? updates.avatar),
    phone: normalizeNullableString(updates.phone),
    address: normalizeNullableString(updates.address),
    emergencyContact: normalizeNullableString(updates.emergencyContact),
    birthday: normalizeNullableString(updates.birthday),
    ...(updates.password ? { password: updates.password } : {}),
    ...(updates.oldPassword ? { oldPassword: updates.oldPassword } : {}),
  };
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeEmployeeProfile(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) {
    return null;
  }

  const role = payload.role as Record<string, unknown> | undefined;
  const department = payload.department as Record<string, unknown> | undefined;
  const name = String(payload.name || payload.fullName || payload.username || payload.email || '');
  const userID = String(payload.userID || payload.id || payload.employeeId || '');
  const roleName = String(role?.nameRole || payload.roleName || payload.role || 'employee');

  return {
    ...payload,
    id: userID,
    employeeId: userID ? `EMP-${userID.slice(0, 8).toUpperCase()}` : String(payload.employeeId || ''),
    name,
    fullName: name,
    email: String(payload.email || ''),
    avatar: payload.linkAvatar || payload.avatar || '',
    phone: String(payload.phone || ''),
    address: String(payload.address || ''),
    emergencyContact: String(payload.emergencyContact || ''),
    birthday: payload.birthday || '',
    department: department?.departmentName || payload.departmentName || payload.departmentID || '--',
    position: payload.position || roleName,
    manager: payload.manager || (department?.manager as any)?.username || department?.managerID || payload.managerID || '--',
    joinDate: payload.createdAt ? new Date(String(payload.createdAt)).toLocaleDateString('vi-VN') : (payload.joinDate || ''),
    accountStatus: payload.isActive === false ? 'Inactive' : 'Active',
    role: normalizeRole(roleName),
  };
}

function normalizeRole(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'hr') return 'hr';
  if (normalized === 'manager') return 'manager';
  return 'employee';
}
