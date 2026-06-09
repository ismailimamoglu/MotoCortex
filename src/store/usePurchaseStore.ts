import { create } from 'zustand';
import { useAppStore } from './useAppStore';

interface PurchaseState {
  isPro: boolean;
  setProStatus: (status: boolean) => void;
}

export const usePurchaseStore = create<PurchaseState>((set) => ({
  isPro: useAppStore.getState().isPro,
  setProStatus: (status) => {
    useAppStore.getState().setIsPro(status);
    set({ isPro: status });
  },
}));

// Keep usePurchaseStore in sync with useAppStore
useAppStore.subscribe((state) => {
  if (usePurchaseStore.getState().isPro !== state.isPro) {
    usePurchaseStore.setState({ isPro: state.isPro });
  }
});
