import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './useAppStore';
import { Platform, AppState } from 'react-native';
import { toSnakeCase } from '../utils/vehicleStandardizer';
import { supabase } from '../api/supabaseClient';
import { calculateSessionHash } from '../utils/crypto';
import { useBluetoothStore } from './useBluetoothStore';
import { ProtocolEngine } from '../core/connection/ProtocolEngine';

export interface TelemetryItem {
  id: string; // Internal temporary ID
  brand: string;
  model: string;
  year: number;
  protocol: string;
  ecu_id: string;
  dtc_codes: string[];
  session_hash: string;
  retry_count: number;
  engine_rpm: number;
  coolant_temp: number;
  throttle_pos: number;
  is_simulated: boolean;
  success?: boolean; // Supabase sync status (true if synced, false/undefined if offline/unsynced)
  created_at?: string; // Strictly monotonic session relative timestamp
}

export interface SelectedVehicle {
  brand: string;
  model: string;
  year: number;
  vin?: string;
}

export interface ChronicFault {
  fault_code: string;
  unique_days_count: number;
  total_occurrence: number;
}

interface TelemetryState {
  telemetry_queue: TelemetryItem[];
  telemetryQueueBytes: number;
  isQueueLoaded: boolean;
  activeSessionVehicle: SelectedVehicle | null;
  chronicFaults: ChronicFault[];
  isLoadingChronicFaults: boolean;
  chronicFaultsError: string | null;
  sessionDynamicKey: string | null;
  
  // Actions
  enqueueTelemetry: (item: Omit<TelemetryItem, 'id' | 'retry_count'>) => void;
  dequeueTelemetry: (count: number) => void;
  incrementRetryCount: (id: string) => void;
  removeTelemetryItem: (id: string) => void;
  setActiveSessionVehicle: (vehicle: SelectedVehicle | null) => void;
  clearActiveSessionVehicle: () => void;
  fetchChronicFaults: (brand: string) => Promise<void>;
  setSessionDynamicKey: (key: string | null) => void;
}

export const transformTelemetryPayload = (item: Omit<TelemetryItem, 'id' | 'retry_count'>) => {
  return {
    ...item,
    brand: toSnakeCase(item.brand),
    model: toSnakeCase(item.model),
  };
};

export const estimateItemBytes = (item: TelemetryItem): number => {
  return 120 + 
    (item.brand || '').length + 
    (item.model || '').length + 
    (item.protocol || '').length + 
    (item.ecu_id || '').length + 
    (item.dtc_codes ? item.dtc_codes.reduce((sum, c) => sum + c.length, 0) : 0) + 
    (item.session_hash || '').length;
};

export const estimateQueueBytes = (queue: TelemetryItem[]): number => {
  return queue.reduce((sum, item) => sum + estimateItemBytes(item), 0);
};

let saveTimeout: any = null;

export const saveQueueAsync = async (queue: TelemetryItem[]) => {
  const store = useTelemetryStore.getState();
  if (!store.isQueueLoaded) {
    return; // Don't overwrite disk data before lazy-loading completes
  }
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    try {
      await AsyncStorage.setItem('motocortex-telemetry-queue', JSON.stringify(queue));
      saveTimeout = null;
    } catch (err) {
      console.error('[Telemetry Store] Failed to save telemetry queue:', err);
    }
  }, 5000); // Debounce write operations to 5000ms
};

export const flushQueueToDisk = async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const store = useTelemetryStore.getState();
  if (!store.isQueueLoaded) return;
  try {
    await AsyncStorage.setItem('motocortex-telemetry-queue', JSON.stringify(store.telemetry_queue));
    console.log('[Telemetry Store] Flushed telemetry queue to disk.');
  } catch (err) {
    console.error('[Telemetry Store] Failed to flush telemetry queue:', err);
  }
};

export const initializeTelemetryQueue = async () => {
  const store = useTelemetryStore.getState();
  if (store.isQueueLoaded) return;
  try {
    const stored = await AsyncStorage.getItem('motocortex-telemetry-queue');
    let diskQueue: TelemetryItem[] = [];
    if (stored) {
      diskQueue = JSON.parse(stored);
    }
    // Chronological Merge & FIFO Rule: [...diskData, ...memoryData]
    const currentQueue = useTelemetryStore.getState().telemetry_queue;
    const mergedQueue = [...diskQueue, ...currentQueue];
    const bytes = estimateQueueBytes(mergedQueue);

    useTelemetryStore.setState({
      telemetry_queue: mergedQueue,
      telemetryQueueBytes: bytes,
      isQueueLoaded: true
    });
    console.log(`[Telemetry Store] Lazy-loaded queue completed. Merged ${diskQueue.length} disk items with ${currentQueue.length} memory items.`);
  } catch (err) {
    console.error('[Telemetry Store] Failed to lazy load telemetry queue:', err);
    useTelemetryStore.setState({ isQueueLoaded: true });
  }
};

// Listen to App state to flush telemetry queue before background/termination
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState.match(/inactive|background/)) {
    flushQueueToDisk().catch(() => {});
  }
});

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set) => ({
      telemetry_queue: [],
      telemetryQueueBytes: 0,
      isQueueLoaded: false,
      activeSessionVehicle: null,
      chronicFaults: [],
      isLoadingChronicFaults: false,
      chronicFaultsError: null,
      sessionDynamicKey: null,

      enqueueTelemetry: (item) => set((state) => {
        // === GUARD 1: Runtime isSimulationMode flag check ===
        if (useAppStore.getState().isSimulationMode) {
          return state;
        }

        // === GUARD 2: Protocol-level check — block any SIMULATED_OBD payload ===
        if (item.protocol === 'SIMULATED_OBD') {
          return state;
        }

        // === GUARD 3: ECU ID level check — block any SIM-ECU-001 payload ===
        if (item.ecu_id === 'SIM-ECU-001') {
          return state;
        }

        // === GUARD 4: Sensor signature-level check — block any telemetry with simulator values ===
        const isSimulatorSignature = 
          item.coolant_temp === 85 && 
          item.throttle_pos === 18 && 
          item.dtc_codes &&
          item.dtc_codes.includes('P0113') && 
          item.dtc_codes.includes('P0102');

        if (isSimulatorSignature) {
          return state;
        }

        const standardizedItem = transformTelemetryPayload(item);

        const duplicate = state.telemetry_queue.find(q => q.session_hash === standardizedItem.session_hash);
        if (duplicate) {
          return state;
        }
        
        const newItem: TelemetryItem = {
          ...standardizedItem,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          retry_count: 0,
          success: false,
          created_at: standardizedItem.created_at || new Date(ProtocolEngine.getRelativeLogicalTimestamp()).toISOString()
        };

        const newItemSize = estimateItemBytes(newItem);
        
        // Single package size limit: 2KB (2048 bytes)
        if (newItemSize > 2048) {
          console.warn('[Telemetry Store] Rejecting single telemetry item exceeding 2KB size limit.');
          return state;
        }

        let currentBytes = state.telemetryQueueBytes;
        if (currentBytes === 0 && state.telemetry_queue.length > 0) {
          currentBytes = estimateQueueBytes(state.telemetry_queue);
        }

        const newQueue = [...state.telemetry_queue, newItem];
        let newBytes = currentBytes + newItemSize;

        // Supabase'e henüz gönderilmemiş (success: false) kayıtları silmemek için Supabase'e gönderilmiş (success: true) kayıtları öncelikli temizle.
        while (newQueue.length > 2000 || (newQueue.length > 0 && newBytes > 1500000)) {
          const syncedIndex = newQueue.findIndex(q => q.success === true);
          if (syncedIndex !== -1) {
            const removed = newQueue.splice(syncedIndex, 1)[0];
            newBytes -= estimateItemBytes(removed);
          } else {
            const removed = newQueue.shift();
            if (removed) {
              newBytes -= estimateItemBytes(removed);
              try {
                const DiagnosticSessionRecorder = require('../core/monitor/DiagnosticSessionRecorder').default;
                DiagnosticSessionRecorder.recordErr('QUEUE_OVERFLOW_DATA_DROPPED', `Dropped oldest unsynced telemetry item with hash: ${removed.session_hash}`);
              } catch (err) {
                console.error('[Telemetry Store] Failed to log overflow drop:', err);
              }
            }
          }
        }

        saveQueueAsync(newQueue);

        return {
          telemetry_queue: newQueue,
          telemetryQueueBytes: Math.max(0, newBytes)
        };
      }),

      dequeueTelemetry: (count) => set((state) => {
        if (!state.isQueueLoaded) return state;
        const dequeued = state.telemetry_queue.slice(0, count);
        const size = estimateQueueBytes(dequeued);
        let currentBytes = state.telemetryQueueBytes;
        if (currentBytes === 0 && state.telemetry_queue.length > 0) {
          currentBytes = estimateQueueBytes(state.telemetry_queue);
        }
        const newQueue = state.telemetry_queue.slice(count);
        saveQueueAsync(newQueue);
        return {
          telemetry_queue: newQueue,
          telemetryQueueBytes: Math.max(0, currentBytes - size)
        };
      }),

      incrementRetryCount: (id) => set((state) => {
        if (!state.isQueueLoaded) return state;
        const newQueue = state.telemetry_queue.map((item) =>
          item.id === id ? { ...item, retry_count: item.retry_count + 1 } : item
        );
        saveQueueAsync(newQueue);
        return { telemetry_queue: newQueue };
      }),

      removeTelemetryItem: (id) => set((state) => {
        if (!state.isQueueLoaded) return state;
        const removed = state.telemetry_queue.find(q => q.id === id);
        const size = removed ? estimateItemBytes(removed) : 0;
        let currentBytes = state.telemetryQueueBytes;
        if (currentBytes === 0 && state.telemetry_queue.length > 0) {
          currentBytes = estimateQueueBytes(state.telemetry_queue);
        }
        const newQueue = state.telemetry_queue.filter((item) => item.id !== id);
        saveQueueAsync(newQueue);
        return {
          telemetry_queue: newQueue,
          telemetryQueueBytes: Math.max(0, currentBytes - size)
        };
      }),

      setActiveSessionVehicle: (activeSessionVehicle) => set({ 
        activeSessionVehicle: activeSessionVehicle ? {
          brand: toSnakeCase(activeSessionVehicle.brand),
          model: toSnakeCase(activeSessionVehicle.model),
          year: activeSessionVehicle.year,
          vin: activeSessionVehicle.vin
        } : null 
      }),
      
      clearActiveSessionVehicle: () => set({ activeSessionVehicle: null, chronicFaults: [], sessionDynamicKey: null }),
      
      setSessionDynamicKey: (sessionDynamicKey) => set({ sessionDynamicKey }),

      fetchChronicFaults: async (brand: string) => {
        if (!brand) return;

        try {
          const btState = useBluetoothStore.getState();
          const activeSessionVehicle = useTelemetryStore.getState().activeSessionVehicle;
          const sessionDynamicKey = useTelemetryStore.getState().sessionDynamicKey;
          const deviceUuid = Platform.OS === 'android'
            ? useAppStore.getState().appUserId
            : useAppStore.getState().deviceUuid;

          if (activeSessionVehicle && sessionDynamicKey && deviceUuid) {
            const dtc_codes = btState.dtcs || [];
            const dateObj = new Date();
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;

            const session_hash = await calculateSessionHash(
              deviceUuid,
              activeSessionVehicle.brand,
              activeSessionVehicle.model,
              activeSessionVehicle.year,
              dtc_codes,
              dateString,
              sessionDynamicKey
            );

            const lastHash = await AsyncStorage.getItem('last_successful_session_hash');
            if (lastHash === session_hash) {
              console.log('[Telemetry Store] fetchChronicFaults - Deduplication check PASSED. Skipping RPC.');
              return;
            }
          }
        } catch (hashErr) {
          console.warn('[Telemetry Store] Deduplication check failed in fetchChronicFaults:', hashErr);
        }

        set({ isLoadingChronicFaults: true, chronicFaultsError: null });
        try {
          const standardizedBrand = toSnakeCase(brand);
          const { data, error } = await supabase.rpc('get_chronic_faults', {
            target_brand: standardizedBrand
          });
          
          if (error) {
            set({ chronicFaultsError: error.message, chronicFaults: [], isLoadingChronicFaults: false });
          } else {
            const formattedData: ChronicFault[] = (data || []).map((row: any) => ({
              fault_code: String(row.fault_code || ''),
              unique_days_count: Number(row.unique_days_count || 0),
              total_occurrence: Number(row.total_occurrence || 0)
            }));
            set({ chronicFaults: formattedData, isLoadingChronicFaults: false });
          }
        } catch (err: any) {
          set({ chronicFaultsError: err?.message || 'Unknown error', chronicFaults: [], isLoadingChronicFaults: false });
        }
      },
    }),
    {
      name: 'motocortex-telemetry-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (state: any, version: number) => {
        if (version < 2 && state) {
          // If legacy queue was loaded from old store, migrate it to the new key
          if (state.telemetry_queue && state.telemetry_queue.length > 0) {
            const legacyQueue = state.telemetry_queue;
            AsyncStorage.setItem('motocortex-telemetry-queue', JSON.stringify(legacyQueue))
              .then(() => {
                console.log(`[Telemetry Migration] Successfully migrated ${legacyQueue.length} items to new isolated key.`);
              })
              .catch(err => {
                console.error('[Telemetry Migration] Failed to migrate legacy queue:', err);
              });
          }
          // Delete old queue property to clear disk space and prevent future rehydration parse overhead
          delete state.telemetry_queue;
        }
        return state;
      },
      partialize: (state) => ({
        activeSessionVehicle: state.activeSessionVehicle,
        telemetryQueueBytes: state.telemetryQueueBytes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Lazy load the isolated queue asynchronously once hydration of metadata finishes
          initializeTelemetryQueue().catch(() => {});
        }
      }
    }
  )
);
