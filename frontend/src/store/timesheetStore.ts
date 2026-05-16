import { create } from 'zustand';
import type { Timesheet, TimesheetPeriodData } from '../types';
import {
  getManagerMonthlyTimesheetsForReview,
  getMonthlyTimesheetPeriodData,
  reviewTimesheet,
  submitTimesheet,
} from '../services/timesheetService';

interface TimesheetState {
  periodData: TimesheetPeriodData | null;
  reviewItems: Timesheet[];
  isLoading: boolean;
  error: string | null;
  loadPersonalPeriod: (params: {
    userID: string;
    userEmail: string;
    month: number;
    year: number;
  }) => Promise<TimesheetPeriodData>;
  loadDepartmentReview: (departmentID: string, month: number, year: number) => Promise<Timesheet[]>;
  submitMonthly: (monthlyTimesheetID: string) => Promise<void>;
  reviewMonthly: (monthlyTimesheetID: string, status: 'Approved' | 'Rejected', reason?: string) => Promise<void>;
  reset: () => void;
}

export const useTimesheetStore = create<TimesheetState>((set) => ({
  periodData: null,
  reviewItems: [],
  isLoading: false,
  error: null,

  loadPersonalPeriod: async (params) => {
    set({ isLoading: true, error: null });

    try {
      const periodData = await getMonthlyTimesheetPeriodData(params);
      set({ periodData, isLoading: false });
      return periodData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load timesheet.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadDepartmentReview: async (departmentID, month, year) => {
    set({ isLoading: true, error: null });

    try {
      const result = await getManagerMonthlyTimesheetsForReview(departmentID, month, year);
      set({ reviewItems: result.timesheets, isLoading: false });
      return result.timesheets;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load review timesheets.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  submitMonthly: async (monthlyTimesheetID) => {
    set({ isLoading: true, error: null });

    try {
      await submitTimesheet(monthlyTimesheetID);
      set({ isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot submit timesheet.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reviewMonthly: async (monthlyTimesheetID, status, reason) => {
    set({ isLoading: true, error: null });

    try {
      await reviewTimesheet(monthlyTimesheetID, status, reason);
      set((state) => ({
        reviewItems: state.reviewItems.filter((item) => item.id !== monthlyTimesheetID),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot review timesheet.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reset: () => set({ periodData: null, reviewItems: [], isLoading: false, error: null }),
}));
