import { create } from 'zustand';

type SidebarMode = 'expanded' | 'collapsed';

interface UiState {
  sidebarMode: SidebarMode;
  activeWorkspaceTab: string;
  isNotificationOpen: boolean;
  setSidebarMode: (mode: SidebarMode) => void;
  toggleSidebar: () => void;
  setActiveWorkspaceTab: (tab: string) => void;
  setNotificationOpen: (isOpen: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarMode: 'expanded',
  activeWorkspaceTab: 'overview',
  isNotificationOpen: false,

  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  toggleSidebar: () =>
    set((state) => ({
      sidebarMode: state.sidebarMode === 'expanded' ? 'collapsed' : 'expanded',
    })),
  setActiveWorkspaceTab: (activeWorkspaceTab) => set({ activeWorkspaceTab }),
  setNotificationOpen: (isNotificationOpen) => set({ isNotificationOpen }),
}));
