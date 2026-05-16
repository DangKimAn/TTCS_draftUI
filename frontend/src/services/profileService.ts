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

const PROFILE_STORAGE_KEY = 'timesheet_pro_employee_profiles';

// --- API layer ---

export async function fetchProfileByUserID(userID: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await httpClient.get<Record<string, unknown>>(`/user/getByID/${encodeURIComponent(userID)}`);
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as { data: Record<string, unknown> }).data ?? null;
    }
    return payload ?? null;
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
      return (payload as { data: Record<string, unknown> }).data ?? null;
    }
    return payload ?? null;
  } catch {
    return null;
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

/** Demo fallback – dùng email để tra cứu trong localStorage/mock */
export async function getEmployeeProfile(email: string): Promise<Record<string, unknown> | null> {
  const apiProfile = await fetchProfileByEmail(email);
  if (apiProfile) return apiProfile;
  return ensureProfiles().find((item) => item['email'] === email) ?? null;
}

/** Demo fallback – cập nhật profile trong localStorage, KHÔNG gọi API */
export function updateEmployeeProfile(
  email: string,
  updates: Record<string, unknown>,
): Record<string, unknown> | null {
  const profiles = ensureProfiles();
  const nextProfiles = profiles.map((item) =>
    item['email'] === email ? { ...item, ...updates } : item,
  );

  writeProfiles(nextProfiles);
  return nextProfiles.find((item) => item['email'] === email) ?? null;
}
