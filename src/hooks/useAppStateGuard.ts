import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { featureActivationEngine } from '../core/features/FeatureActivationEngine';
import { testerPresentScheduler } from '../core/protocol/uds/TesterPresentScheduler';

/**
 * Global AppState Guard Hook for MotoCortex.
 * Automatically suspends background intervals/polling (voltage, tester present)
 * when app transitions to background or inactive state, protecting Hermes JS heap memory.
 */
export function useAppStateGuard(onForegroundResume?: () => void, onBackgroundPause?: () => void) {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isNavigatingToBackground = nextAppState.match(/inactive|background/);
      const isReturningToForeground = appStateRef.current.match(/inactive|background/) && nextAppState === 'active';

      if (isNavigatingToBackground) {
        // App backgrounded: Stop voltage polling & active UDS keep-alive schedulers
        featureActivationEngine.stopVoltagePolling();
        testerPresentScheduler.stop();
        
        if (onBackgroundPause) {
          onBackgroundPause();
        }
      } else if (isReturningToForeground) {
        if (onForegroundResume) {
          onForegroundResume();
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [onForegroundResume, onBackgroundPause]);

  return {
    currentAppState: appStateRef.current,
  };
}
