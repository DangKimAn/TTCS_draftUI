import { create } from 'zustand';
import {
  activateHrUser,
  createHrLeaveType,
  createHrUser,
  deactivateHrUser,
  deleteHrLeaveType,
  fetchHrLeaveTypes,
  fetchHrUsers,
  updateHrLeaveType,
  updateHrUser,
} from '../services/hrService';

interface HrState {
  users: Array<Record<string, any>>;
  leaveTypes: Array<Record<string, any>>;
  isLoading: boolean;
  error: string | null;
  loadUsers: (departments?: Array<Record<string, any>>) => Promise<Array<Record<string, any>>>;
  loadLeaveTypes: () => Promise<Array<Record<string, any>>>;
  saveUser: (
    userID: string | null,
    payload: Parameters<typeof createHrUser>[0],
    departments?: Array<Record<string, any>>,
  ) => Promise<Record<string, any> | null>;
  setUserActive: (userID: string, isActive: boolean) => Promise<void>;
  saveLeaveType: (
    typeLeaveID: string | null,
    payload: Parameters<typeof createHrLeaveType>[0],
  ) => Promise<Record<string, any> | null>;
  removeLeaveType: (typeLeaveID: string) => Promise<void>;
  reset: () => void;
}

export const useHrStore = create<HrState>((set) => ({
  users: [],
  leaveTypes: [],
  isLoading: false,
  error: null,

  loadUsers: async (departments = []) => {
    set({ isLoading: true, error: null });

    try {
      const users = await fetchHrUsers(departments);
      set({ users, isLoading: false });
      return users;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load HR users.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadLeaveTypes: async () => {
    set({ isLoading: true, error: null });

    try {
      const leaveTypes = await fetchHrLeaveTypes();
      set({ leaveTypes, isLoading: false });
      return leaveTypes;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot load leave types.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  saveUser: async (userID, payload, departments = []) => {
    set({ isLoading: true, error: null });

    try {
      const user = userID
        ? await updateHrUser(userID, payload, departments)
        : await createHrUser(payload, departments);

      set((state) => ({
        users: user
          ? [user, ...state.users.filter((item) => item.id !== user.id)]
          : state.users,
        isLoading: false,
      }));

      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot save user.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  setUserActive: async (userID, isActive) => {
    set({ isLoading: true, error: null });

    try {
      await (isActive ? activateHrUser(userID) : deactivateHrUser(userID));
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userID
            ? { ...user, isActive, status: isActive ? 'Active' : 'Inactive' }
            : user,
        ),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot update user status.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  saveLeaveType: async (typeLeaveID, payload) => {
    set({ isLoading: true, error: null });

    try {
      const leaveType = typeLeaveID
        ? await updateHrLeaveType(typeLeaveID, payload)
        : await createHrLeaveType(payload);

      set((state) => ({
        leaveTypes: leaveType
          ? [leaveType, ...state.leaveTypes.filter((item) => item.id !== leaveType.id)]
          : state.leaveTypes,
        isLoading: false,
      }));

      return leaveType;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot save leave type.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  removeLeaveType: async (typeLeaveID) => {
    set({ isLoading: true, error: null });

    try {
      await deleteHrLeaveType(typeLeaveID);
      set((state) => ({
        leaveTypes: state.leaveTypes.filter((item) => item.id !== typeLeaveID),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot delete leave type.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reset: () => set({ users: [], leaveTypes: [], isLoading: false, error: null }),
}));
