import { create } from 'zustand';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
} from '../services/notificationService';
import type { NotificationItem } from '../services/notificationService';

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  loadForUser: (userID: string) => Promise<NotificationItem[]>;
  refreshUnreadCount: (userID: string) => Promise<number>;
  markRead: (notificationID: string) => Promise<NotificationItem>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  loadForUser: async (userID) => {
    set({ isLoading: true, error: null });

    try {
      const items = await getMyNotifications(userID);
      set({
        items,
        unreadCount: items.filter((item) => !item.isRead).length,
        isLoading: false,
      });
      return items;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load notifications.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  refreshUnreadCount: async (userID) => {
    try {
      const unreadCount = await getUnreadCount(userID);
      set({ unreadCount });
      return unreadCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load unread count.';
      set({ error: message });
      throw error;
    }
  },

  markRead: async (notificationID) => {
    set({ error: null });

    try {
      const nextItem = await markAsRead(notificationID);
      set((state) => ({
        items: state.items.map((item) => (item.id === notificationID ? nextItem : item)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      return nextItem;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot mark notification as read.';
      set({ error: message });
      throw error;
    }
  },

  reset: () => set({ items: [], unreadCount: 0, isLoading: false, error: null }),
}));
