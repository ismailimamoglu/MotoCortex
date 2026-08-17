import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Platform, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';
import { useThemeColors } from '../theme';
import { useAppStore } from '../store/useAppStore';

interface Props {
  children: React.ReactNode;
}

/**
 * Structural UI Blocker & Diagnostic Layer.
 * Ensures the JS -> Native Bridge is healthy before allowing app interaction.
 */
export const BluetoothBridgeInitializer: React.FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isSimulationMode = useAppStore(s => s.isSimulationMode);
  const [bridgeStatus, setBridgeStatus] = useState<'initializing' | 'ready' | 'error' | 'unauthorized'>('initializing');
  const [hardwareState, setHardwareState] = useState<string>('Unknown');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showSkip, setShowSkip] = useState(true);

  useEffect(() => {
    let subscription: any = null;
    let timeoutId: any = null;

    const initBridge = async () => {
      try {
        if (isSimulationMode || __DEV__) {
          setBridgeStatus('ready');
          return;
        }

        let state = State.PoweredOn;
        try {
          state = await BLEBridge.getHardwareState();
        } catch (e) {
          console.warn('[BluetoothBridgeInitializer] BLE state check fallback:', e);
        }
        setHardwareState(state);
        
        if (state === State.PoweredOn || state === State.Unsupported || state === State.Unknown) {
          setBridgeStatus('ready');
          return;
        } else if (state === State.Unauthorized) {
          setBridgeStatus('unauthorized');
          setErrorDetails(t('bridge.unauthorized'));
          return;
        }

        try {
          const manager = BLEBridge.getInstance();
          if (manager) {
            subscription = manager.onStateChange((newState: State) => {
              setHardwareState(newState);
              if (newState === State.PoweredOn || newState === State.Unsupported) {
                setBridgeStatus('ready');
              } else if (newState === State.Unauthorized) {
                setBridgeStatus('unauthorized');
                setErrorDetails(t('bridge.unauthorized'));
              }
            }, true);
          } else {
            setBridgeStatus('ready');
          }
        } catch (subErr) {
          console.warn('[BluetoothBridgeInitializer] Subscription warning:', subErr);
          setBridgeStatus('ready');
        }

        timeoutId = setTimeout(() => {
          setShowSkip(true);
        }, 1000);

        // Safety fallback: auto-proceed after 3 seconds max to prevent stuck initializing screen
        setTimeout(() => {
          setBridgeStatus(prev => prev === 'initializing' ? 'ready' : prev);
        }, 3000);

      } catch (err: any) {
        setBridgeStatus('ready');
      }
    };

    initBridge();

    return () => {
      if (subscription) subscription.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSimulationMode]);

  if (bridgeStatus === 'initializing') {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={[s.status, { color: colors.cyan }]}>{t('bridge.initializing')}</Text>
          <Text style={[s.subStatus, { color: colors.textSec }]}>
            {Platform.OS === 'ios' 
              ? t('bridge.verifyingIos') 
              : t('bridge.verifyingAndroid')}
          </Text>
          <Text style={[s.stateLabel, { color: colors.textTertiary }]}>{t('bridge.state')}: {hardwareState}</Text>

          {showSkip && (
            <TouchableOpacity 
              style={[s.skipBtn, { borderColor: colors.cyan }]} 
              onPress={() => setBridgeStatus('ready')}
            >
              <Text style={[s.skipBtnText, { color: colors.cyan }]}>{t('bridge.proceedBypass')}</Text>
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
          <Text style={s.errorTitle}>{t('bridge.fatalError')}</Text>
          <View style={[s.errorCard, { backgroundColor: `${colors.red}1A`, borderColor: colors.red }]}>
            <Text style={[s.errorState, { color: colors.red }]}>{t('bridge.nativeState')}: {hardwareState}</Text>
            <Text style={[s.errorMsg, { color: colors.textPri }]}>{errorDetails}</Text>
          </View>
          
          {bridgeStatus === 'unauthorized' && (
            <TouchableOpacity 
              style={[s.settingsBtn, { backgroundColor: colors.cyan }]}
              onPress={() => Linking.openSettings()}
            >
              <Text style={[s.settingsBtnText, { color: colors.card }]}>{t('bridge.goToSettings')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[s.bypassBtn, { borderColor: colors.textSec }]}
            onPress={() => setBridgeStatus('ready')}
          >
            <Text style={[s.bypassBtnText, { color: colors.textSec }]}>{t('bridge.ignoreEnterApp')}</Text>
          </TouchableOpacity>

          <Text style={[s.errorAdvice, { color: colors.textSec }]}>
            {Platform.OS === 'ios' 
              ? t('bridge.iosAdvice') 
              : t('bridge.androidAdvice')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
};

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

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
