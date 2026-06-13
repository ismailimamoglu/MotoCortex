import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTelemetryStore, TelemetryItem } from '../store/useTelemetryStore';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../api/supabaseClient';
import * as Logger from './Logger';

let NetInfo: any = null;
try {
  const NetInfoModule = require('@react-native-community/netinfo');
  const tempNetInfo = NetInfoModule.default || NetInfoModule;
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

export class TelemetrySyncManager {
  private static instance: TelemetrySyncManager | null = null;
  private isSyncing = false;
  private syncTimeout: NodeJS.Timeout | null = null;
  private attempt = 0;
  private badPacketCount = 0;

  private rehydrationResolver: (() => void) | null = null;
  private syncSubscriptionRelease: (() => void) | null = null;
  private bluetoothSubscriptionRelease: (() => void) | null = null;
  private isNetInfoConnected = true;

  private constructor() {}

  public static getInstance(): TelemetrySyncManager {
    if (!TelemetrySyncManager.instance) {
      TelemetrySyncManager.instance = new TelemetrySyncManager();
    }
    return TelemetrySyncManager.instance;
  }

  public setNetInfoConnected(connected: boolean): void {
    this.isNetInfoConnected = connected;
  }

  private async awaitQueueRehydration(): Promise<void> {
    if (useTelemetryStore.getState().isQueueLoaded) {
      return;
    }
    return new Promise<void>((resolve) => {
      this.rehydrationResolver = resolve;
    });
  }

  public start(): void {
    this.setupSubscriptions();
  }

  public stop(): void {
    this.releaseSubscription();
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    if (this.bluetoothSubscriptionRelease) {
      this.bluetoothSubscriptionRelease();
      this.bluetoothSubscriptionRelease = null;
    }
  }

  private releaseSubscription(): void {
    if (this.syncSubscriptionRelease) {
      this.syncSubscriptionRelease();
      this.syncSubscriptionRelease = null;
      Logger.log('TELEMETRY_SYNC', 'Released Zustand telemetry queue subscription.');
    }
  }

  private setupSubscriptions(): void {
    this.setupTelemetrySubscription();

    if (!this.bluetoothSubscriptionRelease) {
      let prevConnectionState = useBluetoothStore.getState().connectionState;
      let prevVehicle = useTelemetryStore.getState().activeSessionVehicle;

      this.bluetoothSubscriptionRelease = useBluetoothStore.subscribe((state) => {
        const connState = state.connectionState;
        const activeVehicle = useTelemetryStore.getState().activeSessionVehicle;

        const isRecovery = connState === 'RECOVERY';
        const isSessionEnded = connState === 'DISCONNECTED' && prevConnectionState !== 'DISCONNECTED';
        const isProfileChanged = JSON.stringify(activeVehicle) !== JSON.stringify(prevVehicle);

        if (isRecovery || isSessionEnded || isProfileChanged) {
          Logger.log('TELEMETRY_SYNC', `Subscription cleanup triggered. Recovery: ${isRecovery}, Session Ended: ${isSessionEnded}, Profile Changed: ${isProfileChanged}`);
          this.releaseSubscription();
        } else if (connState === 'TELEMETRY_ACTIVE' && !this.syncSubscriptionRelease) {
          Logger.log('TELEMETRY_SYNC', 'Re-subscribing telemetry queue on TELEMETRY_ACTIVE connectionState.');
          this.setupTelemetrySubscription();
        }

        prevConnectionState = connState;
        prevVehicle = activeVehicle;
      });
    }
  }

  private setupTelemetrySubscription(): void {
    this.releaseSubscription();
    let prevLoaded = useTelemetryStore.getState().isQueueLoaded;
    this.syncSubscriptionRelease = useTelemetryStore.subscribe((state) => {
      const currentLoaded = state.isQueueLoaded;
      if (currentLoaded && !prevLoaded) {
        if (this.rehydrationResolver) {
          const resolve = this.rehydrationResolver;
          this.rehydrationResolver = null;
          resolve();
        }
        if (this.isNetInfoConnected) {
          this.syncQueue();
        }
      }
      prevLoaded = currentLoaded;
    });
  }

  public async syncQueue(): Promise<void> {
    // Evicts simulated/demo items based on protocol, ECU ID, or sensor signature.
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
      simItems.forEach(item => {
        if (useTelemetryStore.getState().isQueueLoaded) {
          useTelemetryStore.getState().removeTelemetryItem(item.id);
        }
      });
      Logger.log(
        'TELEMETRY_SYNC',
        `GUARD: Evicted ${simItems.length} simulated item(s) from queue. ${realCount} real item(s) preserved.`
      );
    }

    if (useAppStore.getState().isSimulationMode) {
      Logger.log('TELEMETRY_SYNC', 'GUARD: Sim mode active — skipping sync.');
      return;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;
    
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    Logger.log('TELEMETRY_SYNC', 'Sync loop started');

    try {
      while (true) {
        // EVENT-DRIVEN PROMISE LOCK: Block loop and await rehydration if queue is not loaded
        if (!useTelemetryStore.getState().isQueueLoaded) {
          Logger.log('TELEMETRY_SYNC', 'GUARD: Queue is not loaded — locking sync loop and awaiting rehydration.');
          await this.awaitQueueRehydration();
          Logger.log('TELEMETRY_SYNC', 'GUARD: Queue rehydrated — resuming sync loop.');
        }

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
          simItems.forEach(item => {
            if (useTelemetryStore.getState().isQueueLoaded) {
              useTelemetryStore.getState().removeTelemetryItem(item.id);
            }
          });
          Logger.log(
            'TELEMETRY_SYNC',
            `GUARD: Mid-sync sim mode detected — evicted ${simItems.length} simulated item(s). ${realCount} real item(s) preserved.`
          );
          break;
        }

        const queue = useTelemetryStore.getState().telemetry_queue;
        if (queue.length === 0) {
          Logger.log('TELEMETRY_SYNC', 'Queue is empty. Sync completed.');
          this.attempt = 0;
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
              if (useTelemetryStore.getState().isQueueLoaded) {
                useTelemetryStore.getState().removeTelemetryItem(item.id);
              }
              continue;
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
            throttle_pos: item.throttle_pos,
            created_at: item.created_at
          };

          Logger.log('TELEMETRY_SYNC', `Syncing session: ${item.session_hash}`);

          try {
            const { error, status } = await supabase.rpc('upsert_telemetry', { payload });

            if (error) {
              Logger.log('TELEMETRY_SYNC', `Error posting telemetry: ${error.message} (Status: ${status})`);
              
              const isValidationError = status === 400 || (status >= 401 && status < 500) || error.message.toLowerCase().includes('validation') || error.message.toLowerCase().includes('syntax');
              
              if (isValidationError) {
                const currentItem = useTelemetryStore.getState().telemetry_queue.find(q => q.id === item.id);
                const currentRetries = currentItem ? currentItem.retry_count : item.retry_count;
                
                if (currentRetries >= 2) {
                  Logger.log('TELEMETRY_SYNC', `Dead Letter Queue: Discarding corrupted item ${item.session_hash} after 3 failed attempts.`);
                  if (useTelemetryStore.getState().isQueueLoaded) {
                    useTelemetryStore.getState().removeTelemetryItem(item.id);
                  }
                } else {
                  if (useTelemetryStore.getState().isQueueLoaded) {
                    useTelemetryStore.getState().incrementRetryCount(item.id);
                  }
                }

                this.badPacketCount = this.badPacketCount + 1;
                const pacingDelay = Math.min(2000, 50 * Math.pow(2, this.badPacketCount));
                Logger.log('TELEMETRY_SYNC', `Validation error paced delay: ${pacingDelay}ms`);
                await new Promise(r => setTimeout(r, pacingDelay));
              } else {
                networkErrorOccurred = true;
                break;
              }
            } else {
              Logger.log('TELEMETRY_SYNC', `Successfully synced session: ${item.session_hash}`);
              try {
                await AsyncStorage.setItem('last_successful_session_hash', item.session_hash);
                Logger.log('TELEMETRY_SYNC', `Updated last_successful_session_hash with: ${item.session_hash}`);
              } catch (storageErr) {
                Logger.log('TELEMETRY_SYNC', `Failed to write last_successful_session_hash to AsyncStorage: ${storageErr}`);
              }
              if (useTelemetryStore.getState().isQueueLoaded) {
                useTelemetryStore.getState().removeTelemetryItem(item.id);
              }
              this.attempt = 0;
              this.badPacketCount = 0;
            }
          } catch (postErr: any) {
            Logger.log('TELEMETRY_SYNC', `Network error posting telemetry: ${postErr.message || postErr}`);
            networkErrorOccurred = true;
            break;
          }
        }

        if (networkErrorOccurred) {
          const attemptVal = this.attempt;
          this.attempt = attemptVal + 1;
          
          const backoffDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, this.attempt));
          const jitter = Math.random() * 1000 - 500;
          const finalDelay = Math.max(1000, backoffDelay + jitter);

          Logger.log('TELEMETRY_SYNC', `Network sync halted. Retrying in ${Math.round(finalDelay)}ms (Attempt #${this.attempt})`);
          
          this.syncTimeout = setTimeout(() => {
            this.syncQueue();
          }, finalDelay);
          break;
        }
      }
    } catch (e: any) {
      Logger.log('TELEMETRY_SYNC', `Sync loop exception: ${e.message}`);
    } finally {
      this.isSyncing = false;
    }
  }
}

export function useTelemetrySync() {
  useEffect(() => {
    const manager = TelemetrySyncManager.getInstance();
    manager.start();

    const unsubscribe = SafeNetInfo.addEventListener((state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      manager.setNetInfoConnected(isConnected);
      if (isConnected) {
        manager.syncQueue();
      }
    });

    SafeNetInfo.fetch().then((state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      manager.setNetInfoConnected(isConnected);
      if (isConnected) {
        manager.syncQueue();
      }
    });

    return () => {
      unsubscribe();
      manager.stop();
    };
  }, []);
}
