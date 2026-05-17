import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout } from '../authService';
import axios from 'axios';
import { saveAuthSession, clearAuthSession } from '../../utils/storage';
vi.mock('axios', () => {
  const mAxiosInstance = { post: vi.fn(), get: vi.fn() };
  return {
    default: {
      create: vi.fn(() => mAxiosInstance),
      isAxiosError: vi.fn(() => false),
    },
  };
});

vi.mock('../../utils/storage', () => ({
  saveAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  getAuthSession: vi.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('TC-01: sends login request and sets session on success', async () => {
      const mockResponse = {
        data: {
          data: {
            accessToken: 'mock-token',
            refreshToken: 'mock-refresh-token',
            user: { id: 'u1', email: 'test@test.com', role: 'manager' }
          }
        }
      };
      const mAxiosInstance = axios.create();
      (mAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const result = await login('test@test.com', 'password');

      expect(mAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password'
      });
      
      expect(saveAuthSession).toHaveBeenCalledWith(expect.objectContaining({
        token: 'mock-token',
        role: 'manager'
      }), true);
      
      expect(result.token).toBe('mock-token');
    });

    it('TC-02: throws error when login fails', async () => {
      const error = new Error('Invalid credentials');
      const mAxiosInstance = axios.create();
      (mAxiosInstance.post as any).mockRejectedValue(error);

      await expect(login('test@test.com', 'wrong-pass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('TC-03: clears local storage session', () => {
      logout();
      expect(clearAuthSession).toHaveBeenCalled();
    });
  });
});
