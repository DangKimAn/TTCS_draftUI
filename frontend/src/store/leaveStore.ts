import { create } from 'zustand';
import type { LeaveRequest } from '../types';
import {
  createLeaveRequest,
  getLeaveBalance,
  getLeaveTypes,
  getMyLeaveRequests,
  reviewLeave,
} from '../services/leaveService';
import type {
  LeaveBalance,
  LeaveRequestPayload,
  LeaveType,
} from '../services/leaveService';

interface LeaveState {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  balance: LeaveBalance | null;
  isLoading: boolean;
  error: string | null;
  loadMine: (userID: string) => Promise<LeaveRequest[]>;
  loadBalance: (userID: string) => Promise<LeaveBalance>;
  loadTypes: () => Promise<LeaveType[]>;
  createRequest: (userID: string, payload: LeaveRequestPayload) => Promise<LeaveRequest>;
  reviewRequest: (leaveID: string, status: 'Approved' | 'Rejected', reason?: string) => Promise<LeaveRequest>;
  reset: () => void;
}

export const useLeaveStore = create<LeaveState>((set) => ({
  requests: [],
  leaveTypes: [],
  balance: null,
  isLoading: false,
  error: null,

  loadMine: async (userID) => {
    set({ isLoading: true, error: null });

    try {
      const requests = await getMyLeaveRequests(userID);
      set({ requests, isLoading: false });
      return requests;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load leave requests.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadBalance: async (userID) => {
    set({ isLoading: true, error: null });

    try {
      const balance = await getLeaveBalance(userID);
      set({ balance, isLoading: false });
      return balance;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load leave balance.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadTypes: async () => {
    set({ isLoading: true, error: null });

    try {
      const leaveTypes = await getLeaveTypes();
      const activeTypes = leaveTypes.filter((type) => type.isActive !== false);
      set({ leaveTypes: activeTypes, isLoading: false });
      return activeTypes;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load leave types.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createRequest: async (userID, payload) => {
    set({ isLoading: true, error: null });

    try {
      const request = await createLeaveRequest(userID, payload);
      set((state) => ({
        requests: [request, ...state.requests],
        isLoading: false,
      }));
      return request;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot create leave request.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reviewRequest: async (leaveID, status, reason) => {
    set({ isLoading: true, error: null });

    try {
      const request = await reviewLeave(leaveID, status, reason);
      set((state) => ({
        requests: state.requests.map((item) => (item.id === leaveID ? request : item)),
        isLoading: false,
      }));
      return request;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot review leave request.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reset: () => set({ requests: [], leaveTypes: [], balance: null, isLoading: false, error: null }),
}));
