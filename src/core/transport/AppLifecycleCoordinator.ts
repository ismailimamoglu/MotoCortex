import { AppState, AppStateStatus } from 'react-native';

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

    private handleAppStateChange(nextAppState: AppStateStatus) {
        if (this.lastState === 'active' && nextAppState.match(/inactive|background/)) {
            if (this.onBackgroundCallback) {
                this.onBackgroundCallback();
            }
        } else if (nextAppState === 'active' && this.lastState !== 'active') {
            if (this.onForegroundCallback) {
                this.onForegroundCallback();
            }
        }
        this.lastState = nextAppState;
    }
}

export default new AppLifecycleCoordinator();
