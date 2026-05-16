import { create } from 'zustand';
import type { Attendance } from '../types';
import {
  checkIn as checkInRequest,
  checkOut as checkOutRequest,
  getMonthlyAttendance,
} from '../services/attendanceService';

interface AttendanceState {
  records: Attendance[];
  today: Attendance | null;
  isLoading: boolean;
  error: string | null;
  loadMonthlyAttendance: (userID: string, month: number, year: number) => Promise<Attendance[]>;
  checkIn: (userID: string) => Promise<Attendance>;
  checkOut: (userID: string) => Promise<Attendance>;
  reset: () => void;
}

function getTodayRecord(records: Attendance[]): Attendance | null {
  const todayKey = new Date().toISOString().slice(0, 10);
  return records.find((record) => record.date === todayKey) || null;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  records: [],
  today: null,
  isLoading: false,
  error: null,

  loadMonthlyAttendance: async (userID, month, year) => {
    set({ isLoading: true, error: null });

    try {
      const records = await getMonthlyAttendance(userID, month, year);
      set({ records, today: getTodayRecord(records), isLoading: false });
      return records;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load attendance.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  checkIn: async (userID) => {
    set({ isLoading: true, error: null });

    try {
      const today = await checkInRequest(userID);
      set((state) => ({
        today,
        records: [today, ...state.records.filter((record) => record.id !== today.id)],
        isLoading: false,
      }));
      return today;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot check in.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  checkOut: async (userID) => {
    set({ isLoading: true, error: null });

    try {
      const today = await checkOutRequest(userID);
      set((state) => ({
        today,
        records: [today, ...state.records.filter((record) => record.id !== today.id)],
        isLoading: false,
      }));
      return today;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot check out.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reset: () => set({ records: [], today: null, isLoading: false, error: null }),
}));
