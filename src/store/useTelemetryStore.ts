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
import SQLiteStorage from '../core/database/SQLiteStorage';

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

export const saveQueueAsync = async (queue: TelemetryItem[]) => {
  // No-op: SQLite writes are synchronous and instant.
};

export const flushQueueToDisk = async () => {
  // No-op: SQLite writes are synchronous and instant.
};

export const initializeTelemetryQueue = async () => {
  const store = useTelemetryStore.getState();
  if (store.isQueueLoaded) return;
  try {
    const stored = await AsyncStorage.getItem('motocortex-telemetry-queue');
    if (stored) {
      const diskQueue: TelemetryItem[] = JSON.parse(stored);
      for (const item of diskQueue) {
        SQLiteStorage.enqueueTelemetry(item);
      }
      await AsyncStorage.removeItem('motocortex-telemetry-queue');
      console.log(`[Telemetry Store] Migrated ${diskQueue.length} items from AsyncStorage to SQLite.`);
    }

    const items = SQLiteStorage.getAllItems();
    const bytes = estimateQueueBytes(items);

    useTelemetryStore.setState({
      telemetry_queue: items,
      telemetryQueueBytes: bytes,
      isQueueLoaded: true
    });
    console.log(`[Telemetry Store] Lazy-loaded queue completed from SQLite. Total items: ${items.length}`);
  } catch (err) {
    console.error('[Telemetry Store] Failed to lazy load telemetry queue from SQLite:', err);
    useTelemetryStore.setState({ isQueueLoaded: true });
  }
};

// Listen to App state to flush telemetry queue before background/termination
let appStateSubscription: any = null;
if (!appStateSubscription) {
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState.match(/inactive|background/)) {
      flushQueueToDisk().catch((e) => console.warn('[TelemetryStore] AppState flush error:', e));
    }
  });
}

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
        // === GUARD 0: Strict Opt-In Check (Enforced in production builds) ===
        if (!__DEV__ && !useAppStore.getState().isTelemetryOptedIn) {
          return state;
        }

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
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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

        SQLiteStorage.enqueueTelemetry(newItem);
        let updatedQueue = SQLiteStorage.getAllItems();

        // Single ring-buffer cap: max 2000 items to prevent Hermes JS heap OOM during extended offline driving
        // Test override: (global as any).__TEST_MAX_TELEMETRY_ITEMS__ allows reducing this in jest to prevent worker OOM
        const MAX_OFFLINE_TELEMETRY_ITEMS = (global as any).__TEST_MAX_TELEMETRY_ITEMS__ || 2000;
        if (updatedQueue.length > MAX_OFFLINE_TELEMETRY_ITEMS) {
          const excess = updatedQueue.length - MAX_OFFLINE_TELEMETRY_ITEMS;
          // Priority pruning: remove already-synced (success:true) items first,
          // then fall back to oldest unsynced items to preserve unsynced data longer
          const syncedItems = updatedQueue.filter((item: any) => item.success === 1 || item.success === true);
          const unsyncedItems = updatedQueue.filter((item: any) => !item.success || item.success === 0);
          const overflowItems = [...syncedItems, ...unsyncedItems].slice(0, excess);

          if (overflowItems.length === 0 && excess > 0) {
            // Fallback: all items are unsynced, drop oldest FIFO
            const fallbackItems = updatedQueue.slice(0, excess);
            for (const item of fallbackItems) {
              SQLiteStorage.removeTelemetryItem(item.id);
            }
            try {
              const DSR = require('../core/monitor/DiagnosticSessionRecorder').default;
              DSR.recordErr('QUEUE_OVERFLOW_DATA_DROPPED',
                `All ${excess} pruned items were unsynced — possible extended offline session`);
            } catch { /* noop if DSR unavailable */ }
          } else {
            for (const item of overflowItems) {
              SQLiteStorage.removeTelemetryItem(item.id);
            }
          }
          updatedQueue = SQLiteStorage.getAllItems();
        }

        const newBytes = estimateQueueBytes(updatedQueue);

        return {
          telemetry_queue: updatedQueue,
          telemetryQueueBytes: newBytes
        };
      }),

      dequeueTelemetry: (count) => set((state) => {
        if (!state.isQueueLoaded) return state;
        const dequeued = state.telemetry_queue.slice(0, count);
        for (const item of dequeued) {
          SQLiteStorage.removeTelemetryItem(item.id);
        }
        const updatedQueue = SQLiteStorage.getAllItems();
        return {
          telemetry_queue: updatedQueue,
          telemetryQueueBytes: estimateQueueBytes(updatedQueue)
        };
      }),

      incrementRetryCount: (id) => set((state) => {
        if (!state.isQueueLoaded) return state;
        SQLiteStorage.incrementRetryCount(id);
        const updatedQueue = SQLiteStorage.getAllItems();
        return { telemetry_queue: updatedQueue };
      }),

      removeTelemetryItem: (id) => set((state) => {
        if (!state.isQueueLoaded) return state;
        SQLiteStorage.removeTelemetryItem(id);
        const updatedQueue = SQLiteStorage.getAllItems();
        return {
          telemetry_queue: updatedQueue,
          telemetryQueueBytes: estimateQueueBytes(updatedQueue)
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
