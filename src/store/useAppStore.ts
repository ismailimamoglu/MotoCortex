import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import i18n from '../i18n';

export type ThemeMode = 'dark' | 'light';
export type AppLanguage = 'en' | 'de' | 'es' | 'tr' | 'id';

interface AppState {
  theme: ThemeMode;
  language: AppLanguage;
  isPro: boolean;
  hasOnboarded: boolean;
  packages: PurchasesPackage[];
  
  // Actions
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setIsPro: (isPro: boolean) => void;
  setHasOnboarded: (hasOnboarded: boolean) => void;
  verifyEntitlement: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      isPro: false,
      hasOnboarded: false,
      packages: [],

      setTheme: (theme) => set({ theme }),
      setLanguage: async (language) => {
        set({ language });
        if (i18n.isInitialized) {
          await i18n.changeLanguage(language);
        }
      },
      setIsPro: (isPro) => set({ isPro }),
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),

      verifyEntitlement: async () => {
        try {
          // Securely verifies active entitlement against local receipt cache when offline
          const customerInfo = await Purchases.getCustomerInfo();
          const isPro = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
          set({ isPro });
        } catch (error) {
          console.warn('Offline verification fallback or fetch error:', error);
          // Retains securely persisted state if completely offline and SDK check fails
        }
      },

      loadOfferings: async () => {
        try {
          const offerings = await Purchases.getOfferings();
          if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
            set({ packages: offerings.current.availablePackages });
          }
        } catch (error) {
          console.warn('Error loading offerings:', error);
        }
      },

      purchasePackage: async (pkg) => {
        try {
          const { customerInfo } = await Purchases.purchasePackage(pkg);
          const isPro = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
          set({ isPro });
          return isPro;
        } catch (error: any) {
          if (!error.userCancelled) {
            console.warn('Purchase failed:', error);
          }
          return false;
        }
      },

      restorePurchases: async () => {
        try {
          const customerInfo = await Purchases.restorePurchases();
          const isPro = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
          set({ isPro });
          return isPro;
        } catch (error) {
          console.warn('Restore failed:', error);
          return false;
        }
      },
    }),
    {
      name: 'motocortex-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Exclude native complex package objects from serialization storage
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isPro: state.isPro,
        hasOnboarded: state.hasOnboarded,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.language && i18n.isInitialized) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
