import React, { useState, useEffect, useMemo } from 'react';
import './global.css';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Platform, PermissionsAndroid, ActivityIndicator, Share, Modal, Alert, FlatList, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBluetooth } from './src/hooks/useBluetooth';
import { BluetoothDevice } from 'react-native-bluetooth-classic';
import { ADAPTER_COMMANDS } from './src/api/commands';
import { lookupDTC } from './src/data/dtcDictionary';
import BatteryTestModal from './src/components/BatteryTestModal';
import FreezeFrameModal from './src/components/FreezeFrameModal';
import PerformanceModal from './src/components/PerformanceModal';
import { useBluetoothStore } from './src/store/useBluetoothStore';
import { saveGarageRecord, getGarageRecords, deleteGarageRecord, getRecordsByVin, GarageRecord } from './src/store/garageStore';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import crashlytics from '@react-native-firebase/crashlytics';
import PermissionGateway from './src/components/PermissionGateway';
import LiveEngineHero from './src/components/LiveEngineHero';
import BentoGrid from './src/components/BentoGrid';
import QuickSettingsModal from './src/components/QuickSettingsModal';
import { useAppStore } from './src/store/useAppStore';
import Purchases from 'react-native-purchases';
import PaywallModal from './src/components/PaywallModal';
import { useThemeColors, getTheme } from './src/theme';
import { BluetoothBridgeInitializer } from './src/components/BluetoothBridgeInitializer';


const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';


const DashboardSpeedometer = React.memo(({ ecuStatus, lastDeviceName, onConnectPress }: {
  ecuStatus: string;
  lastDeviceName: string | null;
  onConnectPress: () => void;
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const rpm = useBluetoothStore(s => s.rpm);
  const speed = useBluetoothStore(s => s.speed);
  const coolant = useBluetoothStore(s => s.coolant);
  const throttle = useBluetoothStore(s => s.throttle);
  const voltage = useBluetoothStore(s => s.voltage);
  const engineLoad = useBluetoothStore(s => s.engineLoad);
  const intakeAirTemp = useBluetoothStore(s => s.intakeAirTemp);
  const manifoldPressure = useBluetoothStore(s => s.manifoldPressure);

  const voltNum = voltage ? parseFloat(voltage.replace('V', '')) : null;
  const isBatteryLow = voltNum !== null && voltNum < 11.8;
  const isBatteryWarn = voltNum !== null && voltNum < 12.2 && voltNum >= 11.8;

  const statusColor = (s: string) => {
    if (s === 'connected') return tc.green;
    if (s === 'connecting') return tc.amber;
    if (s === 'error') return tc.red;
    return tc.textSec;
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Device Connection Card */}
      <TouchableOpacity
        style={{
          backgroundColor: ecuStatus === 'connected' ? `${tc.green}14` : tc.card,
          borderWidth: 1.5,
          borderColor: ecuStatus === 'connected' ? tc.green : tc.cyan,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onPress={onConnectPress}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor(ecuStatus) }} />
          <View>
            <Text style={{ color: tc.textPri, fontSize: 14, fontWeight: '900', fontFamily: MONO }}>
              {ecuStatus === 'connected' ? t('dashboard.connectedDevice') : t('dashboard.selectDevice')}
            </Text>
            <Text style={{ color: tc.textSec, fontSize: 10, fontFamily: MONO, marginTop: 2 }}>
              {ecuStatus === 'connected' && lastDeviceName ? lastDeviceName : t('dashboard.noConnection')}
            </Text>
          </View>
        </View>
        <Text style={{ color: ecuStatus === 'connected' ? tc.green : tc.cyan, fontSize: 18, fontWeight: '900' }}>›</Text>
      </TouchableOpacity>

      {/* Battery Warning */}
      {isBatteryLow && (
        <View style={{ flexDirection: 'row', backgroundColor: `${tc.red}1A`, borderWidth: 1, borderColor: tc.red, borderRadius: 4, padding: 14, marginBottom: 16, gap: 10, alignItems: 'flex-start' }}>
          <Text style={{ color: tc.red, fontSize: 20 }}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tc.red, fontSize: 12, fontWeight: '900', fontFamily: MONO, marginBottom: 4 }}>{t('dashboard.batteryLow')}</Text>
            <Text style={{ color: tc.textSec, fontSize: 11, fontFamily: MONO, lineHeight: 17 }}>{t('dashboard.batteryLowDesc', { voltage })}</Text>
          </View>
        </View>
      )}
      {isBatteryWarn && (
        <View style={{ flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: 4, padding: 14, marginBottom: 16, gap: 10, alignItems: 'flex-start' }}>
          <Text style={{ color: tc.amber, fontSize: 20 }}>⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tc.amber, fontSize: 12, fontWeight: '900', fontFamily: MONO, marginBottom: 4 }}>{t('dashboard.batteryWarn')}</Text>
            <Text style={{ color: tc.textSec, fontSize: 11, fontFamily: MONO, lineHeight: 17 }}>{t('dashboard.batteryWarnDesc', { voltage })}</Text>
          </View>
        </View>
      )}

      {/* RPM Hero */}
      <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: tc.card, borderRadius: 4, borderWidth: 1, borderColor: tc.border, marginBottom: 16 }}>
        <Text style={{ fontSize: 72, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{rpm !== null ? rpm : '----'}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: -4 }}>RPM</Text>
      </View>

      {/* Sensor Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{speed !== null ? speed : '--'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.speed')}</Text>
        </View>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{throttle !== null ? `${throttle}%` : '--'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.throttle')}</Text>
        </View>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, coolant !== null && coolant > 100 ? { color: tc.red } : {}]}>
            {coolant !== null ? `${coolant}°` : '--'}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.temp')}</Text>
        </View>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[{ fontSize: 18, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, rpm !== null && (rpm > 7000 ? { color: tc.red } : rpm > 3000 ? { color: tc.green } : { color: tc.amber })]}>
            {rpm !== null ? (rpm > 7000 ? t('dashboard.statusHigh') : rpm > 3000 ? t('dashboard.statusNormal') : t('dashboard.statusLow')) : '--'}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.status')}</Text>
        </View>
        <View style={[{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }, { borderColor: isBatteryLow ? tc.red : isBatteryWarn ? tc.amber : tc.border }]}>
          <Text style={[{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, { color: isBatteryLow ? tc.red : isBatteryWarn ? tc.amber : tc.green }]}>
            {voltage || '--'}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.battery')}</Text>
        </View>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{engineLoad !== null ? `${engineLoad}%` : '--'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.load')}</Text>
        </View>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, intakeAirTemp !== null && intakeAirTemp > 60 ? { color: tc.amber } : {}]}>
            {intakeAirTemp !== null ? `${intakeAirTemp}°` : '--'}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.intake')}</Text>
        </View>
        <View style={{ width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{manifoldPressure !== null ? manifoldPressure : '--'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 }}>{t('dashboard.manifold')}</Text>
        </View>
      </View>
    </ScrollView>
  );
});

// Modal Wrappers
const BatteryTestModalWrapper = ({ visible, onClose, sendCommand }: any) => {
  const voltage = useBluetoothStore(s => s.voltage);
  return <BatteryTestModal
    visible={visible}
    onClose={onClose}
    sendCommand={sendCommand}
    voltage={voltage}
  />;
};

const PerformanceModalWrapper = ({ visible, onClose }: any) => {
  const speed = useBluetoothStore(s => s.speed);
  return <PerformanceModal
    visible={visible}
    onClose={onClose}
    speed={speed}
  />;
};

export default function App() {
  const { t, i18n } = useTranslation();
  const {
    status, adapterStatus, ecuStatus, logs,
    enableBluetooth, scanDevices, connect, disconnect,
    sendCommand, retryEcu, clearLogs,
    dtcs, vin, odometer, distanceSinceCleared, distanceMilOn,
    isDiagnosticMode, isAdaptationRunning,
    startPolling, stopPolling,
    runDiagnostics, clearDiagnostics, runAdaptationRoutine,
    lastDeviceId, lastDeviceName, isCloneDevice
  } = useBluetooth();

  const [vinHistory, setVinHistory] = useState<GarageRecord[]>([]);
  const [manualVin, setManualVin] = useState('');

  const [hasShownCloneWarning, setHasShownCloneWarning] = useState(false);

  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);
  const theme = useAppStore((state) => state.theme);
  const colors = useThemeColors();
  const tc = colors;

  const s = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tc.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    // ── Connection Screen ──
    connectPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    logoArea: { alignItems: 'center', marginBottom: 40 },
    logoText: { fontSize: 36, fontWeight: '900', color: tc.cyan, fontFamily: MONO, letterSpacing: 4 },
    logoSub: { fontSize: 14, color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 6 },

    badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
    badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 10, fontWeight: '800', fontFamily: MONO },

    connectActions: { width: '100%', alignItems: 'center', gap: 12 },
    scanBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: tc.cyan, borderRadius: 4, paddingVertical: 16, paddingHorizontal: 50, width: '100%', alignItems: 'center' },
    scanBtnText: { color: tc.cyan, fontWeight: '900', fontSize: 16, fontFamily: MONO, letterSpacing: 2 },
    btEnableBtn: { backgroundColor: tc.elevated, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 30, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: tc.border },
    btEnableBtnText: { color: tc.textSec, fontWeight: '700', fontSize: 12, fontFamily: MONO },

    scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    scanningText: { color: tc.cyan, fontSize: 12, fontFamily: MONO },

    deviceSection: { width: '100%', marginTop: 20 },
    deviceSectionTitle: { color: tc.textSec, fontSize: 10, fontWeight: '800', fontFamily: MONO, marginBottom: 10, letterSpacing: 2 },
    deviceCard: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deviceName: { color: tc.textPri, fontSize: 14, fontWeight: '700', fontFamily: MONO },
    deviceMac: { color: tc.textSec, fontSize: 10, fontFamily: MONO, marginTop: 4 },
    connectLabel: { color: tc.cyan, fontSize: 12, fontWeight: '800', fontFamily: MONO },
    hintText: { color: tc.textSec, fontSize: 11, fontFamily: MONO, marginTop: 20, textAlign: 'center' },

    ecuConnecting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    ecuErrorText: { color: tc.red, fontSize: 12, fontFamily: MONO, textAlign: 'center', marginBottom: 10 },
    retryBtn: { backgroundColor: tc.amber, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 30, width: '100%', alignItems: 'center', marginBottom: 10 },
    retryBtnText: { color: tc.card, fontWeight: '900', fontSize: 13, fontFamily: MONO },
    disconnectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tc.red, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 30, width: '100%', alignItems: 'center' },
    disconnectBtnText: { color: tc.red, fontWeight: '700', fontSize: 12, fontFamily: MONO },

    // ── Top Bar ──
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    topLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    topLogo: { color: tc.cyan, fontSize: 16, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 },
    topVersion: { color: tc.textSec, fontSize: 10, fontFamily: MONO },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    topBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    topBadgeDot: { width: 5, height: 5, borderRadius: 3 },
    topBadgeText: { fontSize: 9, fontWeight: '900', fontFamily: MONO },
    topDisconnect: { color: tc.red, fontSize: 10, fontWeight: '800', fontFamily: MONO },

    // ── Tab Bar ──
    tabBar: { flexDirection: 'row', backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: tc.cyan },
    tabLabel: { color: tc.textSec, fontSize: 10, fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
    tabLabelActive: { color: tc.cyan },

    // ── Tab Content ──
    tabContent: { flex: 1, paddingHorizontal: 0, paddingTop: 16 },
    tabContentInner: { paddingHorizontal: 16 },

    // ── Dashboard: RPM ──
    rpmHero: { alignItems: 'center', paddingVertical: 24, backgroundColor: tc.card, borderRadius: 4, borderWidth: 1, borderColor: tc.border, marginBottom: 16 },
    rpmNumber: { fontSize: 72, fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    rpmUnit: { fontSize: 14, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: -4 },

    // ── Dashboard: Sensor Grid ──
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    sensorCard: { width: '48.5%', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' },
    sensorValue: { fontSize: 28, fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    sensorLabel: { fontSize: 10, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: 4, letterSpacing: 2 },

    // ── Quick Command Bar ──
    quickBar: { marginBottom: 16 },
    cmdRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    cmdInput: { flex: 1, backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, color: tc.textPri, fontFamily: MONO, fontSize: 12 },
    cmdSend: { backgroundColor: tc.cyan, borderRadius: 4, width: 44, alignItems: 'center', justifyContent: 'center' },
    cmdSendText: { color: tc.card, fontSize: 20, fontWeight: '900' },
    chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: tc.cyan, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { color: tc.cyan, fontSize: 10, fontWeight: '800', fontFamily: MONO },

    // ── Terminal ──
    terminalBox: { backgroundColor: tc.bg, borderWidth: 1, borderColor: tc.border, borderRadius: 4, overflow: 'hidden' },
    terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    terminalTitle: { color: tc.textSec, fontSize: 10, fontWeight: '800', fontFamily: MONO },
    terminalClear: { color: tc.cyan, fontSize: 10, fontWeight: '700', fontFamily: MONO },
    terminalScroll: { maxHeight: 160, padding: 10 },
    terminalLine: { color: tc.green, fontSize: 10, fontFamily: MONO, lineHeight: 16 },

    // ── Panels (Expertise/Service) ──
    panel: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 4, padding: 16, marginBottom: 12 },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { color: tc.textSec, fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, marginBottom: 12 },
    panelDesc: { color: tc.textSec, fontSize: 11, fontFamily: MONO, lineHeight: 18, marginBottom: 16 },

    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tc.border },
    tableLabel: { color: tc.textSec, fontSize: 12, fontFamily: MONO },
    tableValue: { color: tc.textPri, fontSize: 12, fontWeight: '700', fontFamily: MONO },

    // ── Action Buttons ──
    actionBtn: { borderRadius: 4, paddingVertical: 16, alignItems: 'center' },
    actionBtnText: { fontWeight: '900', fontSize: 13, fontFamily: MONO, letterSpacing: 1 },
    actionPurple: { backgroundColor: tc.purple },
    actionCyan: { backgroundColor: tc.cyan },
    actionRed: { backgroundColor: tc.red },

    // ── Brand Selector ──
    brandScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
    brandScrollContent: { paddingRight: 32, gap: 10 },
    brandChip: { backgroundColor: tc.elevated, borderWidth: 1, borderColor: tc.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    brandChipActive: { backgroundColor: `${tc.cyan}1A`, borderColor: tc.cyan },
    brandChipText: { color: tc.textSec, fontSize: 11, fontWeight: '700', fontFamily: MONO },
    brandChipTextActive: { color: tc.cyan, fontWeight: '900' },

    // ── DTC Items ──
    cleanBadge: { backgroundColor: `${tc.green}14`, borderWidth: 1, borderColor: tc.green, borderRadius: 4, paddingVertical: 14, alignItems: 'center' },
    cleanBadgeText: { color: tc.green, fontWeight: '800', fontSize: 12, fontFamily: MONO },
    dtcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${tc.red}14`, borderWidth: 1, borderColor: tc.red, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6 },
    dtcDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tc.red },
    dtcCode: { color: tc.red, fontWeight: '800', fontSize: 14, fontFamily: MONO },

    clearBtn: { backgroundColor: `${tc.red}26`, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4 },
    clearBtnText: { color: tc.red, fontSize: 10, fontWeight: '800', fontFamily: MONO },

    // ── Warning Banner ──
    warningBanner: { flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: 4, padding: 14, marginBottom: 16, gap: 10, alignItems: 'flex-start' },
    warningIcon: { color: tc.amber, fontSize: 20 },
    warningTitle: { color: tc.amber, fontSize: 12, fontWeight: '900', fontFamily: MONO, marginBottom: 4 },
    warningBody: { color: tc.textSec, fontSize: 11, fontFamily: MONO, lineHeight: 17 },

    // ── New Styles ──
    miniAction: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    miniActionText: { fontWeight: '800', fontSize: 11, fontFamily: MONO },
  }), [tc]);

  const verifyEntitlement = useAppStore((state) => state.verifyEntitlement);
  const [activeHubView, setActiveHubView] = useState<'hub' | 'sensors' | 'expertise' | 'info'>('hub');
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expertise' | 'info'>('dashboard'); // Kept for legacy fallback views compatibility
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);

  // RevenueCat SDK Setup & Secure Offline Receipt Verification
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: 'appl_your_ios_api_key' });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: 'goog_your_android_api_key' });
        }
        await verifyEntitlement();
      } catch (e) {
        console.warn('Failed to configure RevenueCat SDK offline or missing parameters:', e);
      }
    };
    initRevenueCat();
  }, []);

  // Garage states
  const [garageRecords, setGarageRecords] = useState<GarageRecord[]>([]);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [saveMake, setSaveMake] = useState('');
  const [saveModel, setSaveModel] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<GarageRecord | null>(null);
  const [isGarageStatsExpanded, setIsGarageStatsExpanded] = useState(false);
  const [expandedInfoSection, setExpandedInfoSection] = useState<string | null>(null);

  const [isBatteryTestVisible, setIsBatteryTestVisible] = useState(false);
  const [isFreezeFrameVisible, setIsFreezeFrameVisible] = useState(false);
  const [isPerformanceVisible, setIsPerformanceVisible] = useState(false);

  useEffect(() => { checkPermissions(); }, []);

  // Force Crashlytics Initialization
  useEffect(() => {
    const initCrashlytics = async () => {
      try {
        if (!crashlytics().isCrashlyticsCollectionEnabled) {
          await crashlytics().setCrashlyticsCollectionEnabled(true);
        }
        crashlytics().log('App mounted and Crashlytics initialized');
        console.log('Crashlytics collection enabled Status:', crashlytics().isCrashlyticsCollectionEnabled);
      } catch (e) {
        console.error('Failed to init Crashlytics:', e);
      }
    };
    initCrashlytics();
  }, []);

  useEffect(() => {
    if (ecuStatus === 'connected' && !isPolling) {
      startPolling(); setIsPolling(true);
    } else if (ecuStatus !== 'connected' && isPolling) {
      stopPolling(); setIsPolling(false);
    }
  }, [ecuStatus]);

  // No longer blocking navigation when disconnected.
  useEffect(() => {
    if (ecuStatus === 'connected') {
      setIsConnectModalVisible(false);
    }
  }, [ecuStatus]);

  // Load garage records
  useEffect(() => {
    getGarageRecords().then(setGarageRecords);
  }, []);

  // VIN History Check
  useEffect(() => {
    const checkHistory = async () => {
      const currentVin = vin || manualVin;
      if (currentVin && currentVin.length > 5) {
        const history = await getRecordsByVin(currentVin);
        setVinHistory(history);
      } else {
        setVinHistory([]);
      }
    };
    checkHistory();
  }, [vin, manualVin]);

  const handleSaveToGarage = async () => {
    if (!saveMake.trim() || !saveModel.trim()) {
      Alert.alert(t('expertise.missingInfo'), t('expertise.missingInfoDesc'));
      return;
    }
    await saveGarageRecord({
      make: saveMake.trim(),
      model: saveModel.trim(),
      vin: vin || manualVin || t('common.unknown'),
      km: odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer}` : t('common.unknown'),
      dtcs: dtcs,
    });
    setIsSaveModalVisible(false);
    setSaveMake('');
    setSaveModel('');
    // Refresh records and history
    const allRecords = await getGarageRecords();
    setGarageRecords(allRecords);
    const currentVin = vin || manualVin;
    if (currentVin && currentVin.length > 5) {
      setVinHistory(await getRecordsByVin(currentVin));
    }
    Alert.alert(t('expertise.saved'), t('expertise.savedDesc'));
  };



  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);
        setPermissionGranted(Object.values(granted).every(s => s === PermissionsAndroid.RESULTS.GRANTED));
      } catch (err) { console.warn(err); }
    } else { setPermissionGranted(true); }
  };

  const handleScan = async () => { setScannedDevices(await scanDevices()); };


  const guardAction = (action: () => void) => {
    if (ecuStatus !== 'connected') {
      Alert.alert(t('expertise.connRequired'), t('expertise.connRequiredDesc'));
      setIsConnectModalVisible(true);
      return;
    }
    action();
  };

  const handleShareReport = async () => {
    // Dynamic i18n.t() — called at execution time to match current active language
    const { rpm, speed, coolant, throttle, engineLoad, intakeAirTemp, manifoldPressure, voltage } = useBluetoothStore.getState();
    const dtcLines = dtcs.length > 0
      ? dtcs.map(dtc => {
        const desc = lookupDTC(dtc);
        return desc ? `  • ${dtc} — ${desc}` : `  • ${dtc}`;
      }).join('\n')
      : `  ✅ ${i18n.t('report.noDtcs')}`;

    const sensorLines = [
      rpm !== null ? `  RPM: ${rpm}` : null,
      speed !== null ? `  ${i18n.t('report.speed')}: ${speed} km/h` : null,
      coolant !== null ? `  ${i18n.t('report.coolant')}: ${coolant}°C` : null,
      throttle !== null ? `  ${i18n.t('report.throttle')}: ${throttle}%` : null,
      engineLoad !== null ? `  ${i18n.t('report.engineLoad')}: ${engineLoad}%` : null,
      intakeAirTemp !== null ? `  ${i18n.t('report.intakeAir')}: ${intakeAirTemp}°C` : null,
      manifoldPressure !== null ? `  ${i18n.t('report.manifold')}: ${manifoldPressure} kPa` : null,
      voltage ? `  ${i18n.t('report.voltage')}: ${voltage}` : null,
    ].filter(Boolean).join('\n');

    const report = `${i18n.t('report.title')}

${i18n.t('report.vehicleIdentity')}
━━━━━━━━━━━━━━━━━━━━━━
  ${i18n.t('report.vin')}: ${vin || i18n.t('report.vinNotFound')}
  ${i18n.t('report.odometer')}: ${odometer === 'UNSUPPORTED' ? i18n.t('common.unsupported') : odometer !== null ? `${odometer} km` : i18n.t('common.unknown')}
  ${i18n.t('report.milDist')}: ${distanceMilOn !== null ? `${distanceMilOn} km` : '0 km'}
  ${i18n.t('report.distSinceCleared')}: ${distanceSinceCleared !== null ? `${distanceSinceCleared} km` : i18n.t('common.unknown')}

${i18n.t('report.dtcCount', { count: dtcs.length })}
━━━━━━━━━━━━━━━━━━━━━━
${dtcLines}

${i18n.t('report.sensorData')}
━━━━━━━━━━━━━━━━━━━━━━
${sensorLines || `  ${i18n.t('report.noData')}`}

━━━━━━━━━━━━━━━━━━━━━━
*${i18n.t('report.proApp')}*
*${i18n.t('report.date')}: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}*`;

    try {
      await Share.share({ message: report, title: i18n.t('report.title') });
    } catch (e) {
      console.error('Report sharing failed:', e);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'connected') return colors.green;
    if (s === 'connecting') return colors.amber;
    if (s === 'error') return colors.red;
    return colors.textSec;
  };

  const statusLabel = (s: string) => {
    if (s === 'connected') return t('connection.online');
    if (s === 'connecting') return t('connection.connecting');
    if (s === 'error') return t('connection.error');
    return t('connection.offline');
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Connection Screen (not connected to ECU)
  // ═══════════════════════════════════════════════════════════════
  const renderConnectionScreen = () => (
    <ScrollView contentContainerStyle={s.connectPage}>
      {/* Logo */}
      <View style={s.logoArea}>
        <Text style={s.logoText}>MOTOCORTEX</Text>
        <Text style={s.logoSub}>v7 PRO</Text>
      </View>

      {/* Status Badges */}
      <View style={s.badgeRow}>
        <View style={[s.badge, { borderColor: statusColor(adapterStatus) }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor(adapterStatus) }]} />
          <Text style={[s.badgeText, { color: statusColor(adapterStatus) }]}>{t('connection.adapter')}: {statusLabel(adapterStatus)}</Text>
        </View>
        <View style={[s.badge, { borderColor: statusColor(ecuStatus) }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
          <Text style={[s.badgeText, { color: statusColor(ecuStatus) }]}>{t('connection.ecu')}: {statusLabel(ecuStatus)}</Text>
        </View>
      </View>

      {/* Actions */}
      {adapterStatus !== 'connected' ? (
        <View style={s.connectActions}>
          <TouchableOpacity style={s.scanBtn} onPress={handleScan}>
            <Text style={s.scanBtnText}>⟐  {t('connection.scanDevices')}</Text>
          </TouchableOpacity>

          {lastDeviceId && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionCyan, { marginTop: 12, width: '100%', borderRadius: 12 }, isDiagnosticMode && { opacity: 0.5 }]}
              onPress={() => connect(lastDeviceId, lastDeviceName || 'Last Device')}
              disabled={isDiagnosticMode}
            >
              <Text style={[s.actionBtnText, { color: tc.card }]}>↺  {t('connection.connectLast')} ({lastDeviceName})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.btEnableBtn} onPress={enableBluetooth}>
            <Text style={s.btEnableBtnText}>{t('connection.enableBt')}</Text>
          </TouchableOpacity>

          {status === 'scanning' && (
            <View style={s.scanningRow}>
              <ActivityIndicator color={tc.cyan} size="small" />
              <Text style={s.scanningText}>{t('connection.scanning')}</Text>
            </View>
          )}

          {scannedDevices.length > 0 && (
            <View style={s.deviceSection}>
              <Text style={s.deviceSectionTitle}>{t('connection.foundDevices')}</Text>
              {scannedDevices.map(d => (
                <TouchableOpacity key={d.address} style={s.deviceCard} onPress={() => connect(d.address, d.name)}>
                  <View>
                    <Text style={s.deviceName}>{d.name || t('connection.unknownDevice')}</Text>
                    <Text style={s.deviceMac}>{d.address}</Text>
                  </View>
                  <Text style={s.connectLabel}>{t('connection.connectLabel')} ›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {scannedDevices.length === 0 && permissionGranted && status !== 'scanning' && (
            <Text style={s.hintText}>{t('connection.scanHint')}</Text>
          )}
        </View>
      ) : (
        <View style={s.connectActions}>
          {ecuStatus === 'connecting' && (
            <View style={s.ecuConnecting}>
              <ActivityIndicator color={tc.amber} size="small" />
              <Text style={[s.scanningText, { color: tc.amber }]}>{t('connection.ecuWait')}</Text>
            </View>
          )}
          {ecuStatus === 'error' && (
            <View style={s.connectActions}>
              <Text style={s.ecuErrorText}>{t('connection.ecuNoResponse')}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={retryEcu}>
                <Text style={s.retryBtnText}>{t('connection.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={s.disconnectBtn} onPress={disconnect}>
            <Text style={s.disconnectBtnText}>{t('connection.disconnect')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Live Dashboard
  // ═══════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════
  // RENDER: Expertise / Diagnostics Tab
  // ═══════════════════════════════════════════════════════════════
  const renderExpertise = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* VIN History Alert */}
      {vinHistory.length > 0 && (
        <View style={[s.warningBanner, { borderColor: tc.cyan, backgroundColor: `${tc.cyan}14` }]}>
          <Text style={s.warningIcon}>📜</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.warningTitle, { color: tc.cyan }]}>{t('expertise.historyFound')}</Text>
            <Text style={[s.warningBody, { color: tc.textSec }]}>{t('expertise.historyFoundDesc', { count: vinHistory.length })}</Text>
            <TouchableOpacity onPress={() => setIsGarageStatsExpanded(true)} style={{ marginTop: 8 }}>
              <Text style={{ color: tc.cyan, fontWeight: 'bold' }}>{t('expertise.viewHistory')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Manual VIN Input fallback */}
      {!vin && (
        <View style={s.panel}>
          <Text style={s.panelTitle}>{t('expertise.manualVin')}</Text>
          <Text style={s.panelDesc}>{t('expertise.manualVinDesc')}</Text>
          <TextInput
            style={{ backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 8, padding: 12, color: tc.cyan, fontFamily: MONO, marginTop: 10 }}
            value={manualVin}
            onChangeText={setManualVin}
            placeholder={t('expertise.vinPlaceholder')}
            placeholderTextColor={tc.textSec}
          />
        </View>
      )}

      <TouchableOpacity
        style={[s.actionBtn, s.actionPurple, (isDiagnosticMode || isAdaptationRunning) && { opacity: 0.5 }]}
        onPress={() => guardAction(runDiagnostics)}
        disabled={isDiagnosticMode || isAdaptationRunning}
      >
        <Text style={[s.actionBtnText, { color: tc.card }]}>{isDiagnosticMode ? t('expertise.scanning') : `⬡  ${t('expertise.startScan')}`}</Text>
      </TouchableOpacity>

      {/* Vehicle Identity */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>{t('expertise.vehicleIdentity')}</Text>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>{t('expertise.vin')}</Text>
          <Text style={s.tableValue}>{vin || manualVin || '—'}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>{t('expertise.odometer')}</Text>
          <Text style={s.tableValue}>{odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer} km` : '—'}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>{t('expertise.distSinceCleared')}</Text>
          <Text style={s.tableValue}>{distanceSinceCleared !== null ? `${distanceSinceCleared} km` : '—'}</Text>
        </View>
        <View style={[s.tableRow, { borderBottomWidth: 0 }]}>
          <Text style={s.tableLabel}>{t('expertise.milDist')}</Text>
          <Text style={s.tableValue}>{distanceMilOn !== null ? `${distanceMilOn} km` : '—'}</Text>
        </View>
      </View>

      {/* DTCs */}
      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelTitle}>{t('expertise.dtcTitle')}</Text>
          {dtcs.length > 0 && (
            <TouchableOpacity onPress={() => guardAction(clearDiagnostics)} disabled={isDiagnosticMode} style={s.clearBtn}>
              <Text style={s.clearBtnText}>{t('common.clear')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {dtcs.length === 0 ? (
          <View style={s.cleanBadge}>
            <Text style={s.cleanBadgeText}>✓  {t('expertise.dtcClean')}</Text>
          </View>
        ) : (
          dtcs.map((dtc, i) => {
            const desc = lookupDTC(dtc);
            return (
              <View key={i} style={s.dtcRow}>
                <View style={s.dtcDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.dtcCode}>{dtc}</Text>
                  {desc && <Text style={{ color: tc.red, opacity: 0.8, fontSize: 10, fontFamily: MONO, marginTop: 2 }}>{desc}</Text>}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Secondary Actions (Formerly Service) */}
      <View style={{ marginTop: 8 }}>
        <Text style={[s.panelTitle, { marginLeft: 16, marginBottom: 8 }]}>{t('expertise.extraActions')}</Text>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: tc.purple }]}
            onPress={() => guardAction(() => setIsFreezeFrameVisible(true))}
          >
            <Text style={[s.miniActionText, { color: tc.card }]}>❄️ {t('freeze.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: tc.amber }]}
            onPress={() => guardAction(() => setIsBatteryTestVisible(true))}
          >
            <Text style={[s.miniActionText, { color: tc.card }]}>⚡ {t('battery.title')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 }}>
          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: tc.cyan }]}
            onPress={() => guardAction(() => setIsPerformanceVisible(true))}
          >
            <Text style={[s.miniActionText, { color: tc.card }]}>🏁 {t('perf.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: tc.red }]}
            onPress={handleServiceRoutine}
          >
            <Text style={[s.miniActionText, { color: tc.card }]}>🔧 {t('service.ecuReset')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Garage & Past Records - Integrated back to Expertise */}
      <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 30 }}>
        <Text style={[s.panelTitle, { marginLeft: 4, marginBottom: 12 }]}>{t('expertise.garageTitle')}</Text>
        
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={[s.actionBtn, { flex: 1, backgroundColor: tc.green, borderRadius: 12, paddingVertical: 14 }, isDiagnosticMode && { opacity: 0.5 }]}
            onPress={handleShareReport}
            disabled={isDiagnosticMode}
          >
            <Text style={[s.actionBtnText, { fontSize: 11, color: tc.card }]}>📤 {t('expertise.share')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { flex: 1, backgroundColor: tc.cyan, borderRadius: 12, paddingVertical: 14 }]}
            onPress={() => {
              if (vin || manualVin) {
                setIsSaveModalVisible(true);
              } else {
                Alert.alert(t('expertise.vinRequired'), t('expertise.vinRequiredDesc'));
              }
            }}
          >
            <Text style={[s.actionBtnText, { fontSize: 11, color: tc.card }]}>💾 {t('expertise.saveVehicle')}</Text>
          </TouchableOpacity>
        </View>

        {garageRecords.length === 0 && vinHistory.length === 0 ? (
          <View style={[s.panel, { paddingVertical: 24, alignItems: 'center', opacity: 0.7 }]}>
            <Text style={{ color: tc.textSec, fontSize: 11, fontFamily: MONO, fontStyle: 'italic' }}>
              {t('expertise.noRecords')}
            </Text>
          </View>
        ) : (
          (vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[s.panel, { marginBottom: 10, padding: 16, backgroundColor: tc.card }]}
              onPress={() => setSelectedRecord(item)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: tc.textPri, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>
                    {item.make} {item.model}
                  </Text>
                  <Text style={{ color: tc.textSec, fontSize: 11, fontFamily: MONO, marginTop: 4 }}>
                    {item.date}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: item.dtcs.length === 0 ? `${tc.green}1A` : `${tc.red}1A`,
                  borderWidth: 1,
                  borderColor: item.dtcs.length === 0 ? tc.green : tc.red,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}>
                  <Text style={{ color: item.dtcs.length === 0 ? tc.green : tc.red, fontSize: 10, fontWeight: '900', fontFamily: MONO }}>
                    {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

    </ScrollView>
  );


  // ═══════════════════════════════════════════════════════════════
  // RENDER: Service / Adaptation Tab (Sequential Flow)
  // ═══════════════════════════════════════════════════════════════
  const handleServiceRoutine = () => {
    guardAction(() => {
      Alert.alert(
        t('service.safetyWarning'),
        t('service.safetyWarningDesc'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('hub.continueBtn'),
            onPress: () => {
              Alert.alert(
                t('service.step1'),
                t('service.step1Desc'),
                [
                  { text: t('hub.cancelBtn'), style: 'cancel' },
                  {
                    text: t('service.clearCodes'),
                    style: 'destructive',
                    onPress: async () => {
                      await runAdaptationRoutine('fuel');
                      Alert.alert(
                        t('service.step2'),
                        t('service.step2Desc'),
                        [
                          { text: t('hub.skipBtn'), style: 'cancel', onPress: () => Alert.alert(t('service.completed'), t('service.completedDesc')) },
                          {
                            text: t('service.ecuReset'),
                            style: 'destructive',
                            onPress: async () => {
                              await runAdaptationRoutine('ecu');
                              Alert.alert(t('service.completed'), t('service.hardResetDesc'));
                            },
                          },
                        ]
                      );
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    });
  };



  // ═══════════════════════════════════════════════════════════════
  // RENDER: Information Tab
  // ═══════════════════════════════════════════════════════════════
  const toggleInfoAcc = (section: string) => {
    setExpandedInfoSection(expandedInfoSection === section ? null : section);
  };

  const InfoAccordion = ({ id, icon, title, content }: { id: string, icon: string, title: string, content: string | React.ReactNode }) => (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: expandedInfoSection === id ? tc.elevated : tc.card, borderWidth: 1, borderColor: tc.border, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }]}
        onPress={() => toggleInfoAcc(id)}
      >
        <Text style={[s.actionBtnText, { color: expandedInfoSection === id ? tc.cyan : tc.textPri, fontSize: 12 }]}>
          {icon}  {title}
        </Text>
        <Text style={{ color: tc.textSec, fontSize: 12 }}>{expandedInfoSection === id ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedInfoSection === id && (
        <View style={{ backgroundColor: tc.bg, padding: 16, borderWidth: 1, borderTopWidth: 0, borderColor: tc.border, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
          {typeof content === 'string' ? <Text style={[s.panelDesc, { color: tc.textSec }]}>{content}</Text> : content}
        </View>
      )}
    </View>
  );

  const renderInfo = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top Section */}
      <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 10 }}>
        <Text style={[s.logoText, { color: colors.cyan }]}>MOTOCORTEX</Text>
        <Text style={[s.logoSub, { color: colors.cyan }]}>v7 PRO</Text>
        <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: 10, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
          {t('info.desc')}
        </Text>
      </View>

      {/* Garage - View Only in Info Tab */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Text style={[s.panelTitle, { marginLeft: 4, marginBottom: 12 }]}>{t('hub.pastRecords')}</Text>
        
        {garageRecords.length === 0 && vinHistory.length === 0 ? (
          <View style={[s.panel, { paddingVertical: 30, alignItems: 'center' }]}>
            <Text style={{ color: tc.textSec, fontSize: 11, fontFamily: MONO, fontStyle: 'italic' }}>
              {t('expertise.noRecords')}
            </Text>
          </View>
        ) : (
          (vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[s.panel, { marginBottom: 10, padding: 16 }]}
              onPress={() => setSelectedRecord(item)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: tc.textPri, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>
                    {item.make} {item.model}
                  </Text>
                  <Text style={{ color: tc.textSec, fontSize: 11, fontFamily: MONO, marginTop: 4 }}>
                    {item.date} • {item.km} km
                  </Text>
                </View>
                <View style={{
                  backgroundColor: item.dtcs.length === 0 ? `${tc.green}1A` : `${tc.red}1A`,
                  borderWidth: 1,
                  borderColor: item.dtcs.length === 0 ? tc.green : tc.red,
                  borderRadius: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}>
                  <Text style={{
                    color: item.dtcs.length === 0 ? tc.green : tc.red,
                    fontSize: 10,
                    fontWeight: '900',
                    fontFamily: MONO,
                  }}>
                    {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>



      <Text style={[s.panelTitle, { marginLeft: 4, marginBottom: 12 }]}>{t('info.helpGuide')}</Text>

      {/* Middle Section: Accordions */}
      <InfoAccordion
        id="canli"
        icon="📊"
        title={t('info.sections.live.title')}
        content={t('info.sections.live.content')}
      />

      <InfoAccordion
        id="ekspertiz"
        icon="🔍"
        title={t('info.sections.expertise.title')}
        content={t('info.sections.expertise.content')}
      />

      <InfoAccordion
        id="testler"
        icon="⚡"
        title={t('info.sections.tests.title')}
        content={t('info.sections.tests.content')}
      />

      <InfoAccordion
        id="donanim"
        icon="🔌"
        title={t('info.sections.hardware.title')}
        content={t('info.sections.hardware.content')}
      />

      <InfoAccordion
        id="uyarilar"
        icon="⚠️"
        title={t('info.sections.warnings.title')}
        content={t('info.sections.warnings.content')}
      />

      <View style={{ marginTop: 24, paddingVertical: 20, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
        <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: 10 }}>MotoCortex v1.1.0 (16) PRO</Text>
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER (Bento Box / Glassmorphism Paradigm)
  // ═══════════════════════════════════════════════════════════════
  if (!hasOnboarded) {
    return <PermissionGateway />;
  }

  const isLightMode = theme === 'light';

  return (
    <BluetoothBridgeInitializer>
      <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

        <View style={{ flex: 1 }}>
          {/* Top Header Bar */}
          <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={s.topLeft}>
              <Text style={[s.topLogo, { color: colors.cyan }]}>MOTOCORTEX</Text>
            <View style={[s.topBadge, { borderColor: statusColor(ecuStatus) }]}>
              <View style={[s.topBadgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
              <Text style={[s.topBadgeText, { color: statusColor(ecuStatus) }]}>
                {ecuStatus === 'connected' ? t('hub.bleConnected') : t('hub.bleIdle')}
              </Text>
            </View>
          </View>
          <View style={s.topRight}>
            <View style={{ backgroundColor: `${colors.purple}1F`, borderWidth: 1, borderColor: colors.purple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: `${colors.purple}CC`, fontSize: 10, fontWeight: '900', fontFamily: MONO }}>👑 PRO</Text>
            </View>
            {ecuStatus === 'connected' && (
              <TouchableOpacity onPress={() => retryEcu()}>
                <Text style={[s.topDisconnect, { color: colors.red }]}>{t('connection.disconnect').toUpperCase()}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Central Hub View vs Sub-Views */}
        {activeHubView === 'hub' ? (
          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}>
            {/* Center Hero Widget */}
            <LiveEngineHero onConnectPress={() => setIsConnectModalVisible(true)} />

            {/* Title above Bento Grid */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: 12, marginTop: 8, fontFamily: MONO }}>
              {t('hub.controlHub')}
            </Text>

            {/* Bottom Bento Grid */}
            <BentoGrid
              onOpenDiagnostics={() => setActiveHubView('expertise')}
              onOpenSensors={() => setActiveHubView('sensors')}
              onOpenProfile={() => setActiveHubView('info')}
              onOpenSettings={() => setIsSettingsModalVisible(true)}
              onOpenPaywall={() => setIsPaywallVisible(true)}
            />

            {/* Quick Support & Share Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: colors.card, 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  borderRadius: 12, 
                  paddingVertical: 14,
                  gap: 8
                }}
                onPress={() => Linking.openURL('mailto:ismailimamoglu610@gmail.com?subject=MotoCortex Geri Bildirim')}
              >
                <Text style={{ color: colors.cyan, fontSize: 18, fontWeight: '900' }}>⬡</Text>
                <Text style={{ color: colors.textPri, fontSize: 12, fontWeight: '700', fontFamily: MONO }}>{t('info.support')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: colors.card, 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  borderRadius: 12, 
                  paddingVertical: 14,
                  gap: 8
                }}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: t('report.shareMessage'),
                      title: 'MotoCortex'
                    });
                  } catch (e) { console.error(e); }
                }}
              >
                <Text style={{ color: colors.purple, fontSize: 18, fontWeight: '900' }}>✧</Text>
                <Text style={{ color: colors.textPri, fontSize: 12, fontWeight: '700', fontFamily: MONO }}>{t('expertise.share')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Prominent Hub Navigation Header */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}
              onPress={() => setActiveHubView('hub')}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors.cyan, fontSize: 18, fontWeight: '900' }}>←</Text>
              <Text style={{ color: colors.textPri, fontSize: 13, fontWeight: '800', fontFamily: MONO }}>
                {t('hub.backToHub')}
              </Text>
              <Text style={{ color: colors.textSec, fontSize: 11, fontFamily: MONO, marginLeft: 'auto' }}>
                {activeHubView === 'sensors' ? t('hub.liveSensorsView') : activeHubView === 'expertise' ? t('hub.diagnosticsView') : t('hub.vehicleProfileView')}
              </Text>
            </TouchableOpacity>

            {/* Sub-view Content */}
            <View style={{ flex: 1 }}>
              {activeHubView === 'sensors' && <DashboardSpeedometer ecuStatus={ecuStatus} lastDeviceName={lastDeviceName} onConnectPress={() => setIsConnectModalVisible(true)} />}
              {activeHubView === 'expertise' && renderExpertise()}
              {activeHubView === 'info' && renderInfo()}
            </View>
          </View>
        )}

        {/* Connection Modal */}
        <Modal
          visible={isConnectModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsConnectModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: tc.border }}>
              <Text style={{ color: tc.textPri, fontSize: 16, fontWeight: '800', fontFamily: MONO }}>{t('connection.foundDevices')}</Text>
              <TouchableOpacity onPress={() => setIsConnectModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: tc.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              {renderConnectionScreen()}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Save to Garage Modal */}
        <Modal
          visible={isSaveModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsSaveModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.overlayHeavy, justifyContent: 'center', padding: 30 }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 8, padding: 24, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textPri, fontSize: 16, fontWeight: '800', fontFamily: MONO, marginBottom: 16 }}>{t('common.save').toUpperCase()}</Text>
              <TextInput
                style={{ backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPri, fontFamily: MONO, fontSize: 14, marginBottom: 10 }}
                value={saveMake}
                onChangeText={setSaveMake}
                placeholder={t('common.unknown') === 'Bilinmiyor' ? 'Marka (Honda, Yamaha...)' : 'Make (Honda, Yamaha...)'}
                placeholderTextColor={colors.textSec}
                selectionColor={colors.cyan}
              />
              <TextInput
                style={{ backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPri, fontFamily: MONO, fontSize: 14, marginBottom: 16 }}
                value={saveModel}
                onChangeText={setSaveModel}
                placeholder={t('common.unknown') === 'Bilinmiyor' ? 'Model (CBR600, MT07...)' : 'Model (CBR600, MT07...)'}
                placeholderTextColor={colors.textSec}
                selectionColor={colors.cyan}
              />
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.cyan }]}
                onPress={handleSaveToGarage}
              >
                <Text style={[s.actionBtnText, { color: tc.card }]}>{t('common.save').toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.elevated, marginTop: 8, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setIsSaveModalVisible(false)}
              >
                <Text style={[s.actionBtnText, { color: colors.textSec }]}>{t('common.cancel').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Record Detail Modal */}
        <Modal
          visible={selectedRecord !== null}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedRecord(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPri, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{t('common.success')}: {selectedRecord?.make} {selectedRecord?.model}</Text>
              <TouchableOpacity onPress={() => setSelectedRecord(null)} style={{ padding: 10 }}>
                <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            {selectedRecord && (
              <ScrollView style={{ padding: 16 }}>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>{t('expertise.vehicleIdentity')}</Text>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('report.date')}</Text><Text style={s.tableValue}>{selectedRecord.date}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('expertise.manualVin')}</Text><Text style={s.tableValue}>{selectedRecord.make} {selectedRecord.model}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('expertise.vin')}</Text><Text style={s.tableValue}>{selectedRecord.vin}</Text></View>
                  <View style={[s.tableRow, { borderBottomWidth: 0 }]}><Text style={s.tableLabel}>{t('expertise.odometer')}</Text><Text style={s.tableValue}>{selectedRecord.km} km</Text></View>
                </View>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>{t('expertise.dtcTitle')}</Text>
                  {selectedRecord.dtcs.length === 0 ? (
                    <View style={s.cleanBadge}><Text style={s.cleanBadgeText}>✓ {t('expertise.clean')}</Text></View>
                  ) : (
                    selectedRecord.dtcs.map((dtc, i) => {
                      const desc = lookupDTC(dtc);
                      return (
                        <View key={i} style={s.dtcRow}>
                          <View style={s.dtcDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.dtcCode}>{dtc}</Text>
                            {desc && <Text style={{ color: colors.red, opacity: 0.8, fontSize: 10, fontFamily: MONO, marginTop: 2 }}>{desc}</Text>}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionRed, { marginTop: 12 }]}
                  onPress={() => {
                    Alert.alert(t('hub.deleteConfirm'), t('hub.deleteConfirmDesc'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'), style: 'destructive', onPress: async () => {
                          await deleteGarageRecord(selectedRecord.id);
                          setSelectedRecord(null);
                          const allRecords = await getGarageRecords();
                          setGarageRecords(allRecords);
                          const currentVin = vin || manualVin;
                          if (currentVin && currentVin.length > 5) {
                            setVinHistory(await getRecordsByVin(currentVin));
                          }
                        }
                      }
                    ]);
                  }}
                >
                  <Text style={[s.actionBtnText, { color: tc.card }]}>{t('common.delete').toUpperCase()}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* Battery Test Modal */}
        <BatteryTestModalWrapper
          visible={isBatteryTestVisible}
          onClose={() => setIsBatteryTestVisible(false)}
          sendCommand={sendCommand}
        />

        {/* Freeze Frame Modal */}
        <FreezeFrameModal
          visible={isFreezeFrameVisible}
          onClose={() => setIsFreezeFrameVisible(false)}
          sendCommand={sendCommand}
          hasDtcs={dtcs.length > 0}
        />

        {/* Performance Modal */}
        <PerformanceModalWrapper
          visible={isPerformanceVisible}
          onClose={() => setIsPerformanceVisible(false)}
        />

        {/* Quick Settings Modal */}
        <QuickSettingsModal
          visible={isSettingsModalVisible}
          onClose={() => setIsSettingsModalVisible(false)}
        />

        {/* Paywall Modal Overlay */}
        <PaywallModal
          visible={isPaywallVisible}
          onClose={() => setIsPaywallVisible(false)}
        />
      </View>
      </SafeAreaView>
    </BluetoothBridgeInitializer>
  );
}


