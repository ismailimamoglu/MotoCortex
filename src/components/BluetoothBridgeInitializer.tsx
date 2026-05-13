import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Platform, TouchableOpacity, Linking } from 'react-native';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';
import { useThemeColors } from '../theme';

interface Props {
  children: React.ReactNode;
}

/**
 * Structural UI Blocker & Diagnostic Layer.
 * Ensures the JS -> Native Bridge is healthy before allowing app interaction.
 */
export const BluetoothBridgeInitializer: React.FC<Props> = ({ children }) => {
  const colors = useThemeColors();
  const [bridgeStatus, setBridgeStatus] = useState<'initializing' | 'ready' | 'error' | 'unauthorized'>('initializing');
  const [hardwareState, setHardwareState] = useState<string>('Unknown');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout;

    const initBridge = async () => {
      try {
        const manager = BLEBridge.getInstance();
        
        // Immediate State Check
        const state = await manager.state();
        setHardwareState(state);
        console.log('[BLEBridge] Initial State:', state);

        if (state === State.PoweredOn || state === State.PoweredOff) {
          setBridgeStatus('ready');
          return;
        }

        if (state === State.Unsupported) {
          setBridgeStatus('error');
          setErrorDetails('This device does not support Bluetooth Low Energy.');
          return;
        }

        if (state === State.Unauthorized) {
          setBridgeStatus('unauthorized');
          setErrorDetails('Bluetooth permission was denied.');
          return;
        }

        // Show skip button after 5 seconds if still stuck in Unknown/Resetting
        timeoutId = setTimeout(() => {
          setShowSkip(true);
        }, 5000);

        // Listen for state changes
        subscription = manager.onStateChange((newState) => {
          setHardwareState(newState);
          console.log('[BLEBridge] State Changed:', newState);
          
          if (newState === State.PoweredOn || newState === State.PoweredOff) {
            setBridgeStatus('ready');
            if (timeoutId) clearTimeout(timeoutId);
          } else if (newState === State.Unauthorized) {
            setBridgeStatus('unauthorized');
            setErrorDetails('Bluetooth permission was denied. Please enable it in Settings.');
            if (timeoutId) clearTimeout(timeoutId);
          } else if (newState === State.Unsupported) {
            setBridgeStatus('error');
            setErrorDetails('This device does not support Bluetooth Low Energy.');
            if (timeoutId) clearTimeout(timeoutId);
          }
        }, true);

      } catch (err) {
        console.error('[BLEBridge] Init Error:', err);
        setBridgeStatus('error');
        setErrorDetails(err instanceof Error ? err.message : String(err));
      }
    };

    initBridge();

    return () => {
      if (subscription) subscription.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (bridgeStatus === 'initializing') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={[s.status, { color: colors.cyan }]}>INITIALIZING BRIDGE...</Text>
          <Text style={[s.subStatus, { color: colors.textSec }]}>Verifying iOS CoreBluetooth Connectivity</Text>
          <Text style={[s.stateLabel, { color: colors.textTertiary }]}>STATE: {hardwareState}</Text>

          {showSkip && (
            <TouchableOpacity 
              style={[s.skipBtn, { borderColor: colors.cyan }]} 
              onPress={() => setBridgeStatus('ready')}
            >
              <Text style={[s.skipBtnText, { color: colors.cyan }]}>PROCEED TO DASHBOARD (BYPASS)</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (bridgeStatus === 'error' || bridgeStatus === 'unauthorized') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={s.errorContainer}>
          <Text style={s.errorTitle}>BRIDGE FATAL ERROR</Text>
          <View style={[s.errorCard, { backgroundColor: `${colors.red}1A`, borderColor: colors.red }]}>
            <Text style={[s.errorState, { color: colors.red }]}>NATIVE_STATE: {hardwareState}</Text>
            <Text style={[s.errorMsg, { color: colors.textPri }]}>{errorDetails}</Text>
          </View>
          
          <TouchableOpacity 
            style={[s.settingsBtn, { backgroundColor: colors.cyan }]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={[s.settingsBtnText, { color: colors.card }]}>GO TO SETTINGS</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.bypassBtn, { borderColor: colors.textSec }]}
            onPress={() => setBridgeStatus('ready')}
          >
            <Text style={[s.bypassBtnText, { color: colors.textSec }]}>IGNORE & ENTER APP</Text>
          </TouchableOpacity>

          <Text style={[s.errorAdvice, { color: colors.textSec }]}>
            {Platform.OS === 'ios' 
              ? 'Ensure Bluetooth is enabled for MotoCortex in your system settings.' 
              : 'Please restart the app or check Bluetooth settings.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
};

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  status: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 24,
    fontFamily: MONO,
  },
  subStatus: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: MONO,
  },
  stateLabel: {
    fontSize: 10,
    marginTop: 16,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  skipBtn: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: MONO,
  },
  errorContainer: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  errorTitle: {
    color: '#FF4444',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: MONO,
  },
  errorCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorState: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    fontFamily: MONO,
  },
  errorMsg: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: MONO,
  },
  errorAdvice: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: MONO,
  },
  settingsBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsBtnText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: MONO,
  },
  bypassBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 32,
  },
  bypassBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONO,
  }
});
