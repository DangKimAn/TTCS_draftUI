import { describe, expect, it, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
const patchMock = vi.fn();

vi.mock('../../utils/httpClient', () => ({
  default: {
    get: getMock,
    patch: patchMock,
  },
}));

vi.mock('../../config/api', () => ({
  API_CONFIG: {
    ENABLE_MOCK_FALLBACK: false,
  },
}));

describe('profileService mock fallback gate', () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset();
    patchMock.mockReset();
  });

  it('does not seed localStorage mock profiles when the profile API fails and mock fallback is disabled', async () => {
    getMock.mockRejectedValue(new Error('API unavailable'));
    const { getEmployeeProfile } = await import('../profileService');

    await expect(getEmployeeProfile('employee@example.com')).resolves.toBeNull();
    expect(localStorage.getItem('timesheet_pro_employee_profiles')).toBeNull();
  });

  it('updates personal profile through the real API when mock fallback is disabled', async () => {
    patchMock.mockResolvedValue({
      data: {
        data: {
          userID: 'user-1',
          email: 'employee@example.com',
          username: 'Employee',
          phone: '0900000000',
        },
      },
    });
    const { updateEmployeeProfile } = await import('../profileService');

    await expect(
      updateEmployeeProfile('employee@example.com', { phone: '0900000000' }),
    ).resolves.toEqual(expect.objectContaining({ phone: '0900000000' }));
    expect(patchMock).toHaveBeenCalledWith(
      '/user/me',
      expect.objectContaining({ phone: '0900000000' }),
    );
    expect(localStorage.getItem('timesheet_pro_employee_profiles')).toBeNull();
  });
});
