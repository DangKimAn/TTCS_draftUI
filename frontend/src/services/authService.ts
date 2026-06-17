import axios from 'axios';
import { API_CONFIG } from '../config/api';
import type { AppError, AuthSession, Role, User } from '../types';
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
  updateAuthSession,
} from '../utils/storage';

interface LoginCredentials {
  email: string;
  password: string;
  provider?: string;
}

interface LoginResult {
  token: string;
  accessToken: string;
  refreshToken: string;
  provider: string;
  session: AuthSession;
  user: User;
}

interface BackendResponse<T> {
  statusCode?: number;
  message?: string;
  data?: T;
}

interface AuthPayload {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: Record<string, any>;
  [key: string]: any;
}

interface JwtPayload {
  exp?: number;
  userID?: string;
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  roleId?: string | null;
  departmentID?: string | null;
}

const TOKEN_EXPIRY_LEEWAY_SECONDS = 30;

const authClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

function createAuthError(message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  return error;
}

function getResponseMessage(data: any): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data.message)) {
    return data.message.join(', ');
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (typeof data.error === 'string') {
    return data.error;
  }

  return null;
}

function normalizeAuthError(error: any, fallbackMessage: string): AppError {
  if (axios.isAxiosError(error)) {
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;
    return createAuthError(message, String(error.response?.status || error.code || 'AUTH_ERROR'));
  }

  if (error instanceof Error) {
    return createAuthError(error.message || fallbackMessage);
  }

  return createAuthError(fallbackMessage);
}

function unwrapBackendData<T>(response: BackendResponse<T> | T): T | undefined {
  if (response && typeof response === 'object' && ('data' in response || 'statusCode' in response)) {
    const envelope = response as BackendResponse<T>;

    if (envelope.data !== undefined) {
      return envelope.data;
    }

    if ('accessToken' in response || 'refreshToken' in response || 'user' in response) {
      return response as T;
    }

    return undefined;
  }

  return response as T;
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = atob(padded);

  return decodeURIComponent(
    decoded
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
}

function decodeJwtPayload(token?: string): JwtPayload | null {
  if (!token) {
    return null;
  }

  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isAccessTokenValid(token?: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 > Date.now() + TOKEN_EXPIRY_LEEWAY_SECONDS * 1000;
}

function normalizeRole(value: any): Role {
  const rawRole =
    typeof value === 'object' && value !== null
      ? (value as { nameRole?: string; roleName?: string; role?: string }).nameRole ||
        (value as { roleName?: string }).roleName ||
        (value as { role?: string }).role
      : value;

  const normalized = String(rawRole || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (normalized === 'employee' || normalized === 'emloyee') {
    return 'employee';
  }

  if (normalized === 'manager') {
    return 'manager';
  }

  if (normalized === 'hr' || normalized === 'humanresources' || normalized === 'nhansu') {
    return 'hr';
  }

  if (normalized === 'admin') {
    return 'admin';
  }

  return 'unknown';
}

function getAccessToken(session?: AuthSession | null): string {
  return session?.accessToken || session?.token || '';
}

function createSessionFromPayload(
  payload: AuthPayload | undefined,
  provider: string,
  previousSession?: AuthSession | null,
  fallbackEmail = '',
): AuthSession {
  const accessToken = payload?.accessToken || payload?.token;
  const refreshToken = payload?.refreshToken || previousSession?.refreshToken;
  const jwtPayload = decodeJwtPayload(accessToken);
  const user = payload?.user || {};
  const userID =
    user.userID ||
    user.id ||
    jwtPayload?.userID ||
    jwtPayload?.id ||
    previousSession?.userID ||
    previousSession?.id ||
    '';
  const email = user.email || jwtPayload?.email || previousSession?.email || fallbackEmail;
  const roleCandidate =
    user.role ||
    user.roleName ||
    user.nameRole ||
    user.role?.nameRole ||
    user.role?.roleName ||
    jwtPayload?.role ||
    user.roleId ||
    jwtPayload?.roleId;
  const normalizedRole = normalizeRole(roleCandidate);
  const role = normalizedRole === 'unknown' && previousSession?.role
    ? previousSession.role
    : normalizedRole;

  if (!accessToken || !refreshToken || !userID || !email) {
    throw createAuthError('Phản hồi đăng nhập không đầy đủ token hoặc thông tin người dùng.', 'AUTH_RESPONSE_INVALID');
  }

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    id: userID,
    userID,
    email,
    name: user.name || user.fullName || user.username || jwtPayload?.username || previousSession?.name || email,
    role,
    roleId: user.roleId || jwtPayload?.roleId || previousSession?.roleId || null,
    departmentId:
      user.departmentId ||
      user.departmentID ||
      jwtPayload?.departmentID ||
      previousSession?.departmentId ||
      '',
    managedEmployeeIds: Array.isArray(user.managedEmployeeIds)
      ? user.managedEmployeeIds
      : previousSession?.managedEmployeeIds || [],
    permissions: Array.isArray(user.permissions) ? user.permissions : previousSession?.permissions || [],
    isActive: user.isActive ?? previousSession?.isActive ?? true,
    provider: provider || previousSession?.provider || 'password',
    loggedInAt: previousSession?.loggedInAt || new Date().toISOString(),
  };
}

function createLoginResult(session: AuthSession): LoginResult {
  return {
    token: session.accessToken,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    provider: session.provider,
    session,
    user: {
      id: session.userID,
      email: session.email,
      name: session.name,
      role: session.role,
      departmentId: session.departmentId,
      managedEmployeeIds: session.managedEmployeeIds,
      permissions: session.permissions,
      isActive: session.isActive,
    },
  };
}

export async function login(email: string, password: string, provider?: string): Promise<LoginResult>;
export async function login(credentials: LoginCredentials): Promise<LoginResult>;
export async function login(
  emailOrCredentials: string | LoginCredentials,
  passwordValue = '',
  providerValue = 'password',
): Promise<LoginResult> {
  const credentials =
    typeof emailOrCredentials === 'string'
      ? {
          email: emailOrCredentials,
          password: passwordValue,
          provider: providerValue,
        }
      : emailOrCredentials;
  const { email, password, provider = 'password' } = credentials;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const response = await authClient.post<BackendResponse<AuthPayload> | AuthPayload>('/auth/login', {
      email: normalizedEmail,
      password,
    });
    const session = createSessionFromPayload(
      unwrapBackendData<AuthPayload>(response.data),
      provider,
      null,
      normalizedEmail,
    );

    saveAuthSession(session, true);
    return createLoginResult(session);
  } catch (error) {
    throw normalizeAuthError(error, 'Đăng nhập thất bại. Vui lòng thử lại.');
  }
}

export function completeSsoLogin(payload: AuthPayload, provider = 'sso'): LoginResult {
  const session = createSessionFromPayload(payload, provider, null);

  saveAuthSession(session, true);
  return createLoginResult(session);
}

export async function logout(): Promise<void> {
  const session = getAuthSession();
  const accessToken = getAccessToken(session);

  try {
    if (accessToken) {
      await authClient.post(
        '/auth/logout',
        undefined,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    }
  } catch (error) {
    console.error('[authService] Logout API failed:', error);
  } finally {
    clearAuthSession();
  }
}

export async function refreshToken(userID?: string): Promise<AuthSession | null> {
  const currentSession = getAuthSession();
  const targetUserID = userID || currentSession?.userID || currentSession?.id;

  if (!currentSession?.refreshToken || !targetUserID) {
    clearAuthSession();
    return null;
  }

  try {
    const response = await authClient.post<BackendResponse<AuthPayload> | AuthPayload>(
      `/auth/refreshToken/${encodeURIComponent(targetUserID)}`,
      { refreshToken: currentSession.refreshToken },
    );
    const nextSession = createSessionFromPayload(
      unwrapBackendData<AuthPayload>(response.data),
      currentSession.provider,
      currentSession,
      currentSession.email,
    );

    updateAuthSession(nextSession);
    return nextSession;
  } catch (error) {
    clearAuthSession();
    throw normalizeAuthError(error, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
}

async function verifySessionOnServer(session: AuthSession): Promise<AuthSession | null> {
  const accessToken = getAccessToken(session);
  const userID = session.userID || session.id;

  if (!accessToken || !userID) {
    return null;
  }

  const response = await authClient.get<BackendResponse<Record<string, any>> | Record<string, any>>(
    `/user/getByID/${encodeURIComponent(userID)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const verifiedUser = unwrapBackendData<Record<string, any>>(response.data);

  if (!verifiedUser) {
    return null;
  }

  const verifiedSession = createSessionFromPayload(
    {
      accessToken,
      refreshToken: session.refreshToken,
      user: verifiedUser,
    },
    session.provider,
    session,
    session.email,
  );

  if (verifiedSession.isActive === false) {
    return null;
  }

  updateAuthSession(verifiedSession);
  return verifiedSession;
}

export async function verifyAuthSession(): Promise<AuthSession | null> {
  const session = getAuthSession();
  const accessToken = getAccessToken(session);

  if (!session || !accessToken) {
    clearAuthSession();
    return null;
  }

  let sessionToVerify = session;

  if (!isAccessTokenValid(accessToken)) {
    if (!session.refreshToken) {
      clearAuthSession();
      return null;
    }

    try {
      sessionToVerify = await refreshToken(session.userID || session.id);
    } catch {
      return null;
    }
  }

  if (!sessionToVerify) {
    return null;
  }

  try {
    return await verifySessionOnServer(sessionToVerify);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401 && sessionToVerify.refreshToken) {
      try {
        const nextSession = await refreshToken(sessionToVerify.userID || sessionToVerify.id);

        if (nextSession) {
          return await verifySessionOnServer(nextSession);
        }
      } catch {
        clearAuthSession();
        return null;
      }
    }

    clearAuthSession();
    return null;
  }
}

export async function sendForgotPasswordCode(email: string): Promise<void> {
  try {
    await authClient.post('/auth/forgot-password/send-code', { email });
  } catch (error) {
    throw normalizeAuthError(error, 'Không thể gửi mã xác nhận. Vui lòng thử lại.');
  }
}

export async function verifyForgotPasswordCode(email: string, code: string): Promise<void> {
  try {
    await authClient.post('/auth/forgot-password/verify-code', { email, code });
  } catch (error) {
    throw normalizeAuthError(error, 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
  }
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  try {
    await authClient.post('/auth/forgot-password/reset', { email, code, newPassword });
  } catch (error) {
    throw normalizeAuthError(error, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
  }
}
