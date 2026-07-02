import { AppState, AppStateStatus } from 'react-native';
import { beginBackgroundTask, endBackgroundTask } from '../../utils/backgroundTask';

export class AppLifecycleCoordinator {
    private appStateSubscription: any;
    private onBackgroundCallback: (() => void) | null;
    private onForegroundCallback: (() => void) | null;
    private lastState: AppStateStatus;

    constructor() {
        this.appStateSubscription = null;
        this.onBackgroundCallback = null;
        this.onForegroundCallback = null;
        this.lastState = 'active';
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
        
        if (typeof AppState !== 'undefined' && AppState.addEventListener) {
            try {
                this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
            } catch (e) {
                console.warn("[AppLifecycleCoordinator] Failed to bind AppState listener:", e);
            }
        }
    }

    onBackground(callback: () => void) {
        this.onBackgroundCallback = callback;
    }

    onForeground(callback: () => void) {
        this.onForegroundCallback = callback;
    }

    destroy() {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
    }

    private async handleAppStateChange(nextAppState: AppStateStatus) {
        if (this.lastState === 'active' && nextAppState.match(/inactive|background/)) {
            // 1. iOS Native background task başlat
            await beginBackgroundTask();

            // 2. Standart onBackground callback tetikle (Kuyruğu temizle vb.)
            if (this.onBackgroundCallback) {
                try {
                    this.onBackgroundCallback();
                } catch (e) {
                    console.error('[AppLifecycleCoordinator] onBackgroundCallback failed:', e);
                }
            }

            // 3. Maksimum 15 sn zaman aşımı ile telemetri senkronizasyonu tetikle
            try {
                const { TelemetrySyncManager } = require('../../services/TelemetrySyncManager');
                await TelemetrySyncManager.getInstance().syncQueueWithTimeout(15000);
            } catch (syncErr) {
                console.error('[AppLifecycleCoordinator] Background sync failed:', syncErr);
            } finally {
                // 4. Görevi sonlandırıp iOS'e bildir
                await endBackgroundTask();
            }
        } else if (nextAppState === 'active' && this.lastState !== 'active') {
            if (this.onForegroundCallback) {
                try {
                    this.onForegroundCallback();
                } catch (e) {
                    console.error('[AppLifecycleCoordinator] onForegroundCallback failed:', e);
                }
            }
        }
        this.lastState = nextAppState;
    }
}

export default new AppLifecycleCoordinator();
