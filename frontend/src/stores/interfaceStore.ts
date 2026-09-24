import { create } from 'zustand';
import type { InterfaceMode } from '../types';

interface InterfaceState {
  currentMode: InterfaceMode;
  setMode: (mode: InterfaceMode) => void;
  toggleMode: () => void;
}

export const useInterfaceStore = create<InterfaceState>((set) => ({
  currentMode: (localStorage.getItem('meetguard_interface_mode') as InterfaceMode) || 'LOCAL',
  setMode: (mode: InterfaceMode) => {
    localStorage.setItem('meetguard_interface_mode', mode);
    set({ currentMode: mode });
  },
  toggleMode: () => {
    set((state) => {
      const next = state.currentMode === 'LOCAL' ? 'ONLINE' : 'LOCAL';
      localStorage.setItem('meetguard_interface_mode', next);
      return { currentMode: next };
    });
  },
}));
