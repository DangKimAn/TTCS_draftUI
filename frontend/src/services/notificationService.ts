import axios from 'axios';
import type { AppError } from '../types';
import httpClient from '../utils/httpClient';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface BackendNotification {
  notificationID?: string;
  id?: string;
  senderID?: string | null;
  receiverID?: string;
  content?: string;
  createdAt?: string | Date;
  isRead?: boolean;
  relatedType?: string | null;
  sender?: {
    userID?: string;
    username?: string;
    email?: string;
    linkAvatar?: string | null;
  } | null;
  targetUrl?: string;
  actionUrl?: string;
  relatedUrl?: string;
  url?: string;
  link?: string;
  path?: string;
}

export interface NotificationItem {
  notificationID: string;
  id: string;
  senderID: string | null;
  receiverID: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  relatedType: string | null;
  sender?: BackendNotification['sender'];
  targetUrl?: string;
}

export async function getMyNotifications(userID: string): Promise<NotificationItem[]> {
  validateId(userID, 'Missing user ID.', 'NOTIFICATION_USER_MISSING');

  try {
    const response = await httpClient.get<
      BackendResponse<BackendNotification[]> | BackendNotification[]
    >(`/notification/received/${encodeURIComponent(userID)}`);
    const data = unwrapBackendData<BackendNotification[]>(response.data);

    return normalizeNotifications(data);
  } catch (error) {
    throw normalizeNotificationError(
      error,
      'Khong the tai danh sach thong bao.',
      'NOTIFICATION_LIST_FAILED',
    );
  }
}

export async function getUnreadCount(userID: string): Promise<number> {
  validateId(userID, 'Missing user ID.', 'NOTIFICATION_USER_MISSING');

  try {
    const response = await httpClient.get<
      BackendResponse<{ count?: number } | number> | { count?: number } | number
    >(`/notification/unread-count/${encodeURIComponent(userID)}`);
    const data = unwrapBackendData<{ count?: number } | number>(response.data);
    const count = typeof data === 'number' ? data : Number(data?.count || 0);

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    throw normalizeNotificationError(
      error,
      'Khong the tai so thong bao chua doc.',
      'NOTIFICATION_COUNT_FAILED',
    );
  }
}

export async function markAsRead(notificationID: string): Promise<NotificationItem> {
  validateId(notificationID, 'Missing notification ID.', 'NOTIFICATION_ID_MISSING');

  try {
    const response = await httpClient.patch<
      BackendResponse<BackendNotification> | BackendNotification
    >(`/notification/read/${encodeURIComponent(notificationID)}`);
    const data = unwrapBackendData<BackendNotification>(response.data);

    if (!data) {
      throw createNotificationError(
        'Notification response is empty.',
        'NOTIFICATION_RESPONSE_INVALID',
      );
    }

    return normalizeNotification(data);
  } catch (error) {
    throw normalizeNotificationError(
      error,
      'Khong the danh dau thong bao da doc.',
      'NOTIFICATION_MARK_READ_FAILED',
    );
  }
}

function createNotificationError(message: string, code?: string): AppError {
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

function normalizeNotificationError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode = 'NOTIFICATION_API_FAILED',
): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;

    if (status === 401 || status === 403) {
      return createNotificationError(message, 'NOTIFICATION_UNAUTHORIZED');
    }

    if (status === 404) {
      return createNotificationError(message, 'NOTIFICATION_NOT_FOUND');
    }

    return createNotificationError(message, fallbackCode);
  }

  if (error instanceof Error) {
    return createNotificationError(error.message || fallbackMessage, fallbackCode);
  }

  return createNotificationError(fallbackMessage, fallbackCode);
}

function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function validateId(value: string, message: string, code: string): void {
  if (!value) {
    throw createNotificationError(message, code);
  }
}

function normalizeNotifications(data: BackendNotification[] | undefined): NotificationItem[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(normalizeNotification)
    .filter((item) => item.id)
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

function normalizeNotification(payload: BackendNotification): NotificationItem {
  const id = payload.notificationID || payload.id || '';

  return {
    notificationID: id,
    id,
    senderID: payload.senderID || null,
    receiverID: payload.receiverID || '',
    content: payload.content || '',
    createdAt: toIsoString(payload.createdAt),
    isRead: Boolean(payload.isRead),
    relatedType: payload.relatedType || null,
    sender: payload.sender || null,
    targetUrl: getTargetUrl(payload),
  };
}

function getTargetUrl(payload: BackendNotification): string | undefined {
  return (
    payload.targetUrl ||
    payload.actionUrl ||
    payload.relatedUrl ||
    payload.url ||
    payload.link ||
    payload.path ||
    undefined
  );
}

function toIsoString(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
