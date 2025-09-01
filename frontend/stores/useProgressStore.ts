import { create } from 'zustand';

type ProgressState = {
  lastRatio: number;                 // 0..1
  setLastRatio: (r: number) => void;
  reset: () => void;
};

export const useProgressStore = create<ProgressState>((set) => ({
  lastRatio: 0,
  setLastRatio: (r) => set({ lastRatio: Math.max(0, Math.min(1, r)) }),
  reset: () => set({ lastRatio: 0 }),
}));
