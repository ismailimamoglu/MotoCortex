import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './useAppStore';
import { Platform } from 'react-native';
import { toSnakeCase } from '../utils/vehicleStandardizer';
import { supabase } from '../api/supabaseClient';
import { calculateSessionHash } from '../utils/crypto';
import { useBluetoothStore } from './useBluetoothStore';

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
}

export interface SelectedVehicle {
  brand: string;
  model: string;
  year: number;
}

export interface ChronicFault {
  fault_code: string;
  unique_days_count: number;
  total_occurrence: number;
}

interface TelemetryState {
  telemetry_queue: TelemetryItem[];
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

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set) => ({
      telemetry_queue: [],
      activeSessionVehicle: null,
      chronicFaults: [],
      isLoadingChronicFaults: false,
      chronicFaultsError: null,
      sessionDynamicKey: null,

      enqueueTelemetry: (item) => set((state) => {
        // === GUARD 1: Runtime isSimulationMode flag check ===
        if (useAppStore.getState().isSimulationMode) {
          console.log('[Telemetry Store] GUARD-1: Skipped queuing — simulation mode active.');
          return state;
        }

        // === GUARD 2: Protocol-level check — block any SIMULATED_OBD payload ===
        if (item.protocol === 'SIMULATED_OBD') {
          console.log('[Telemetry Store] GUARD-2: Skipped queuing — SIMULATED_OBD protocol detected.');
          return state;
        }

        // === GUARD 3: ECU ID level check — block any SIM-ECU-001 payload ===
        if (item.ecu_id === 'SIM-ECU-001') {
          console.log('[Telemetry Store] GUARD-3: Skipped queuing — SIM-ECU-001 ECU ID detected.');
          return state;
        }

        // === GUARD 4: Sensor signature-level check — block any telemetry with exact simulator values ===
        const isSimulatorSignature = 
          item.coolant_temp === 85 && 
          item.throttle_pos === 18 && 
          item.dtc_codes &&
          item.dtc_codes.includes('P0113') && 
          item.dtc_codes.includes('P0102');

        if (isSimulatorSignature) {
          console.log('[Telemetry Store] GUARD-4: Skipped queuing — Simulator sensor signature detected.');
          return state;
        }

        // Apply payload conversion/standardization
        const standardizedItem = transformTelemetryPayload(item);

        // Prevent duplicate checks inside the same queue to avoid queue duplication
        const duplicate = state.telemetry_queue.find(q => q.session_hash === standardizedItem.session_hash);
        if (duplicate) {
          return state;
        }
        
        const newItem: TelemetryItem = {
          ...standardizedItem,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          retry_count: 0,
        };
        return { telemetry_queue: [...state.telemetry_queue, newItem] };
      }),

      dequeueTelemetry: (count) => set((state) => ({
        telemetry_queue: state.telemetry_queue.slice(count)
      })),

      incrementRetryCount: (id) => set((state) => ({
        telemetry_queue: state.telemetry_queue.map((item) =>
          item.id === id ? { ...item, retry_count: item.retry_count + 1 } : item
        ),
      })),

      removeTelemetryItem: (id) => set((state) => ({
        telemetry_queue: state.telemetry_queue.filter((item) => item.id !== id),
      })),

      setActiveSessionVehicle: (activeSessionVehicle) => set({ 
        activeSessionVehicle: activeSessionVehicle ? {
          brand: toSnakeCase(activeSessionVehicle.brand),
          model: toSnakeCase(activeSessionVehicle.model),
          year: activeSessionVehicle.year
        } : null 
      }),
      
      clearActiveSessionVehicle: () => set({ activeSessionVehicle: null, chronicFaults: [], sessionDynamicKey: null }),
      
      setSessionDynamicKey: (sessionDynamicKey) => set({ sessionDynamicKey }),

      fetchChronicFaults: async (brand: string) => {
        if (!brand) return;

        // === Deduplication check (Early return if hash matches last_successful_session_hash) ===
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
              console.log('[Telemetry Store] fetchChronicFaults - Deduplication check PASSED (hash matched). Skipping network request.');
              return;
            }
          }
        } catch (hashErr) {
          console.warn('[Telemetry Store] Deduplication check failed in fetchChronicFaults:', hashErr);
        }

        set({ isLoadingChronicFaults: true, chronicFaultsError: null });
        try {
          const standardizedBrand = toSnakeCase(brand);
          console.log('[Telemetry Store] fetchChronicFaults - Calling get_chronic_faults RPC with target_brand:', standardizedBrand);
          const { data, error } = await supabase.rpc('get_chronic_faults', {
            target_brand: standardizedBrand
          });
          
          if (error) {
            console.warn('[Telemetry Store] Error calling get_chronic_faults RPC:', error);
            set({ chronicFaultsError: error.message, chronicFaults: [], isLoadingChronicFaults: false });
          } else {
            console.log('[Telemetry Store] fetchChronicFaults - Raw RPC response data:', data);
            const formattedData: ChronicFault[] = (data || []).map((row: any) => ({
              fault_code: String(row.fault_code || ''),
              unique_days_count: Number(row.unique_days_count || 0),
              total_occurrence: Number(row.total_occurrence || 0)
            }));
            console.log('[Telemetry Store] fetchChronicFaults - Formatted data for UI state:', formattedData);
            set({ chronicFaults: formattedData, isLoadingChronicFaults: false });
          }
        } catch (err: any) {
          console.warn('[Telemetry Store] Failed to fetch chronic faults:', err);
          set({ chronicFaultsError: err?.message || 'Unknown error', chronicFaults: [], isLoadingChronicFaults: false });
        }
      },
    }),
    {
      name: 'motocortex-telemetry-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        telemetry_queue: state.telemetry_queue,
        activeSessionVehicle: state.activeSessionVehicle,
      }),
    }
  )
);
