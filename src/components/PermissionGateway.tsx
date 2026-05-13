import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, ActivityIndicator, SafeAreaView, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';

export default function PermissionGateway() {
  const { t } = useTranslation();
  const setHasOnboarded = useAppStore((state) => state.setHasOnboarded);
  const colors = useThemeColors();

  const [isLoading, setIsLoading] = useState(false);
  const [btStatus, setBtStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [locStatus, setLocStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      let btGranted = true;
      let locGranted = true;

      // 1. Bluetooth Permissions/Activation
      if (Platform.OS === 'android') {
        const grantedBt = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        btGranted =
          grantedBt[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          grantedBt[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS/macOS: Initialize the BLE Manager singleton.
        // This triggers the native CBCentralManager which in turn fires the
        // system "App Would Like to Use Bluetooth" permission popup on first launch.
        try {
          const manager = BLEBridge.getInstance();
          // Query current hardware state. The act of calling .state() after
          // initialization ensures CoreBluetooth has been asked to power up.
          const bleState = await manager.state();
          console.log('[PermissionGateway] iOS BLE State:', bleState);

          if (bleState === State.PoweredOn) {
            btGranted = true;
          } else if (bleState === State.Unauthorized) {
            btGranted = false;
          } else if (bleState === State.PoweredOff) {
            // BT is off but permission is granted — user just needs to turn it on
            btGranted = true;
          } else {
            // State.Unknown or State.Resetting — wait briefly for state resolution
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
              // Timeout: don't block forever
              setTimeout(() => {
                sub.remove();
                resolve(true); // Proceed optimistically
              }, 5000);
            });
          }
        } catch (e) {
          console.warn('[PermissionGateway] iOS BLE init error:', e);
          btGranted = false;
        }
      }
      setBtStatus(btGranted ? 'granted' : 'denied');

      // 2. Cross-Platform Location Permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      locGranted = status === 'granted';
      setLocStatus(locGranted ? 'granted' : 'denied');

      // Allow transition if acknowledged/granted
      if (btGranted && locGranted) {
        setHasOnboarded(true);
      } else {
        Alert.alert(
          t('common.warning'),
          'Some permissions were denied. MotoCortex may not be able to scan or connect to OBD2 devices successfully.',
          [
            { text: 'Proceed Anyway', onPress: () => setHasOnboarded(true) },
            { 
              text: 'Open Settings', 
              onPress: () => {
                Linking.openSettings();
              }
            },
            { text: t('common.cancel'), style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.warn('Permission request error:', error);
      // Failsafe transition
      setHasOnboarded(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.cyan }]}>MOTOCORTEX</Text>
          <Text style={[s.subtitle, { color: colors.textSec }]}>PERMISSION GATEWAY</Text>
        </View>

        {/* Explanation / Bento Card */}
        <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>Hardware Access Required</Text>
          <Text style={[s.cardDesc, { color: colors.textTertiary }]}>
            To perform high-speed diagnostic communication with your motorcycle's Engine Control Unit (ECU), MotoCortex requires direct hardware links.
          </Text>

          {/* Perm Item 1: Bluetooth */}
          <View style={[s.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
            <View style={[s.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
              <Text style={s.permIcon}>⚡</Text>
            </View>
            <View style={s.permTextContainer}>
              <Text style={[s.permLabel, { color: colors.textPri }]}>Bluetooth (BLE)</Text>
              <Text style={[s.permSub, { color: colors.textSec }]}>
                Used exclusively to pair and stream live CAN-bus/K-Line metrics from your ELM327/OBD2 adapter.
              </Text>
            </View>
            {btStatus === 'granted' && <Text style={[s.statusIcon, { color: colors.green }]}>✓</Text>}
            {btStatus === 'denied' && <Text style={[s.statusIcon, { color: colors.red }]}>✕</Text>}
          </View>

          {/* Perm Item 2: Location */}
          <View style={[s.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
            <View style={[s.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
              <Text style={s.permIcon}>📍</Text>
            </View>
            <View style={s.permTextContainer}>
              <Text style={[s.permLabel, { color: colors.textPri }]}>Fine Location</Text>
              <Text style={[s.permSub, { color: colors.textSec }]}>
                Required by Android system architecture to discover low-energy Bluetooth beacons nearby. We do not track your drives.
              </Text>
            </View>
            {locStatus === 'granted' && <Text style={[s.statusIcon, { color: colors.green }]}>✓</Text>}
            {locStatus === 'denied' && <Text style={[s.statusIcon, { color: colors.red }]}>✕</Text>}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.cyan, shadowColor: colors.cyan }, isLoading && s.actionBtnDisabled]}
          onPress={requestPermissions}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.card} size="small" />
          ) : (
            <Text style={[s.actionBtnText, { color: colors.card }]}>GRANT & CONTINUE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setHasOnboarded(true)} style={s.skipLink}>
          <Text style={[s.skipText, { color: colors.textSec }]}>Skip for now (Demo Mode)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: MONO,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 6,
    marginTop: 4,
    fontFamily: MONO,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    fontFamily: MONO,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: MONO,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  permIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  permIcon: {
    fontSize: 20,
  },
  permTextContainer: {
    flex: 1,
  },
  permLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: MONO,
  },
  permSub: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: MONO,
  },
  statusIcon: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 10,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnDisabled: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: MONO,
  },
  skipLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 12,
    textDecorationLine: 'underline',
    fontFamily: MONO,
  },
});
