import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTelemetryStore, TelemetryItem } from '../store/useTelemetryStore';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../api/supabaseClient';
import * as Logger from './Logger';

let NetInfo: any = null;
try {
  const NetInfoModule = require('@react-native-community/netinfo');
  const tempNetInfo = NetInfoModule.default || NetInfoModule;
  // If the native module is null/missing, evaluating its properties might throw, or we can check its validity.
  if (tempNetInfo && typeof tempNetInfo.fetch === 'function') {
    NetInfo = tempNetInfo;
  }
} catch (e) {
  Logger.log('TELEMETRY_SYNC', 'NetInfo native module is not available. Using pure JS fallback.');
}

const NetInfoFallback = {
  fetch: async () => {
    return {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {}
    };
  },
  addEventListener: (callback: (state: any) => void) => {
    setTimeout(() => {
      callback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });
    }, 100);
    return () => {};
  }
};

const SafeNetInfo = NetInfo || NetInfoFallback;

const BATCH_SIZE = 5;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

export function useTelemetrySync() {
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef(0);

  const removeTelemetryItem = useTelemetryStore((state) => state.removeTelemetryItem);
  const incrementRetryCount = useTelemetryStore((state) => state.incrementRetryCount);

  const syncQueue = async () => {
    // =====================================================================
    // SIMULATION GUARD — Hard gate: never sync simulated data to Supabase.
    // Evicts simulated/demo items based on protocol, ECU ID, or sensor signature.
    // Real offline field data (ISO_15765_4_CAN, etc.) is preserved until internet is available.
    // =====================================================================
    const allQueue = useTelemetryStore.getState().telemetry_queue;
    const simItems = allQueue.filter((item: TelemetryItem) => {
      const isSimulatorEcu = item.ecu_id === 'SIM-ECU-001';
      const isSimulatorProtocol = item.protocol === 'SIMULATED_OBD';
      const isSimulatorSignature = 
        item.coolant_temp === 85 && 
        item.throttle_pos === 18 && 
        item.dtc_codes &&
        item.dtc_codes.includes('P0113') && 
        item.dtc_codes.includes('P0102');
      
      const isUnknownBrand = !item.brand || item.brand.trim().length === 0 || 
        item.brand.toLowerCase() === 'bilinmiyor' || 
        item.brand.toLowerCase() === 'unknown' || 
        item.brand.toLowerCase().includes('demo') || 
        item.brand.toLowerCase().includes('test');

      return item.is_simulated || isSimulatorEcu || isSimulatorProtocol || isSimulatorSignature || isUnknownBrand;
    });

    if (simItems.length > 0) {
      const realCount = allQueue.length - simItems.length;
      simItems.forEach(item => useTelemetryStore.getState().removeTelemetryItem(item.id));
      Logger.log(
        'TELEMETRY_SYNC',
        `GUARD: Evicted ${simItems.length} simulated item(s) from queue. ${realCount} real item(s) preserved.`
      );
    }

    if (useAppStore.getState().isSimulationMode) {
      Logger.log('TELEMETRY_SYNC', 'GUARD: Sim mode active — skipping sync.');
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    Logger.log('TELEMETRY_SYNC', 'Sync loop started');

    try {
      while (true) {
        // Re-check simulation mode at each batch iteration (mode could toggle mid-sync)
        if (useAppStore.getState().isSimulationMode) {
          const allQueue = useTelemetryStore.getState().telemetry_queue;
          const simItems = allQueue.filter((item: TelemetryItem) => {
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
          const realCount = allQueue.length - simItems.length;
          simItems.forEach(item => useTelemetryStore.getState().removeTelemetryItem(item.id));
          Logger.log(
            'TELEMETRY_SYNC',
            `GUARD: Mid-sync sim mode detected — evicted ${simItems.length} simulated item(s). ${realCount} real item(s) preserved.`
          );
          break;
        }

        const queue = useTelemetryStore.getState().telemetry_queue;
        if (queue.length === 0) {
          Logger.log('TELEMETRY_SYNC', 'Queue is empty. Sync completed.');
          attemptRef.current = 0;
          break;
        }

        // Take a batch of 5 items
        const batch = queue.slice(0, BATCH_SIZE);
        let networkErrorOccurred = false;

        for (const item of batch) {
          // Hard-gate check (Ağ Filtresi):
          try {
            const lastSuccessfulHash = await AsyncStorage.getItem('last_successful_session_hash');
            if (lastSuccessfulHash === item.session_hash) {
              Logger.log('TELEMETRY_SYNC', `HARD-GATE: Evicting duplicate offline scan with hash: ${item.session_hash}`);
              removeTelemetryItem(item.id);
              continue; // Skip Supabase API call and proceed to the next item
            }
          } catch (storageErr) {
            Logger.log('TELEMETRY_SYNC', `Error reading from AsyncStorage during hard-gate check: ${storageErr}`);
          }

          const payload = {
            brand: item.brand,
            model: item.model,
            year: item.year,
            protocol: item.protocol,
            ecu_id: item.ecu_id,
            dtc_codes: item.dtc_codes,
            session_hash: item.session_hash,
            engine_rpm: item.engine_rpm,
            coolant_temp: item.coolant_temp,
            throttle_pos: item.throttle_pos
          };

          Logger.log('TELEMETRY_SYNC', `Syncing session: ${item.session_hash}`);

          try {
            const { error, status } = await supabase.rpc('upsert_telemetry', { payload });

            if (error) {
              Logger.log('TELEMETRY_SYNC', `Error posting telemetry: ${error.message} (Status: ${status})`);
              
              // Dead Letter Queue validation:
              // If status is 400 (Bad Request), or it's a structural database schema constraint fail,
              // we increment the retry count. If it exceeds 3 retries, discard it.
              const isValidationError = status === 400 || (status >= 401 && status < 500) || error.message.toLowerCase().includes('validation') || error.message.toLowerCase().includes('syntax');
              
              if (isValidationError) {
                const currentItem = useTelemetryStore.getState().telemetry_queue.find(q => q.id === item.id);
                const currentRetries = currentItem ? currentItem.retry_count : item.retry_count;
                
                if (currentRetries >= 2) {
                  Logger.log('TELEMETRY_SYNC', `Dead Letter Queue: Discarding corrupted item ${item.session_hash} after 3 failed attempts.`);
                  removeTelemetryItem(item.id);
                } else {
                  incrementRetryCount(item.id);
                }
              } else {
                // Treats as network error or server overload (5xx / network timeout)
                networkErrorOccurred = true;
                break;
              }
            } else {
              // Successfully posted
              Logger.log('TELEMETRY_SYNC', `Successfully synced session: ${item.session_hash}`);
              try {
                await AsyncStorage.setItem('last_successful_session_hash', item.session_hash);
                Logger.log('TELEMETRY_SYNC', `Updated last_successful_session_hash with: ${item.session_hash}`);
              } catch (storageErr) {
                Logger.log('TELEMETRY_SYNC', `Failed to write last_successful_session_hash to AsyncStorage: ${storageErr}`);
              }
              removeTelemetryItem(item.id);
              attemptRef.current = 0; // Reset backoff attempts on successful send
            }
          } catch (postErr: any) {
            Logger.log('TELEMETRY_SYNC', `Network error posting telemetry: ${postErr.message || postErr}`);
            networkErrorOccurred = true;
            break;
          }
        }

        // If a network error occurred, halt the sync loop and schedule a retry
        if (networkErrorOccurred) {
          const attempt = attemptRef.current;
          attemptRef.current = attempt + 1;
          
          // Exponential backoff: base_delay * 2^attempt
          const backoffDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
          // Jitter: +/- 500ms
          const jitter = Math.random() * 1000 - 500;
          const finalDelay = Math.max(1000, backoffDelay + jitter);

          Logger.log('TELEMETRY_SYNC', `Network sync halted. Retrying in ${Math.round(finalDelay)}ms (Attempt #${attemptRef.current})`);
          
          syncTimeoutRef.current = setTimeout(() => {
            syncQueue();
          }, finalDelay);
          break;
        }
      }
    } catch (e: any) {
      Logger.log('TELEMETRY_SYNC', `Sync loop exception: ${e.message}`);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // Listen to network status changes
    const unsubscribe = SafeNetInfo.addEventListener((state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      Logger.log('TELEMETRY_SYNC', `Network changed. Connected: ${isConnected}`);
      if (isConnected) {
        syncQueue();
      }
    });

    // Run initial sync check
    SafeNetInfo.fetch().then((state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected) {
        syncQueue();
      }
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);
}
