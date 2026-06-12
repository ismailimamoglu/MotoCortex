import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, ActivityIndicator, SafeAreaView, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';
import { useResponsive } from '../hooks/useResponsive';

export default function PermissionGateway() {
  const { t } = useTranslation();
  const setHasOnboarded = useAppStore((state) => state.setHasOnboarded);
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();

  const [isLoading, setIsLoading] = useState(false);
  const [btStatus, setBtStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [locStatus, setLocStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      let btGranted = true;
      let locGranted = true;

      if (Platform.OS === 'android') {
        const grantedBt = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        btGranted =
          grantedBt[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          grantedBt[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        try {
          const manager = BLEBridge.getInstance();
          const bleState = await manager.state();
          console.log('[PermissionGateway] iOS BLE State:', bleState);

          if (bleState === State.PoweredOn) {
            btGranted = true;
          } else if (bleState === State.Unauthorized) {
            btGranted = false;
          } else if (bleState === State.PoweredOff) {
            btGranted = true;
          } else {
            btGranted = await new Promise<boolean>((resolve) => {
              const sub = manager.onStateChange((newState) => {
                console.log('[PermissionGateway] iOS BLE State Changed:', newState);
                if (newState === State.PoweredOn || newState === State.PoweredOff) {
                  sub.remove();
                  resolve(true);
                } else if (newState === State.Unauthorized) {
                  sub.remove();
                  resolve(false);
                }
              }, true);
              setTimeout(() => {
                sub.remove();
                resolve(true);
              }, 5000);
            });
          }
        } catch (e) {
          console.warn('[PermissionGateway] iOS BLE init error:', e);
          btGranted = false;
        }
      }
      setBtStatus(btGranted ? 'granted' : 'denied');

      if (Platform.OS === 'android') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        locGranted = status === 'granted';
        setLocStatus(locGranted ? 'granted' : 'denied');
      } else {
        locGranted = true;
        setLocStatus('granted');
      }

      if (btGranted && locGranted) {
        setHasOnboarded(true);
      } else {
        Alert.alert(
          t('common.warning', 'Warning'),
          t('permissions.deniedDesc', 'Some permissions were denied. MotoCortex may not be able to scan or connect to OBD2 devices successfully.'),
          [
            { text: t('permissions.proceedAnyway', 'Proceed Anyway'), onPress: () => setHasOnboarded(true) },
            { 
              text: t('permissions.openSettings', 'Open Settings'), 
              onPress: () => {
                Linking.openSettings();
              }
            },
            { text: t('common.cancel', 'Cancel'), style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.warn('Permission request error:', error);
      setHasOnboarded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  // Dynamic Styles generated using the responsive hooks (Memoized for zero re-render overhead)
  const sDyn = React.useMemo(() => {
    return {
      root: {
        flex: 1,
      },
      container: {
        flex: 1,
        paddingHorizontal: scaleWidth(20),
        justifyContent: 'center' as const,
        alignSelf: isTablet ? 'center' : undefined,
        width: isTablet ? (isLargeTablet ? 650 : 520) : '100%',
        maxWidth: isTablet ? 650 : undefined,
      },
      header: {
        alignItems: 'center' as const,
        marginBottom: scaleHeight(24),
      },
      title: {
        fontSize: scaleFont(28),
        fontWeight: '900' as const,
        letterSpacing: 4,
        fontFamily: MONO,
      },
      subtitle: {
        fontSize: scaleFont(10),
        letterSpacing: 6,
        marginTop: scaleHeight(4),
        fontFamily: MONO,
      },
      card: {
        borderWidth: 1.5,
        borderRadius: scaleMod(16),
        padding: scaleMod(16),
        marginBottom: scaleHeight(20),
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
      },
      cardTitle: {
        fontSize: scaleFont(16),
        fontWeight: '800' as const,
        marginBottom: scaleHeight(6),
        fontFamily: MONO,
      },
      cardDesc: {
        fontSize: scaleFont(11.5),
        lineHeight: scaleFont(16),
        marginBottom: scaleHeight(16),
        fontFamily: MONO,
      },
      permRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        marginBottom: scaleHeight(10),
      },
      permIconBox: {
        width: scaleMod(36),
        height: scaleMod(36),
        borderRadius: scaleMod(8),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginRight: scaleWidth(12),
      },
      permIcon: {
        fontSize: scaleFont(16),
      },
      permTextContainer: {
        flex: 1,
      },
      permLabel: {
        fontSize: scaleFont(12.5),
        fontWeight: '700' as const,
        marginBottom: scaleHeight(2),
        fontFamily: MONO,
      },
      permSub: {
        fontSize: scaleFont(9.5),
        lineHeight: scaleFont(13),
        fontFamily: MONO,
      },
      statusIcon: {
        fontSize: scaleFont(16),
        fontWeight: '900' as const,
        marginLeft: scaleWidth(8),
      },
      actionBtn: {
        borderRadius: scaleMod(12),
        paddingVertical: scaleHeight(14),
        alignItems: 'center' as const,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      },
      actionBtnDisabled: {
        opacity: 0.7,
      },
      actionBtnText: {
        fontSize: scaleFont(13),
        fontWeight: '900' as const,
        letterSpacing: 2,
        fontFamily: MONO,
      },
      skipLink: {
        marginTop: scaleHeight(16),
        alignItems: 'center' as const,
      },
      skipText: {
        fontSize: scaleFont(11.5),
        textDecorationLine: 'underline' as const,
        fontFamily: MONO,
      },
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isLargeTablet]) as any;

  return (
    <SafeAreaView style={[sDyn.root, { backgroundColor: colors.bg }]}>
      <View style={sDyn.container}>
        {/* Header */}
        <View style={sDyn.header}>
          <Text style={[sDyn.title, { color: colors.cyan }]}>MOTOCORTEX</Text>
          <Text style={[sDyn.subtitle, { color: colors.textSec }]}>{t('permissions.headerSubtitle', 'PERMISSION GATEWAY')}</Text>
        </View>

        {/* Explanation / Bento Card */}
        <View style={[sDyn.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[sDyn.cardTitle, { color: colors.textPri }]}>{t('permissions.cardTitle', 'Hardware Access Required')}</Text>
          <Text style={[sDyn.cardDesc, { color: colors.textTertiary }]}>
            {t('permissions.cardDesc', "To improve application quality and vehicle compatibility, completely anonymized engine parameters and diagnostic trouble codes (excluding personal data and VIN) captured during diagnostics may be analyzed on our secure servers. By proceeding, you agree to these anonymous telemetry terms.")}
          </Text>

          {/* Perm Item 1: Bluetooth */}
          <View style={[sDyn.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
            <View style={[sDyn.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
              <Text style={sDyn.permIcon}>⚡</Text>
            </View>
            <View style={sDyn.permTextContainer}>
              <Text style={[sDyn.permLabel, { color: colors.textPri }]}>{t('permissions.btLabel', 'Bluetooth (BLE)')}</Text>
              <Text style={[sDyn.permSub, { color: colors.textSec }]}>
                {t('permissions.btSub', 'Used exclusively to pair and stream live CAN-bus/K-Line metrics from your ELM327/OBD2 adapter.')}
              </Text>
            </View>
            {btStatus === 'granted' && <Text style={[sDyn.statusIcon, { color: colors.green }]}>✓</Text>}
            {btStatus === 'denied' && <Text style={[sDyn.statusIcon, { color: colors.red }]}>✕</Text>}
          </View>

          {/* Perm Item 2: Location */}
          {Platform.OS === 'android' && (
            <View style={[sDyn.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
              <View style={[sDyn.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
                <Text style={sDyn.permIcon}>📍</Text>
              </View>
              <View style={sDyn.permTextContainer}>
                <Text style={[sDyn.permLabel, { color: colors.textPri }]}>{t('permissions.locLabel', 'Fine Location')}</Text>
                <Text style={[sDyn.permSub, { color: colors.textSec }]}>
                  {t('permissions.locSub', 'Required by Android system architecture to discover low-energy Bluetooth beacons nearby. We do not track your drives.')}
                </Text>
              </View>
              {locStatus === 'granted' && <Text style={[sDyn.statusIcon, { color: colors.green }]}>✓</Text>}
              {locStatus === 'denied' && <Text style={[sDyn.statusIcon, { color: colors.red }]}>✕</Text>}
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[sDyn.actionBtn, { backgroundColor: colors.cyan, shadowColor: colors.cyan }, isLoading && sDyn.actionBtnDisabled]}
          onPress={requestPermissions}
          disabled={isLoading}
          activeOpacity={0.4}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.card} size="small" />
          ) : (
            <Text style={[sDyn.actionBtnText, { color: colors.card }]}>{t('permissions.grantBtn', 'GRANT & CONTINUE')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setHasOnboarded(true)} style={sDyn.skipLink}>
          <Text style={[sDyn.skipText, { color: colors.textSec }]}>{t('permissions.skipBtn', 'Skip for now (Demo Mode)')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
