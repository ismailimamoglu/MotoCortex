import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { generateUuid } from '../utils/crypto';
import i18n from '../i18n';
import { useBluetoothStore } from './useBluetoothStore';

export type ThemeMode = 'dark' | 'light';
export type AppLanguage = 'en' | 'de' | 'es' | 'tr' | 'id' | 'it' | 'ar' | 'zh' | 'da' | 'fi' | 'fr' | 'hi' | 'nl' | 'ja' | 'ko' | 'pl' | 'hu' | 'no' | 'pt' | 'ro' | 'ru' | 'th' | 'uk' | 'el' | 'cs' | 'sv';

/**
 * Robust helper function to verify if the user has active MotoCortex PRO status.
 * Evaluates both standard auto-renewable plans (Monthly/Yearly) and 
 * the custom non-renewing Weekly subscription (motocortex_pro_weekly_nonrenew) 
 * with a strict manual 7-day expiration check.
 */
export const checkIsProStatus = (customerInfo: CustomerInfo): boolean => {
  // Developer Backdoor check to bypass RevenueCat sandbox timeouts during local testing
  try {
    if (useAppStore.getState().isBackdoorPro) {
      return true;
    }
  } catch (e) {}

  // RAM Session Memory Lock: if connection is active and PRO was previously unlocked, hold state to prevent driving interruptions
  try {
    const state = useAppStore.getState();
    const btState = useBluetoothStore.getState();
    if (state.isSessionProMemoryLock && btState.status === 'connected') {
      return true;
    }
  } catch (e) {}

  // Strict expiration date check to prevent caching/clock exploit or offline loophole
  const entitlement = customerInfo.entitlements.all['pro_access'] || customerInfo.entitlements.all['pro'];
  if (entitlement && entitlement.expirationDate) {
    const expirationTime = new Date(entitlement.expirationDate).getTime();
    if (expirationTime < Date.now()) {
      return false; // Immediately revoke access if expired
    }
  }

  // 1. Direct active entitlement check (standard Monthly / Yearly Auto-Renewable subscriptions)
  const hasActiveEntitlement = 
    typeof customerInfo.entitlements.active['pro_access'] !== 'undefined' ||
    typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  if (hasActiveEntitlement) {
    return true;
  }

  // 2. Non-Renewing Weekly Subscription fallback calculation (7 days rule)
  if (customerInfo.nonSubscriptionTransactions && customerInfo.nonSubscriptionTransactions.length > 0) {
    const weeklyTransactions = customerInfo.nonSubscriptionTransactions.filter(
      (tx) => tx.productIdentifier === 'motocortex_pro_weekly_nonrenew'
    );

    if (weeklyTransactions.length > 0) {
      // Find the absolute latest transaction based on purchase date properties
      let latestTx = weeklyTransactions[0];
      let latestTime = new Date(latestTx.purchaseDate).getTime();

      for (let i = 1; i < weeklyTransactions.length; i++) {
        const tx = weeklyTransactions[i];
        const txTime = new Date(tx.purchaseDate).getTime();
        if (txTime > latestTime) {
          latestTx = tx;
          latestTime = txTime;
        }
      }

      // Calculate expiration date (purchase date + exactly 7 days in milliseconds)
      const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
      const expirationTime = latestTime + sevenDaysInMillis;

      // Extract server-side request timestamp to prevent device clock manipulation exploit
      const requestTime = customerInfo.requestDate
        ? new Date(customerInfo.requestDate).getTime()
        : Date.now();

      // Grant PRO access if the server-side request time is before the calculated expiration threshold
      if (requestTime < expirationTime) {
        return true;
      }
    }
  }

  return false;
};

interface AppState {
  theme: ThemeMode;
  language: AppLanguage;
  isPro: boolean;
  isBackdoorPro: boolean;
  isSessionProMemoryLock: boolean;
  hasOnboarded: boolean;
  packages: PurchasesPackage[];
  
  isSimulationMode: boolean;
  freeUsageCount: number; // Persistent free trial usage counter
  appUserId: string | null;
  deviceUuid: string | null;
  
  // Actions
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setIsPro: (isPro: boolean) => void;
  setIsBackdoorPro: (isBackdoorPro: boolean) => void;
  setHasOnboarded: (hasOnboarded: boolean) => void;
  toggleSimulationMode: () => void;
  incrementFreeUsage: () => void; // Track trial count
  resetFreeUsage: () => void; // Reset trial count
  verifyEntitlement: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  fetchAppUserId: () => Promise<void>;
  initializeDeviceUuid: () => Promise<void>;
  activateLocalGracePeriod: (txId: string) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      isPro: false,
      isBackdoorPro: false,
      isSessionProMemoryLock: false,
      hasOnboarded: false,
      isSimulationMode: false,
      packages: [],
      freeUsageCount: 0,
      appUserId: null,
      deviceUuid: null,

      setTheme: (theme) => set({ theme }),
      setLanguage: async (language) => {
        set({ language });
        await i18n.changeLanguage(language);
      },
      setIsPro: (isPro) => {
        set({ isPro });
        if (isPro) {
          set({ isSessionProMemoryLock: true });
        }
      },
      setIsBackdoorPro: (isBackdoorPro) => {
        set({ isBackdoorPro, isPro: isBackdoorPro });
        if (isBackdoorPro) {
          set({ isSessionProMemoryLock: true });
        }
      },
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      toggleSimulationMode: () => set((state) => {
        const nextSimMode = !state.isSimulationMode;
        
        // Clean up bluetooth store state and remove any mock values
        const { useTelemetryStore } = require('./useTelemetryStore');
        const { useBluetoothStore } = require('./useBluetoothStore');
        
        // Reset the Bluetooth store to clear any mock/lingering simulator data in memory
        useBluetoothStore.getState().reset();

        // Evict simulated items from telemetry queue using multi-layered criteria
        const queue: any[] = useTelemetryStore.getState().telemetry_queue;
        const simItems = queue.filter((item: any) => {
          const isSimulatorEcu = item.ecu_id === 'SIM-ECU-001';
          const isSimulatorProtocol = item.protocol === 'SIMULATED_OBD';
          const isSimulatorSignature = 
            item.coolant_temp === 85 && 
            item.throttle_pos === 18 && 
            item.dtc_codes &&
            item.dtc_codes.includes('P0113') && 
            item.dtc_codes.includes('P0102');
          return isSimulatorEcu || isSimulatorProtocol || isSimulatorSignature;
        });

        const realCount = queue.length - simItems.length;
        simItems.forEach((item: any) => useTelemetryStore.getState().removeTelemetryItem(item.id));

        console.log(
          `[AppStore] Simulation mode toggled to ${nextSimMode ? 'ON' : 'OFF'}: cleared Bluetooth store state and evicted ${simItems.length} simulated item(s). ${realCount} real protocol item(s) preserved.`
        );

        return { 
          isSimulationMode: nextSimMode,
          freeUsageCount: 0,
        };
      }),
      incrementFreeUsage: () => set((state) => ({ freeUsageCount: state.freeUsageCount + 1 })),
      resetFreeUsage: () => set({ freeUsageCount: 0 }),
      initializeDeviceUuid: async () => {
        let currentUuid = useAppStore.getState().deviceUuid;
        try {
          const secureUuid = await SecureStore.getItemAsync('device_uuid');
          if (secureUuid) {
            currentUuid = secureUuid;
          }
        } catch (e) {
          console.warn('[SecureStore] Failed to read device_uuid:', e);
        }

        const nextUuid = currentUuid || generateUuid();

        try {
          await SecureStore.setItemAsync('device_uuid', nextUuid);
        } catch (e) {
          console.warn('[SecureStore] Failed to write device_uuid:', e);
        }

        if (useAppStore.getState().deviceUuid !== nextUuid) {
          set({ deviceUuid: nextUuid });
        }

        if (Platform.OS === 'android') {
          let currentId = useAppStore.getState().appUserId;
          try {
            const secureId = await SecureStore.getItemAsync('app_user_id');
            if (secureId && secureId.startsWith('AND-')) {
              currentId = secureId;
            }
          } catch (e) {
            console.warn('[SecureStore] Failed to read app_user_id:', e);
          }

          if (!currentId || !currentId.startsWith('AND-')) {
            const cleanUuid = nextUuid.toUpperCase().replace(/-/g, '').substring(0, 16);
            const nextId = `AND-${cleanUuid}`;
            try {
              await SecureStore.setItemAsync('app_user_id', nextId);
            } catch (e) {
              console.warn('[SecureStore] Failed to write app_user_id:', e);
            }
            set({ appUserId: nextId });
          } else if (useAppStore.getState().appUserId !== currentId) {
            set({ appUserId: currentId });
          }
        }
      },

      activateLocalGracePeriod: async (txId: string) => {
        const timestamp = Date.now();
        const deviceUuid = useAppStore.getState().deviceUuid || 'fallback-device-uuid';
        const { signReceipt } = require('../utils/IapBridge');
        const signature = await signReceipt(timestamp, txId, deviceUuid);
        const receipt = { timestamp, transactionId: txId, signature };
        try {
          await SecureStore.setItemAsync('motocortex_grace_receipt', JSON.stringify(receipt));
          set({ isPro: true, isSessionProMemoryLock: true });
        } catch (err) {
          console.error('[AppStore] Failed to save grace receipt:', err);
        }
      },

      verifyEntitlement: async () => {
        // First check RAM memory lock
        const btState = useBluetoothStore.getState();
        if (useAppStore.getState().isSessionProMemoryLock && btState.status === 'connected') {
          set({ isPro: true });
          return;
        }

        // Check local grace period receipt in SecureStore
        try {
          const stored = await SecureStore.getItemAsync('motocortex_grace_receipt');
          if (stored) {
            const receipt = JSON.parse(stored);
            const deviceUuid = useAppStore.getState().deviceUuid || 'fallback-device-uuid';
            const { verifyReceipt } = require('../utils/IapBridge');
            const isValid = await verifyReceipt(receipt, deviceUuid);
            if (isValid) {
              const age = Date.now() - receipt.timestamp;
              if (age >= 0 && age < 24 * 60 * 60 * 1000) {
                set({ isPro: true });
                return;
              }
            }
          }
        } catch (err) {
          console.warn('[AppStore] Grace period verification error:', err);
        }

        try {
          // RevenueCat natively caches customerInfo and resolves with it when offline.
          const customerInfo = await Purchases.getCustomerInfo();
          const isPro = checkIsProStatus(customerInfo);
          set({ isPro });
          if (isPro) {
            set({ isSessionProMemoryLock: true });
          }
        } catch (error) {
          console.warn('[MOTO CORTEX] Offline verification error fetching native RevenueCat cache:', error);
          // If completely offline and getCustomerInfo throws, we do NOT change isPro to false to avoid locking the user out.
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
          const isPro = checkIsProStatus(customerInfo);
          set({ isPro });
          return isPro;
        } catch (error: any) {
          if (!error?.userCancelled) {
            console.warn('Purchase failed:', error);
          }
          return false;
        }
      },

      restorePurchases: async () => {
        try {
          const customerInfo = await Purchases.restorePurchases();
          const isPro = checkIsProStatus(customerInfo);
          set({ isPro });
          return isPro;
        } catch (error) {
          console.warn('Restore failed:', error);
          return false;
        }
      },

      fetchAppUserId: async () => {
        try {
          const appUserId = await Purchases.getAppUserID();
          set({ appUserId });
        } catch (error) {
          console.warn('[MOTO CORTEX] Error fetching RevenueCat appUserID:', error);
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
        hasOnboarded: state.hasOnboarded,
        isSimulationMode: state.isSimulationMode,
        freeUsageCount: state.freeUsageCount,
        deviceUuid: state.deviceUuid,
        isBackdoorPro: state.isBackdoorPro,
        isPro: state.isPro,
        // isSessionProMemoryLock intentionally EXCLUDED — RAM-only lock
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
        // Deterministic cold restart cleanup: destroy stale session lock
        if (state) {
          state.isSessionProMemoryLock = false;
        }
      },
    }
  )
);
