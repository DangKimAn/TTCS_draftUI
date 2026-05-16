/**
 * hrService.mockFallback.test.ts
 *
 * Kiểm tra logic mock-fallback gate trong HRDashboard loading:
 * - Khi ENABLE_MOCK_FALLBACK=false và API lỗi → employees = []
 * - Khi ENABLE_MOCK_FALLBACK=true và API lỗi → employees dùng mock
 *
 * NOTE: Đây là unit test thuần cho helper logic, không render component.
 */
import { describe, it, expect } from 'vitest';

// Helper mirror lấy từ HRDashboard loading logic
function resolveDashboardEmployees(
  apiResult: unknown[] | null,
  mockData: unknown[],
  enableMockFallback: boolean,
): unknown[] {
  if (apiResult && apiResult.length > 0) {
    return apiResult;
  }
  if (enableMockFallback) {
    return mockData;
  }
  return [];
}

const MOCK_EMPLOYEES = [{ id: 'e1', fullName: 'Nguyen Van A' }];

describe('HRDashboard mock-fallback gate', () => {
  it('TC-01: API thành công → dùng dữ liệu thực, không dùng mock', () => {
    const apiData = [{ id: 'api-user-1', fullName: 'Real User' }];
    const result = resolveDashboardEmployees(apiData, MOCK_EMPLOYEES, false);
    expect(result).toEqual(apiData);
    expect(result).not.toEqual(MOCK_EMPLOYEES);
  });

  it('TC-02: API lỗi (null) + ENABLE_MOCK_FALLBACK=false → trả về mảng rỗng', () => {
    const result = resolveDashboardEmployees(null, MOCK_EMPLOYEES, false);
    expect(result).toEqual([]);
  });

  it('TC-03: API lỗi (null) + ENABLE_MOCK_FALLBACK=true → trả về mock data', () => {
    const result = resolveDashboardEmployees(null, MOCK_EMPLOYEES, true);
    expect(result).toEqual(MOCK_EMPLOYEES);
  });

  it('TC-04: API trả về mảng rỗng + ENABLE_MOCK_FALLBACK=false → trả về rỗng', () => {
    const result = resolveDashboardEmployees([], MOCK_EMPLOYEES, false);
    expect(result).toEqual([]);
  });

  it('TC-05: API trả về mảng rỗng + ENABLE_MOCK_FALLBACK=true → fallback mock', () => {
    const result = resolveDashboardEmployees([], MOCK_EMPLOYEES, true);
    expect(result).toEqual(MOCK_EMPLOYEES);
  });
});
