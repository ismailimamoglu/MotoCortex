import React, { useState, useEffect, useMemo, useRef } from 'react';
import './global.css';
import { AppState, StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Platform, PermissionsAndroid, ActivityIndicator, Share, Modal, Alert, FlatList, Linking, useWindowDimensions, KeyboardAvoidingView, LogBox } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBluetooth } from './src/hooks/useBluetooth';
import ChronicFaultsWidget from './src/components/ChronicFaultsWidget';
import { BluetoothDevice } from 'react-native-bluetooth-classic';
import { ADAPTER_COMMANDS } from './src/api/commands';
import { lookupDTC, prefetchDtcChunksForCodes } from './src/data/dtcDictionary';
import BatteryTestModal from './src/components/BatteryTestModal';
import FreezeFrameModal from './src/components/FreezeFrameModal';
import PerformanceModal from './src/components/PerformanceModal';
import HardwareHealthModal from './src/components/HardwareHealthModal';
import { useBluetoothStore } from './src/store/useBluetoothStore';
import { saveGarageRecord, getGarageRecords, deleteGarageRecord, getRecordsByVin, GarageRecord } from './src/store/garageStore';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import crashlytics from '@react-native-firebase/crashlytics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PermissionGateway from './src/components/PermissionGateway';
import LiveEngineHero from './src/components/LiveEngineHero';
import BentoGrid from './src/components/BentoGrid';
import QuickSettingsModal from './src/components/QuickSettingsModal';
import SecretDebugModal from './src/components/SecretDebugModal';
import { useAppStore, checkIsProStatus } from './src/store/useAppStore';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import Paywall from './src/components/Paywall';
import { useThemeColors, getTheme } from './src/theme';
import { BluetoothBridgeInitializer } from './src/components/BluetoothBridgeInitializer';
import { useResponsive } from './src/hooks/useResponsive';
import { useTelemetryStore } from './src/store/useTelemetryStore';
import { useTelemetrySync } from './src/services/TelemetrySyncManager';
import VehicleSelectModal from './src/components/VehicleSelectModal';
import SearchableVehicleSelect from './src/components/SearchableVehicleSelect';
import { toSnakeCase, getLocalizedVehicleBrand, getLocalizedVehicleModel } from './src/utils/vehicleStandardizer';
import * as Location from 'expo-location';
import BLEBridge from './src/api/BLEBridge';
import { State } from 'react-native-ble-plx';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Globally suppress internal RevenueCat/StoreKit native errors from rendering 
// as red/black LogBox warning banners at the bottom of the screen.
LogBox.ignoreLogs([
  /RevenueCat/,
  /StoreKit/,
  /SSInternalErrorDomain/,
  /AppTransaction Failed/
]);

const DashboardSpeedometer = React.memo(({ ecuStatus, lastDeviceName, onConnectPress, onGoToExpertise, onOpenHardwareHealth }: {
  ecuStatus: string;
  lastDeviceName: string | null;
  onConnectPress: () => void;
  onGoToExpertise: () => void;
  onOpenHardwareHealth: () => void;
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isPhone, isTablet, isLargeTablet, isPortrait, height } = useResponsive();

  const isSmallPhone = height < 820;

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

  const renderConnectionCard = () => (
    <TouchableOpacity
      style={{
        backgroundColor: ecuStatus === 'connected' ? `${tc.green}14` : tc.card,
        borderWidth: 1.5,
        borderColor: ecuStatus === 'connected' ? tc.green : tc.cyan,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        marginBottom: isTablet ? 0 : scaleHeight(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
      onPress={onConnectPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(10) }}>
        <View style={{ width: scaleMod(8), height: scaleMod(8), borderRadius: scaleMod(4), backgroundColor: statusColor(ecuStatus) }} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: tc.textPri, fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO }}>
            {ecuStatus === 'connected' ? t('dashboard.connectedDevice') : t('dashboard.selectDevice')}
          </Text>
          <Text numberOfLines={1} style={{ color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: scaleHeight(2) }}>
            {ecuStatus === 'connected' && lastDeviceName ? lastDeviceName : t('dashboard.noConnection')}
          </Text>
        </View>
      </View>
      <Text style={{ color: ecuStatus === 'connected' ? tc.green : tc.cyan, fontSize: scaleFont(16), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderBatteryWarning = () => {
    if (isBatteryLow) {
      return (
        <View style={{ flexDirection: 'row', backgroundColor: `${tc.red}1A`, borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), padding: scaleMod(10), marginBottom: scaleHeight(10), gap: scaleMod(8), alignItems: 'flex-start', flexShrink: 0 }}>
          <Text style={{ color: tc.red, fontSize: scaleFont(16) }}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tc.red, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) }}>{t('dashboard.batteryLow')}</Text>
            <Text style={{ color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(14) }}>{t('dashboard.batteryLowDesc', { voltage })}</Text>
          </View>
        </View>
      );
    }
    if (isBatteryWarn) {
      return (
        <View style={{ flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: scaleMod(6), padding: scaleMod(10), marginBottom: scaleHeight(10), gap: scaleMod(8), alignItems: 'flex-start', flexShrink: 0 }}>
          <Text style={{ color: tc.amber, fontSize: scaleFont(16) }}>⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tc.amber, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) }}>{t('dashboard.batteryWarn')}</Text>
            <Text style={{ color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(14) }}>{t('dashboard.batteryWarnDesc', { voltage })}</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderRpmHero = (flexVal?: number) => (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center',
      paddingVertical: isTablet ? scaleHeight(16) : scaleHeight(10), 
      backgroundColor: tc.card, 
      borderRadius: scaleMod(6), 
      borderWidth: 1.2, 
      borderColor: tc.border, 
      marginBottom: isTablet ? 0 : scaleHeight(8),
      flex: flexVal || undefined,
    }}>
      <Text style={{ fontSize: isTablet ? scaleFont(54) : scaleFont(44), fontWeight: '900', color: tc.textPri, fontFamily: MONO, lineHeight: isTablet ? scaleFont(60) : scaleFont(48) }}>
        {rpm !== null ? rpm : '----'}
      </Text>
      <Text style={{ fontSize: isTablet ? scaleFont(12) : scaleFont(10.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: -scaleHeight(2) }}>RPM</Text>
    </View>
  );

  const renderSensorGrid = (flexVal?: number) => {
    const cardPad = isTablet ? scaleHeight(14) : scaleHeight(9);
    const valueSize = isTablet ? scaleFont(22) : scaleFont(18);
    const labelSize = isTablet ? scaleFont(9.5) : scaleFont(8.5);
    const itemGap = isTablet ? scaleMod(8) : scaleMod(6);
    const cardWidth = isTablet ? '23.8%' : '48.5%';

    return (
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between',
        rowGap: itemGap,
        marginBottom: isTablet ? 0 : scaleHeight(10),
        flex: flexVal,
      }}>
        {/* Sensor 1: Speed */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{speed !== null ? speed : '--'}</Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.speed')}</Text>
        </View>

        {/* Sensor 2: Throttle */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{throttle !== null ? `${throttle}%` : '--'}</Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.throttle')}</Text>
        </View>

        {/* Sensor 3: Coolant Temp */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={[{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, coolant !== null && coolant > 100 ? { color: tc.red } : {}]}>
            {coolant !== null ? `${coolant}°` : '--'}
          </Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.temp')}</Text>
        </View>

        {/* Sensor 4: Devir Durumu */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={[{ fontSize: scaleFont(14), fontWeight: '900', color: tc.textPri, fontFamily: MONO }, rpm !== null && (rpm > 7000 ? { color: tc.red } : rpm > 3000 ? { color: tc.green } : { color: tc.amber })]}>
            {rpm !== null ? (rpm > 7000 ? t('dashboard.statusHigh') : rpm > 3000 ? t('dashboard.statusNormal') : t('dashboard.statusLow')) : '--'}
          </Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.status')}</Text>
        </View>

        {/* Sensor 5: Battery Voltage */}
        <View style={[{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }, { borderColor: isBatteryLow ? tc.red : isBatteryWarn ? tc.amber : tc.border }]}>
          <Text style={[{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, { color: isBatteryLow ? tc.red : isBatteryWarn ? tc.amber : tc.green }]}>
            {voltage || '--'}
          </Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.battery')}</Text>
        </View>

        {/* Sensor 6: Engine Load */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{engineLoad !== null ? `${engineLoad}%` : '--'}</Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.load')}</Text>
        </View>

        {/* Sensor 7: Intake Temp */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={[{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }, intakeAirTemp !== null && intakeAirTemp > 60 ? { color: tc.amber } : {}]}>
            {intakeAirTemp !== null ? `${intakeAirTemp}°` : '--'}
          </Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.intake')}</Text>
        </View>

        {/* Sensor 8: Manifold Pressure */}
        <View style={{ width: cardWidth, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: cardPad, alignItems: 'center' }}>
          <Text style={{ fontSize: valueSize, fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>{manifoldPressure !== null ? manifoldPressure : '--'}</Text>
          <Text style={{ fontSize: labelSize, fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.2 }}>{t('dashboard.manifold')}</Text>
        </View>
      </View>
    );
  };

  const renderGoToExpertiseButton = () => (
    <TouchableOpacity
      style={{ 
        backgroundColor: tc.purple, 
        borderRadius: scaleMod(12), 
        padding: isTablet ? scaleMod(12) : scaleMod(9), 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: isTablet ? scaleMod(10) : scaleMod(6),
        borderWidth: 1,
        borderColor: `${tc.purple}4D`,
        flexShrink: 0,
      }}
      onPress={onGoToExpertise}
    >
      <Text numberOfLines={1} style={{ color: '#FFF', fontSize: isTablet ? scaleFont(12.5) : scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}>{t('hub.goToExpertise').toUpperCase()}</Text>
      <Text style={{ color: '#FFF', fontSize: isTablet ? scaleFont(16) : scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderHardwareHealthButton = () => (
    <TouchableOpacity
      style={{ 
        backgroundColor: tc.card, 
        borderRadius: scaleMod(12), 
        padding: isTablet ? scaleMod(12) : scaleMod(9), 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: isTablet ? scaleMod(10) : scaleMod(6),
        borderWidth: 1.5,
        borderColor: tc.cyan,
        flexShrink: 0,
      }}
      onPress={onOpenHardwareHealth}
    >
      <Text numberOfLines={1} style={{ color: tc.cyan, fontSize: isTablet ? scaleFont(12.5) : scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}>
        🛡️ {(isTablet ? t('bento.settings.hardwareHealth', 'DONANIM SAĞLIK BİLGİSİ') : t('bento.settings.hardwareHealthShort', 'DONANIM SAĞLIĞI')).toUpperCase()}
      </Text>
      <Text style={{ color: tc.cyan, fontSize: isTablet ? scaleFont(16) : scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  const isLandscape = !isPortrait;

  if (isTablet) {
    return (
      <View style={{ 
        flex: 1, 
        padding: scaleMod(16), 
        backgroundColor: tc.bg, 
        alignSelf: 'center', 
        width: '100%', 
        maxWidth: 800 
      }}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          bounces={false}
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: 'flex-start',
            gap: scaleHeight(24),
            paddingBottom: scaleHeight(40)
          }}
        >
          {/* Top Row: Left Column (Connection Info + Warnings), Right Column (RPM Hero) */}
          <View style={{ flexDirection: 'row', gap: scaleMod(16), alignItems: 'stretch' }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {renderConnectionCard()}
              {renderBatteryWarning()}
            </View>
            <View style={{ flex: 1 }}>
              {renderRpmHero(1)}
            </View>
          </View>

          {/* Middle Row: 4x2 Sensor Grid */}
          <View style={{ flex: 1 }}>
            {renderSensorGrid()}
            <ChronicFaultsWidget />
          </View>

          {/* Bottom Row: Action/Navigation buttons side-by-side */}
          <View style={{ flexDirection: 'row', gap: scaleMod(16) }}>
            <View style={{ flex: 1 }}>
              {renderGoToExpertiseButton()}
            </View>
            <View style={{ flex: 1 }}>
              {renderHardwareHealthButton()}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 2-Column Responsive Layout for Phone in Landscape mode (stops layout stretching and prevents overflow)
  if (isPhone && isLandscape) {
    return (
      <View style={{ 
        flex: 1, 
        padding: scaleMod(12), 
        backgroundColor: tc.bg, 
        alignSelf: isLargeTablet ? 'center' : undefined, 
        width: isLargeTablet ? scaleWidth(900) : '100%', 
        maxWidth: isLargeTablet ? 900 : undefined 
      }}>
        <View style={{ flexDirection: 'row', gap: scaleMod(12), flex: 1 }}>
          {/* Left Column */}
          <View style={{ flex: 1, gap: scaleMod(10), justifyContent: 'space-between' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: scaleMod(10) }} style={{ flex: 1 }} bounces={false}>
              {renderConnectionCard()}
              {renderBatteryWarning()}
              {renderRpmHero(1)}
            </ScrollView>
            <View style={{ gap: scaleHeight(6) }}>
              {renderGoToExpertiseButton()}
              {renderHardwareHealthButton()}
            </View>
          </View>

          {/* Right Column */}
          <ScrollView style={{ flex: 1.2 }} showsVerticalScrollIndicator={false} bounces={false}>
            {renderSensorGrid(1)}
            <ChronicFaultsWidget />
          </ScrollView>
        </View>
      </View>
    );
  }

  // Phone Layout (Portrait): Single column with ScrollView wrapper to prevent text/layout clip
  return (
    <View style={{ flex: 1, padding: scaleMod(12), backgroundColor: tc.bg }}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: scaleHeight(80) }}
        bounces={true}
      >
        <View>
          {renderConnectionCard()}
          {renderBatteryWarning()}
          {renderRpmHero()}
          {renderSensorGrid()}
          <ChronicFaultsWidget />
        </View>
        <View style={{ flexDirection: 'column', gap: scaleMod(12), marginTop: scaleHeight(12) }}>
          {renderGoToExpertiseButton()}
          {renderHardwareHealthButton()}
        </View>
      </ScrollView>
    </View>
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

function MainApp() {
  const { t, i18n } = useTranslation();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isPhone, isTablet, isLargeTablet, isPortrait, height, width } = useResponsive();
  const isSmallPhone = height < 820;

  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const clearActiveSessionVehicle = useTelemetryStore((state) => state.clearActiveSessionVehicle);
  const fetchChronicFaults = useTelemetryStore((state) => state.fetchChronicFaults);

  // Start background sync manager
  useTelemetrySync();

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

  // Reset active vehicle details on disconnect
  useEffect(() => {
    if (ecuStatus !== 'connected') {
      clearActiveSessionVehicle();
    }
  }, [ecuStatus]);

  // Fetch chronic faults on connection/brand changes
  useEffect(() => {
    if (ecuStatus === 'connected' && activeSessionVehicle?.brand) {
      fetchChronicFaults(activeSessionVehicle.brand);
    }
  }, [ecuStatus, activeSessionVehicle?.brand]);

  // Initialize the persistent Device UUID
  useEffect(() => {
    initializeDeviceUuid();
    try {
      crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('[App] Firebase Crashlytics collection enabled programmatically.');
    } catch (e) {
      console.warn('[App] Failed to enable Crashlytics collection:', e);
    }
  }, []);

  const [vinHistory, setVinHistory] = useState<GarageRecord[]>([]);
  const [manualVin, setManualVin] = useState('');

  const [hasShownCloneWarning, setHasShownCloneWarning] = useState(false);

  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);
  const isPro = useAppStore((state) => state.isPro);
  const theme = useAppStore((state) => state.theme);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);
  const toggleSimulationMode = useAppStore((state) => state.toggleSimulationMode);
  const freeUsageCount = useAppStore((state) => state.freeUsageCount);
  const initializeDeviceUuid = useAppStore((state) => state.initializeDeviceUuid);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    
    if (tapCountRef.current >= 5) {
      setIsSecretDebugVisible(true);
      tapCountRef.current = 0;
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 600);
    }
  };

  const [versionTapCount, setVersionTapCount] = useState(0);
  const handleVersionTap = () => {
    if (!__DEV__) return;

    const nextCount = versionTapCount + 1;
    if (nextCount >= 3) {
      const nextPro = !isPro;
      useAppStore.getState().setIsPro(nextPro);
      setVersionTapCount(0);
      Alert.alert("Dev Mode", `Pro Status: ${nextPro ? 'ACTIVE' : 'INACTIVE'}`);
    } else {
      setVersionTapCount(nextCount);
      setTimeout(() => setVersionTapCount(0), 1000);
    }
  };

  const colors = useThemeColors();
  const tc = colors;

  const s = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tc.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    // ── Connection Screen ──
    connectPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: scaleMod(20) },
    logoArea: { alignItems: 'center', marginBottom: scaleHeight(24) },
    logoText: { fontSize: scaleFont(32), fontWeight: '900', color: tc.cyan, fontFamily: MONO, letterSpacing: 4 },
    logoSub: { fontSize: scaleFont(12), color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 6 },

    badgeRow: { flexDirection: 'row', gap: scaleMod(10), marginBottom: scaleHeight(24) },
    badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(5), gap: scaleMod(6) },
    badgeDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3) },
    badgeText: { fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    connectActions: { width: '100%', alignItems: 'center', gap: scaleMod(10) },
    scanBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: tc.cyan, borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), paddingHorizontal: scaleWidth(32), width: '100%', alignItems: 'center' },
    scanBtnText: { color: tc.cyan, fontWeight: '900', fontSize: scaleFont(14), fontFamily: MONO, letterSpacing: 2 },
    btEnableBtn: { backgroundColor: tc.elevated, borderRadius: scaleMod(6), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center', borderWidth: 1, borderColor: tc.border },
    btEnableBtnText: { color: tc.textSec, fontWeight: '700', fontSize: scaleFont(11), fontFamily: MONO },

    scanningRow: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(6), marginTop: scaleHeight(8) },
    scanningText: { color: tc.cyan, fontSize: scaleFont(11), fontFamily: MONO },

    deviceSection: { width: '100%', marginTop: scaleHeight(16) },
    deviceSectionTitle: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO, marginBottom: scaleHeight(8), letterSpacing: 2 },
    deviceCard: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(8), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deviceName: { color: tc.textPri, fontSize: scaleFont(13), fontWeight: '700', fontFamily: MONO },
    deviceMac: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: scaleHeight(2) },
    connectLabel: { color: tc.cyan, fontSize: scaleFont(11), fontWeight: '800', fontFamily: MONO },
    hintText: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: scaleHeight(16), textAlign: 'center' },

    ecuConnecting: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(6), marginBottom: scaleHeight(8) },
    ecuErrorText: { color: tc.red, fontSize: scaleFont(11), fontFamily: MONO, textAlign: 'center', marginBottom: scaleHeight(8) },
    retryBtn: { backgroundColor: tc.amber, borderRadius: scaleMod(6), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center', marginBottom: scaleHeight(8) },
    retryBtnText: { color: tc.card, fontWeight: '900', fontSize: scaleFont(12.5), fontFamily: MONO },
    disconnectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingVertical: scaleHeight(8), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center' },
    disconnectBtnText: { color: tc.red, fontWeight: '700', fontSize: scaleFont(11.5), fontFamily: MONO },

    // ── Top Bar ──
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scaleWidth(14), paddingVertical: scaleHeight(8), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    topLeft: { flexDirection: 'row', alignItems: 'baseline', gap: scaleMod(6) },
    topLogo: { color: tc.cyan, fontSize: scaleFont(14.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 2 },
    topVersion: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(10) },
    topBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(3), gap: scaleMod(4) },
    topBadgeDot: { width: scaleMod(5), height: scaleMod(5), borderRadius: scaleMod(2.5) },
    topBadgeText: { fontSize: scaleFont(8.5), fontWeight: '900', fontFamily: MONO },
    topDisconnect: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Tab Bar ──
    tabBar: { flexDirection: 'row', backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    tabItem: { flex: 1, paddingVertical: scaleHeight(10), alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: tc.cyan },
    tabLabel: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
    tabLabelActive: { color: tc.cyan },

    // ── Tab Content ──
    tabContent: { flex: 1, paddingHorizontal: 0, paddingTop: scaleHeight(12) },
    tabContentInner: { paddingHorizontal: scaleWidth(14) },

    // ── Dashboard: RPM ──
    rpmHero: { alignItems: 'center', paddingVertical: scaleHeight(20), backgroundColor: tc.card, borderRadius: scaleMod(6), borderWidth: 1.2, borderColor: tc.border, marginBottom: scaleHeight(12) },
    rpmNumber: { fontSize: scaleFont(64), fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    rpmUnit: { fontSize: scaleFont(12.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: -scaleHeight(2) },

    // ── Dashboard: Sensor Grid ──
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleMod(8), marginBottom: scaleHeight(12) },
    sensorCard: { width: '48.5%', backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: scaleHeight(16), alignItems: 'center' },
    sensorValue: { fontSize: scaleFont(24), fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    sensorLabel: { fontSize: scaleFont(9.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.5 },

    // ── Quick Command Bar ──
    quickBar: { marginBottom: scaleHeight(12) },
    cmdRow: { flexDirection: 'row', gap: scaleMod(8), marginBottom: scaleHeight(6) },
    cmdInput: { flex: 1, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(8), color: tc.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) },
    cmdSend: { backgroundColor: tc.cyan, borderRadius: scaleMod(6), width: scaleMod(38), alignItems: 'center', justifyContent: 'center' },
    cmdSendText: { color: tc.card, fontSize: scaleFont(18), fontWeight: '900' },
    chipRow: { flexDirection: 'row', gap: scaleMod(6), flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: tc.cyan, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(5) },
    chipText: { color: tc.cyan, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Terminal ──
    terminalBox: { backgroundColor: tc.bg, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), overflow: 'hidden' },
    terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(6), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    terminalTitle: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },
    terminalClear: { color: tc.cyan, fontSize: scaleFont(9.5), fontWeight: '700', fontFamily: MONO },
    terminalScroll: { maxHeight: scaleHeight(140), padding: scaleMod(8) },
    terminalLine: { color: tc.green, fontSize: scaleFont(9.5), fontFamily: MONO, lineHeight: scaleFont(14) },

    // ── Panels (Expertise/Service) ──
    panel: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(10) },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { color: tc.textSec, fontSize: scaleFont(10), fontWeight: '900', fontFamily: MONO, letterSpacing: 1, marginBottom: scaleHeight(10) },
    panelDesc: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(16), marginBottom: scaleHeight(12) },

    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scaleHeight(8), borderBottomWidth: 1, borderBottomColor: tc.border },
    tableLabel: { color: tc.textSec, fontSize: scaleFont(11), fontFamily: MONO },
    tableValue: { color: tc.textPri, fontSize: scaleFont(11), fontWeight: '700', fontFamily: MONO, flex: 1, textAlign: 'right' },

    // ── Action Buttons ──
    actionBtn: { borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), alignItems: 'center' },
    actionBtnText: { fontWeight: '900', fontSize: scaleFont(12), fontFamily: MONO, letterSpacing: 1 },
    actionPurple: { backgroundColor: tc.purple },
    actionCyan: { backgroundColor: tc.cyan },
    actionRed: { backgroundColor: tc.red },

    // ── Brand Selector ──
    brandScroll: { marginHorizontal: -scaleWidth(14), paddingHorizontal: scaleWidth(14) },
    brandScrollContent: { paddingRight: scaleWidth(28), gap: scaleMod(8) },
    brandChip: { backgroundColor: tc.elevated, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(16), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(6) },
    brandChipActive: { backgroundColor: `${tc.cyan}1A`, borderColor: tc.cyan },
    brandChipText: { color: tc.textSec, fontSize: scaleFont(10), fontWeight: '700', fontFamily: MONO },
    brandChipTextActive: { color: tc.cyan, fontWeight: '900' },

    // ── DTC Items ──
    cleanBadge: { backgroundColor: `${tc.green}14`, borderWidth: 1, borderColor: tc.green, borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), alignItems: 'center' },
    cleanBadgeText: { color: tc.green, fontWeight: '800', fontSize: scaleFont(11.5), fontFamily: MONO },
    dtcRow: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(8), backgroundColor: `${tc.red}14`, borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(10), marginBottom: scaleHeight(5) },
    dtcDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3), backgroundColor: tc.red },
    dtcCode: { color: tc.red, fontWeight: '800', fontSize: scaleFont(13), fontFamily: MONO },

    clearBtn: { backgroundColor: `${tc.red}26`, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(3) },
    clearBtnText: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Warning Banner ──
    warningBanner: { flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(12), gap: scaleMod(8), alignItems: 'flex-start' },
    warningIcon: { color: tc.amber, fontSize: scaleFont(18) },
    warningTitle: { color: tc.amber, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) },
    warningBody: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(15) },

    // ── New Styles ──
    miniAction: { flex: 1, borderRadius: scaleMod(10), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(4), alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    miniActionText: { fontWeight: '800', fontSize: scaleFont(10.5), fontFamily: MONO },
    saveOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      padding: scaleMod(24),
      zIndex: 99999,
      elevation: 99999,
    },
    saveKeyboardContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    saveContainer: {
      borderRadius: scaleMod(16),
      borderWidth: 1.5,
      padding: scaleMod(20),
      maxHeight: '90%',
    },
  }), [tc, scaleWidth, scaleHeight, scaleMod, scaleFont]);

  const verifyEntitlement = useAppStore((state) => state.verifyEntitlement);
  const fetchAppUserId = useAppStore((state) => state.fetchAppUserId);
  const [activeHubView, setActiveHubView] = useState<'hub' | 'sensors' | 'expertise' | 'info'>('hub');
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isHardwareHealthVisible, setIsHardwareHealthVisible] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isSecretDebugVisible, setIsSecretDebugVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expertise' | 'info'>('dashboard'); // Kept for legacy fallback views compatibility
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);

  // RevenueCat SDK Setup & Secure Offline Receipt Verification
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        const apiKey = Platform.OS === 'ios' 
          ? process.env.EXPO_PUBLIC_RC_IOS_KEY 
          : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
        
        if (apiKey) {
          // Suppress RevenueCat SDK internal logs — set to ERROR so that
          // "[RevenueCat] There was a problem..." banners never appear on screen
          // in any environment (simulator, TestFlight, or production).
          // Developers can still see critical errors in Xcode console.
          Purchases.setLogLevel(LOG_LEVEL.ERROR);

          await Purchases.configure({ apiKey });
          await verifyEntitlement();
          await fetchAppUserId();
        } else if (__DEV__) {
          console.warn("[RevenueCat] API Key missing in environment variables. Running in limited mode.");
        }
      } catch (e) {
        // Intentionally not surfacing payment infrastructure errors to the
        // user — SDK handles retries internally.
        if (__DEV__) {
          console.warn("[RevenueCat] SDK init error:", e);
        }
      }
    };
    initializeRevenueCat();
  }, []);

  // RevenueCat CustomerInfo Listener for Entitlement Revocation Security
  useEffect(() => {
    const listener = (customerInfo: any) => {
      try {
        const isProActive = checkIsProStatus(customerInfo);
        const { isAtomicOperationRunning, triggerPendingRevocation, flushPendingRevocation } = useBluetoothStore.getState();

        if (!isProActive) {
          if (isAtomicOperationRunning) {
            // Defer revocation since critical diagnostic/telemetry loop is running
            triggerPendingRevocation();
          } else {
            // Lock immediately
            useAppStore.getState().setIsPro(false);
            flushPendingRevocation();

            Alert.alert(
              t('common.revocationTitle', 'Abonelik Sonlandırıldı'),
              t('common.revocationMsg', 'Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır.')
            );
          }
        } else {
          // Ensure status is Pro
          useAppStore.getState().setIsPro(true);
          // Clear pending revocation if subscription active
          flushPendingRevocation();
        }
      } catch (err) {
        // Silently mask listener callback exceptions
        console.error('[RevenueCat Background Error Masked]:', err);
      }
    };

    try {
      Purchases.addCustomerInfoUpdateListener(listener);
    } catch (e) {
      console.error('[RevenueCat Listener] Failed to register customer info listener:', e);
    }

    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch (e) {
        console.error('[RevenueCat Listener] Failed to remove customer info listener:', e);
      }
    };
  }, []);

  // AppState Listener to handle foreground recovery check (AppState background blindness fix)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      try {
        if (nextAppState === 'active') {
          const { pendingProRevocation, flushPendingRevocation } = useBluetoothStore.getState();
          if (pendingProRevocation) {
            useAppStore.getState().setIsPro(false);
            flushPendingRevocation();

            Alert.alert(
              t('common.revocationTitle', 'Abonelik Sonlandırıldı'),
              t('common.revocationMsg', 'Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır.')
            );
          }
        }
      } catch (error) {
        console.error('[AppState Listener Error Masked]:', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Reactive view transition & atomic operation completion check for deferred revocations
  const isAtomicOperationRunning = useBluetoothStore((s) => s.isAtomicOperationRunning);
  const pendingProRevocation = useBluetoothStore((s) => s.pendingProRevocation);

  useEffect(() => {
    try {
      const shouldFlush = 
        (pendingProRevocation && !isAtomicOperationRunning) ||
        (pendingProRevocation && (activeHubView === 'hub' || activeHubView === 'info'));

      if (shouldFlush) {
        useAppStore.getState().setIsPro(false);
        useBluetoothStore.getState().flushPendingRevocation();

        Alert.alert(
          t('common.revocationTitle', 'Abonelik Sonlandırıldı'),
          t('common.revocationMsg', 'Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır.')
        );
      }
    } catch (error) {
      console.error('[Revocation Checker Error Masked]:', error);
    }
  }, [isAtomicOperationRunning, activeHubView, pendingProRevocation]);

  // Garage states
  const [garageRecords, setGarageRecords] = useState<GarageRecord[]>([]);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GarageRecord | null>(null);



  const handleSelectRecord = (record: GarageRecord | null) => {
    if (record && record.dtcs) {
      prefetchDtcChunksForCodes(record.dtcs);
    }
    setSelectedRecord(record);
  };

  const [isGarageStatsExpanded, setIsGarageStatsExpanded] = useState(false);
  const [expandedInfoSection, setExpandedInfoSection] = useState<string | null>(null);

  const [infoBtStatus, setInfoBtStatus] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [infoLocStatus, setInfoLocStatus] = useState<'granted' | 'denied' | 'checking'>('checking');

  const checkInfoPermissions = async () => {
    try {
      let locGranted = false;
      try {
        const locRes = await Location.getForegroundPermissionsAsync();
        locGranted = locRes.status === 'granted';
      } catch (err) {
        console.warn('Error checking location permission:', err);
      }
      setInfoLocStatus(locGranted ? 'granted' : 'denied');

      let btGranted = false;
      if (Platform.OS === 'android') {
        const scan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const connect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        btGranted = scan && connect;
      } else {
        try {
          const bleState = await BLEBridge.getHardwareState();
          btGranted = bleState === State.PoweredOn || bleState === State.PoweredOff;
        } catch (err) {
          console.warn('Error checking iOS Bluetooth state:', err);
        }
      }
      setInfoBtStatus(btGranted ? 'granted' : 'denied');
    } catch (e) {
      console.warn('Error in checkInfoPermissions:', e);
    }
  };

  useEffect(() => {
    if (activeHubView === 'info' && expandedInfoSection === 'onboarding') {
      checkInfoPermissions();
    }
  }, [activeHubView, expandedInfoSection]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && activeHubView === 'info' && expandedInfoSection === 'onboarding') {
        checkInfoPermissions();
      }
    });
    return () => sub.remove();
  }, [activeHubView, expandedInfoSection]);

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

  const handleSaveToGarage = async (brandId: string, modelId: string, year: number) => {
    // === SIMULATION GUARD: Never persist simulator sessions to garage ===
    if (isSimulationMode) {
      setIsSaveModalVisible(false);
      Alert.alert(
        t('common.simMode', 'Simülatör Modu'),
        t('expertise.simSaveBlocked', 'Simülatör oturumları garaja kaydedilemez. Gerçek bir araç bağlayın.')
      );
      return;
    }

    await saveGarageRecord({
      make: brandId,
      model: `${modelId} (${year})`,
      vin: vin || manualVin || t('common.unknown'),
      km: odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer}` : t('common.unknown'),
      dtcs: dtcs,
    });

    setIsSaveModalVisible(false);
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

  const proGuardAction = (action: () => void) => {
    // Eğer kullanıcı PRO değilse VE Simülasyon modunda değilse paywall'u aç!
    if (!isPro && !isSimulationMode) {
      setIsPaywallVisible(true);
      return;
    }
    guardAction(action);
  };

  const hasFreeUsage = () => {
    return isPro || isSimulationMode || (useAppStore.getState().freeUsageCount < 3);
  };

  const handleRealConnect = (id: string, name: string) => {
    if (!isPro && !isSimulationMode) {
      const currentCount = useAppStore.getState().freeUsageCount;
      if (currentCount >= 3) {
        setIsConnectModalVisible(false);
        setIsPaywallVisible(true);
        return;
      }
      useAppStore.getState().incrementFreeUsage();
    }
    connect(id, name);
  };

  const navigateToSensors = () => {
    if (!isPro && !isSimulationMode) {
      const currentCount = useAppStore.getState().freeUsageCount;
      if (currentCount >= 3) {
        setIsPaywallVisible(true);
        return;
      }
      useAppStore.getState().incrementFreeUsage();
    }
    setActiveHubView('sensors');
  };

  const handleDiagnosticsScan = () => {
    if (!isPro && !isSimulationMode) {
      const currentCount = useAppStore.getState().freeUsageCount;
      if (currentCount >= 3) {
        setIsPaywallVisible(true);
        return;
      }
      useAppStore.getState().incrementFreeUsage();
    }
    guardAction(runDiagnostics);
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

    const activeLang = i18n.language || 'en';
    const report = `${i18n.t('report.title')}

${i18n.t('report.vehicleIdentity')}
--------------------━━
  ${i18n.t('report.vin')}: ${vin || i18n.t('report.vinNotFound')}
  ${i18n.t('report.odometer')}: ${odometer === 'UNSUPPORTED' ? i18n.t('common.unsupported') : odometer !== null ? `${odometer} km` : i18n.t('common.unknown')}
  ${i18n.t('report.milDist')}: ${distanceMilOn !== null ? `${distanceMilOn} km` : '0 km'}
  ${i18n.t('report.distSinceCleared')}: ${distanceSinceCleared !== null ? `${distanceSinceCleared} km` : i18n.t('common.unknown')}

${i18n.t('report.dtcCount', { count: dtcs.length })}
--------------------━━
${dtcLines}

${i18n.t('report.sensorData')}
--------------------━━
${sensorLines || `  ${i18n.t('report.noData')}`}

--------------------━━
*${i18n.t('report.proApp')}*
*${i18n.t('report.date')}: ${new Date().toLocaleDateString(activeLang)} ${new Date().toLocaleTimeString(activeLang, { hour: '2-digit', minute: '2-digit' })}*`;

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

  // ============================================================═══
  // RENDER: Connection Screen (not connected to ECU)
  // ============================================================═══
  const renderConnectionScreen = () => (
    <ScrollView contentContainerStyle={s.connectPage}>
      {/* Logo */}
      <TouchableOpacity style={s.logoArea} activeOpacity={0.8} onPress={handleLogoTap}>
        <Text style={s.logoText}>MOTOCORTEX</Text>
        <Text style={s.logoSub}>v7 PRO {isSimulationMode ? '(SIM)' : ''}</Text>
      </TouchableOpacity>

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
            <Text style={s.scanBtnText}>*  {t('connection.scanDevices')}</Text>
          </TouchableOpacity>

          {lastDeviceId && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionCyan, { marginTop: 12, width: '100%', borderRadius: 12 }, isDiagnosticMode && { opacity: 0.5 }]}
              onPress={() => handleRealConnect(lastDeviceId, lastDeviceName || 'Last Device')}
              disabled={isDiagnosticMode}
            >
              <Text style={[s.actionBtnText, { color: tc.card }]}>↺  {t('connection.connectLast')} ({lastDeviceName})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.btEnableBtn} onPress={() => {
            if (Platform.OS === 'ios') {
              Alert.alert(t('common.warning', 'Warning'), t('connection.iosBtManual'));
            } else {
              enableBluetooth();
            }
          }}>
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
                <TouchableOpacity key={d.address || d.id} style={s.deviceCard} onPress={() => handleRealConnect(d.address || d.id, d.name)}>
                  <View>
                    <Text style={s.deviceName}>{d.name || t('connection.unknownDevice')}</Text>
                    <Text style={s.deviceMac}>{d.address}</Text>
                  </View>
                  <Text style={s.connectLabel}>{t('connection.connectLabel')} {'>'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {scannedDevices.length === 0 && permissionGranted && status !== 'scanning' && (
            <>
              <Text style={s.hintText}>{t('connection.scanHint')}</Text>
              {Platform.OS === 'ios' ? (
                <Text style={[s.hintText, { marginTop: 10, color: tc.amber, fontSize: 10, opacity: 0.8 }]}>
                  {t('connection.iosBleOnly')}
                </Text>
              ) : (
                <Text style={[s.hintText, { marginTop: 10, color: tc.amber, fontSize: 10, opacity: 0.8 }]}>
                  {t('connection.androidClassicHint')}
                </Text>
              )}
            </>
          )}

          {/* Demo Mode Action Card */}
          <TouchableOpacity 
            style={{ 
              marginTop: 24,
              backgroundColor: isSimulationMode ? `${tc.green}14` : `${tc.cyan}14`,
              borderRadius: 20,
              borderWidth: 2.5,
              borderColor: isSimulationMode ? tc.green : tc.cyan,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              width: '100%'
            }}
            onPress={() => {
              const newMode = !isSimulationMode;
              toggleSimulationMode();
              if (newMode) {
                Alert.alert(t('common.demoMode'), t('common.demoModeDesc'));
              } else {
                disconnect();
              }
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isSimulationMode ? `${tc.green}26` : `${tc.cyan}26`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: isSimulationMode ? tc.green : tc.cyan, fontWeight: '900' }}>•</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: tc.textPri, fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}>{t('common.demoMode').toUpperCase()}</Text>
              <Text style={{ color: tc.textSec, fontSize: 10, fontFamily: MONO, marginTop: 4 }}>{t('common.demoModeDesc')}</Text>
            </View>
            <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: isSimulationMode ? tc.green : tc.textTertiary, padding: 2 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignSelf: isSimulationMode ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
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

  // ============================================================═══
  // RENDER: Live Dashboard
  // ============================================================═══


  // ============================================================═══
  // RENDER: Expertise / Diagnostics Tab
  // ============================================================═══
  const renderExpertise = () => {
    // Left Column content (for phone/tablet 2-column layout)
    const renderLeftColumn = (isCompact: boolean) => {
      const panelPad = isCompact ? scaleMod(8) : scaleMod(12);
      const labelSz = isCompact ? scaleFont(9) : scaleFont(11);
      const valSz = isCompact ? scaleFont(9) : scaleFont(11);
      const titleSz = isCompact ? scaleFont(9) : scaleFont(11);
      
      return (
        <View style={{ flex: 1, gap: isCompact ? scaleHeight(8) : scaleHeight(16) }}>
          {/* VIN History Alert */}
          {vinHistory.length > 0 && (
            <View style={[s.warningBanner, { borderColor: tc.cyan, backgroundColor: `${tc.cyan}14`, padding: scaleMod(8), marginBottom: 0 }]}>
              <Text style={[s.warningIcon, { fontSize: isCompact ? scaleFont(14) : scaleFont(18) }]}>📜</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.warningTitle, { color: tc.cyan, fontSize: isCompact ? scaleFont(10) : scaleFont(12) }]}>{t('expertise.historyFound')}</Text>
                <Text numberOfLines={2} style={[s.warningBody, { color: tc.textSec, fontSize: isCompact ? scaleFont(8) : scaleFont(10) }]}>{t('expertise.historyFoundDesc', { count: vinHistory.length })}</Text>
                <TouchableOpacity onPress={() => setIsGarageStatsExpanded(true)} style={{ marginTop: scaleHeight(4) }}>
                  <Text style={{ color: tc.cyan, fontWeight: 'bold', fontSize: isCompact ? scaleFont(9) : scaleFont(11) }}>{t('expertise.viewHistory')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Compact Manual VIN Bar */}
          {!vin && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 8, paddingHorizontal: scaleWidth(10), paddingVertical: isCompact ? scaleHeight(2) : scaleHeight(4) }}>
              <Text style={{ fontSize: isCompact ? scaleFont(11) : scaleFont(13), marginRight: scaleWidth(6) }}>🔑</Text>
              <TextInput
                style={{ flex: 1, color: tc.cyan, fontFamily: MONO, fontSize: isCompact ? scaleFont(10) : scaleFont(11), paddingVertical: scaleHeight(2) }}
                value={manualVin}
                onChangeText={setManualVin}
                placeholder={t('expertise.vinPlaceholder')}
                placeholderTextColor={tc.textSec}
              />
            </View>
          )}

          {/* Scan button */}
          <TouchableOpacity
            style={[s.actionBtn, s.actionPurple, { paddingVertical: isCompact ? scaleHeight(10) : scaleHeight(12), borderRadius: 8, marginVertical: 0 }, (isDiagnosticMode || isAdaptationRunning) && { opacity: 0.5 }]}
            onPress={handleDiagnosticsScan}
            disabled={isDiagnosticMode || isAdaptationRunning}
          >
            <Text style={[s.actionBtnText, { color: tc.card, fontSize: isCompact ? scaleFont(10) : scaleFont(12) }]}>
              {isDiagnosticMode ? t('expertise.scanning') : `🔍  ${t('expertise.startScan')}`}
            </Text>
          </TouchableOpacity>

          {/* Vehicle Identity */}
          <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
            <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(4) : scaleHeight(8), fontSize: titleSz }]}>{t('expertise.vehicleIdentity')}</Text>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6) }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.vin')}</Text>
              <Text numberOfLines={1} style={[s.tableValue, { fontSize: valSz }]}>{vin || manualVin || '—'}</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6) }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.odometer')}</Text>
              <Text style={[s.tableValue, { fontSize: valSz }]}>{odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer} km` : '—'}</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6) }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.distSinceCleared')}</Text>
              <Text style={[s.tableValue, { fontSize: valSz }]}>{distanceSinceCleared !== null ? `${distanceSinceCleared} km` : '—'}</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6), borderBottomWidth: 0 }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.milDist')}</Text>
              <Text style={[s.tableValue, { fontSize: valSz }]}>{distanceMilOn !== null ? `${distanceMilOn} km` : '—'}</Text>
            </View>
          </View>

          {/* DTCs */}
          <View style={[s.panel, { padding: panelPad, flex: isCompact ? undefined : 1, marginBottom: 0 }]}>
            <View style={[s.panelHeader, { marginBottom: isCompact ? scaleHeight(4) : scaleHeight(8) }]}>
              <Text style={[s.panelTitle, { marginBottom: 0, fontSize: titleSz }]}>{t('expertise.dtcTitle')}</Text>
              {dtcs.length > 0 && (
                <TouchableOpacity onPress={() => guardAction(clearDiagnostics)} disabled={isDiagnosticMode} style={s.clearBtn}>
                  <Text style={[s.clearBtnText, { fontSize: isCompact ? scaleFont(9) : scaleFont(11) }]}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {dtcs.length === 0 ? (
              isCompact ? (
                <View style={[s.cleanBadge, { paddingVertical: scaleHeight(6) }]}>
                  <Text style={[s.cleanBadgeText, { fontSize: scaleFont(10) }]}>✓  {t('expertise.dtcClean')}</Text>
                </View>
              ) : (
                <View style={{ flex: 1, gap: scaleHeight(8), justifyContent: 'center' }}>
                  <View style={[s.cleanBadge, { paddingVertical: scaleHeight(12), marginBottom: scaleHeight(4) }]}>
                    <Text style={[s.cleanBadgeText, { fontSize: scaleFont(12) }]}>✓  {t('expertise.dtcClean')}</Text>
                  </View>
                  <Text style={{ fontSize: scaleFont(9.5), fontWeight: '800', color: tc.textSec, letterSpacing: 1.5, marginBottom: scaleHeight(4), fontFamily: MONO }}>
                    {t('expertise.scannedModules', 'TARANAN SİSTEMLER').toUpperCase()}
                  </Text>
                  <View style={{ gap: scaleHeight(6), backgroundColor: `${tc.green}0A`, borderWidth: 1, borderColor: `${tc.green}26`, borderRadius: 8, padding: scaleMod(10) }}>
                    {[
                      { name: t('expertise.moduleEngine', 'Motor Kontrol Ünitesi (ECU)'), status: 'OK' },
                      { name: t('expertise.moduleAbs', 'Fren Sistemi (ABS)'), status: 'OK' },
                      { name: t('expertise.moduleTcm', 'Şanzıman Kontrolü (TCU)'), status: 'OK' },
                      { name: t('expertise.moduleBcm', 'Gövde Elektroniği (BCM)'), status: 'OK' },
                    ].map((mod, index) => (
                      <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: scaleFont(9.5), color: tc.textPri, fontFamily: MONO }}>• {mod.name}</Text>
                        <Text style={{ fontSize: scaleFont(9.5), color: tc.green, fontWeight: '800', fontFamily: MONO }}>{mod.status}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            ) : (
              isCompact ? (
                dtcs.map((dtc, i) => {
                  const desc = lookupDTC(dtc);
                  return (
                    <View key={i} style={[s.dtcRow, { paddingVertical: scaleHeight(4), marginBottom: 0 }]} >
                      <View style={s.dtcDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.dtcCode, { fontSize: scaleFont(11) }]}>{dtc}</Text>
                        {desc && <Text style={{ color: tc.red, opacity: 0.8, fontSize: scaleFont(9), fontFamily: MONO, marginTop: scaleHeight(1) }}>{desc}</Text>}
                      </View>
                    </View>
                  );
                })
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: scaleHeight(4) }}>
                  {dtcs.map((dtc, i) => {
                    const desc = lookupDTC(dtc);
                    return (
                      <View key={i} style={[s.dtcRow, { paddingVertical: scaleHeight(4), marginBottom: 0 }]} >
                        <View style={s.dtcDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.dtcCode, { fontSize: scaleFont(10) }]}>{dtc}</Text>
                          {desc && <Text style={{ color: tc.red, opacity: 0.8, fontSize: scaleFont(8), fontFamily: MONO, marginTop: scaleHeight(1) }}>{desc}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )
            )}
          </View>
        </View>
      );
    };

    // Right Column content (for phone/tablet 2-column layout)
    const renderRightColumn = (isCompact: boolean) => {
      const panelPad = isCompact ? scaleMod(8) : scaleMod(12);
      const titleSz = isCompact ? scaleFont(9) : scaleFont(11);
      
      return (
        <View style={{ flex: 1.1, gap: isCompact ? scaleHeight(8) : scaleHeight(16) }}>
          {/* Secondary Actions */}
          <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
            <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(6) : scaleHeight(10), fontSize: titleSz }]}>{t('expertise.extraActions')}</Text>
            
            <View style={{ gap: isCompact ? scaleHeight(6) : scaleHeight(8) }}>
              <View style={{ flexDirection: 'row', gap: isCompact ? scaleWidth(6) : scaleWidth(8) }}>
                <TouchableOpacity
                  style={[s.miniAction, { flex: 1, backgroundColor: tc.purple, paddingVertical: isCompact ? scaleHeight(8) : scaleHeight(10), borderRadius: 8 }]}
                  onPress={() => proGuardAction(() => setIsFreezeFrameVisible(true))}
                >
                  <Text style={[s.miniActionText, { color: tc.card, fontSize: isCompact ? scaleFont(9) : scaleFont(8.5) }]}>❄️ {t('freeze.title')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.miniAction, { flex: 1, backgroundColor: tc.amber, paddingVertical: isCompact ? scaleHeight(8) : scaleHeight(10), borderRadius: 8 }]}
                  onPress={() => proGuardAction(() => setIsBatteryTestVisible(true))}
                >
                  <Text style={[s.miniActionText, { color: tc.card, fontSize: isCompact ? scaleFont(9) : scaleFont(8.5) }]}>⚡ {t('battery.title')}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: isCompact ? scaleWidth(6) : scaleWidth(8) }}>
                <TouchableOpacity
                  style={[s.miniAction, { flex: 1, backgroundColor: tc.cyan, paddingVertical: isCompact ? scaleHeight(8) : scaleHeight(10), borderRadius: 8 }]}
                  onPress={() => proGuardAction(() => setIsPerformanceVisible(true))}
                >
                  <Text style={[s.miniActionText, { color: tc.card, fontSize: isCompact ? scaleFont(9) : scaleFont(8.5) }]}>🏁 {t('perf.title')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.miniAction, { flex: 1, backgroundColor: tc.red, paddingVertical: isCompact ? scaleHeight(8) : scaleHeight(10), borderRadius: 8 }]}
                  onPress={() => proGuardAction(handleServiceRoutine)}
                >
                  <Text style={[s.miniActionText, { color: tc.card, fontSize: isCompact ? scaleFont(9) : scaleFont(8.5) }]}>🔧 {t('service.ecuReset')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Garage & Records */}
          <View style={[s.panel, { padding: panelPad, flex: isCompact ? undefined : 1, marginBottom: 0 }]}>
            <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(6) : scaleHeight(8), fontSize: titleSz }]}>{t('expertise.garageTitle')}</Text>
            
            <View style={{ flexDirection: 'row', gap: scaleWidth(6), marginBottom: isCompact ? scaleHeight(6) : scaleHeight(10) }}>
              <TouchableOpacity
                style={[s.actionBtn, { flex: 1, backgroundColor: tc.green, borderRadius: 8, paddingVertical: isCompact ? scaleHeight(6) : scaleHeight(8) }, isDiagnosticMode && { opacity: 0.5 }]}
                onPress={handleShareReport}
                disabled={isDiagnosticMode}
              >
                <Text style={[s.actionBtnText, { fontSize: isCompact ? scaleFont(9) : scaleFont(8.5), color: tc.card }]}>📤 {t('expertise.share')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { flex: 1, backgroundColor: tc.cyan, borderRadius: 8, paddingVertical: isCompact ? scaleHeight(6) : scaleHeight(8) }]}
                onPress={() => proGuardAction(() => {
                  if (vin || manualVin) {
                    setIsSaveModalVisible(true);
                  } else {
                    Alert.alert(t('expertise.vinRequired'), t('expertise.vinRequiredDesc'));
                  }
                })}
              >
                <Text style={[s.actionBtnText, { fontSize: isCompact ? scaleFont(9) : scaleFont(8.5), color: tc.card }]}>💾 {t('expertise.saveVehicle')}</Text>
              </TouchableOpacity>
            </View>

            {garageRecords.length === 0 && vinHistory.length === 0 ? (
              <View style={{ flex: isCompact ? undefined : 1, justifyContent: 'center', alignItems: 'center', opacity: 0.7, paddingVertical: isCompact ? scaleHeight(16) : scaleHeight(8), paddingHorizontal: isCompact ? 0 : scaleWidth(16) }}>
                <Text style={{ color: tc.textPri, fontSize: isCompact ? scaleFont(9.5) : scaleFont(11), fontWeight: '800', fontFamily: MONO, textAlign: 'center', marginBottom: scaleHeight(4) }}>
                  {t('expertise.noRecords')}
                </Text>
                {!isCompact && (
                  <Text style={{ color: tc.textSec, fontSize: scaleFont(9), fontFamily: MONO, textAlign: 'center', lineHeight: scaleFont(13) }}>
                    {t('expertise.garageInfoDesc', 'Arıza taraması yaptıktan sonra araç geçmişini kaydetmek için "BU ARACI KAYDET" butonuna basarak garajınıza ekleyebilirsiniz.')}
                  </Text>
                )}
              </View>
            ) : (
              isCompact ? (
                (vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      marginBottom: scaleHeight(6),
                      padding: scaleMod(12),
                      backgroundColor: tc.card,
                      borderWidth: 1,
                      borderColor: tc.border,
                      borderRadius: 6,
                    }}
                    onPress={() => proGuardAction(() => handleSelectRecord(item))}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: tc.textPri, fontSize: scaleFont(12), fontWeight: '800', fontFamily: MONO }}>
                          {getLocalizedVehicleBrand(item.make, t)} {getLocalizedVehicleModel(item.model)}
                        </Text>
                        <Text style={{ color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: scaleHeight(2) }}>
                          {item.date}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: item.dtcs.length === 0 ? `${tc.green}1A` : `${tc.red}1A`,
                        borderWidth: 1,
                        borderColor: item.dtcs.length === 0 ? tc.green : tc.red,
                        borderRadius: 4,
                        paddingHorizontal: scaleWidth(8),
                        paddingVertical: scaleHeight(4),
                      }}>
                        <Text style={{ color: item.dtcs.length === 0 ? tc.green : tc.red, fontSize: scaleFont(9), fontWeight: '900', fontFamily: MONO }}>
                          {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: scaleHeight(4) }}>
                  {(vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        marginBottom: scaleHeight(4),
                        padding: scaleMod(8),
                        backgroundColor: tc.card,
                        borderWidth: 1,
                        borderColor: tc.border,
                        borderRadius: 6,
                      }}
                      onPress={() => proGuardAction(() => handleSelectRecord(item))}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ color: tc.textPri, fontSize: scaleFont(10), fontWeight: '800', fontFamily: MONO }}>
                            {getLocalizedVehicleBrand(item.make, t)} {getLocalizedVehicleModel(item.model)}
                          </Text>
                          <Text style={{ color: tc.textSec, fontSize: scaleFont(8), fontFamily: MONO, marginTop: scaleHeight(1) }}>
                            {item.date}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: item.dtcs.length === 0 ? `${tc.green}1A` : `${tc.red}1A`,
                          borderWidth: 1,
                          borderColor: item.dtcs.length === 0 ? tc.green : tc.red,
                          borderRadius: 4,
                          paddingHorizontal: scaleWidth(6),
                          paddingVertical: scaleHeight(2),
                        }}>
                          <Text style={{ color: item.dtcs.length === 0 ? tc.green : tc.red, fontSize: scaleFont(7), fontWeight: '900', fontFamily: MONO }}>
                            {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )
            )}
          </View>

          {/* Jump to Live Sensors */}
          {isCompact && (
            <TouchableOpacity
              style={{ 
                backgroundColor: tc.cyan, 
                borderRadius: 12, 
                padding: scaleMod(10), 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: scaleWidth(8),
                borderWidth: 1,
                borderColor: `${tc.cyan}4D`,
                flexShrink: 0,
              }}
              onPress={() => navigateToSensors()}
            >
              <Text style={{ color: '#FFF', fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}>{t('hub.goToSensors').toUpperCase()}</Text>
              <Text style={{ color: '#FFF', fontSize: scaleFont(16), fontWeight: '900' }}>{'>'}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };

    if (isTablet) {
      return (
        <View style={{ flex: 1, paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(16), paddingTop: scaleHeight(8), alignSelf: 'center', width: '100%', maxWidth: isLargeTablet ? 900 : undefined }}>
          <View style={{ flexDirection: 'row', gap: scaleMod(16), flex: 1, marginBottom: scaleHeight(12) }}>
            {renderLeftColumn(false)}
            {renderRightColumn(false)}
          </View>
          <ChronicFaultsWidget />
          
          {/* Jump to Live Sensors */}
          <TouchableOpacity
            style={{ 
              backgroundColor: tc.cyan, 
              borderRadius: 12, 
              padding: scaleMod(14), 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: scaleWidth(8),
              borderWidth: 1,
              borderColor: `${tc.cyan}4D`,
              flexShrink: 0,
            }}
            onPress={() => navigateToSensors()}
          >
            <Text style={{ color: '#FFF', fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}>{t('hub.goToSensors').toUpperCase()}</Text>
            <Text style={{ color: '#FFF', fontSize: scaleFont(20), fontWeight: '900' }}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Phone single-column scrollable layout
    return (
      <ScrollView style={s.tabContent} contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(100), gap: scaleHeight(12) }}>
        {renderLeftColumn(true)}
        {renderRightColumn(true)}
        <ChronicFaultsWidget />
      </ScrollView>
    );
  };


  // ============================================================═══
  // RENDER: Service / Adaptation Tab (Sequential Flow)
  // ============================================================═══
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



  // ============================================================═══
  // RENDER: Information Tab
  // ============================================================═══
  const toggleInfoAcc = (section: string) => {
    setExpandedInfoSection(expandedInfoSection === section ? null : section);
  };

  const InfoAccordion = ({ id, icon, title, content }: { id: string, icon: string, title: string, content: string | React.ReactNode }) => (
    <View style={{ marginBottom: scaleHeight(8) }}>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: expandedInfoSection === id ? tc.elevated : tc.card, borderWidth: 1, borderColor: tc.border, paddingVertical: scaleHeight(14), flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: scaleWidth(16) }]}
        onPress={() => toggleInfoAcc(id)}
      >
        <Text style={[s.actionBtnText, { color: expandedInfoSection === id ? tc.cyan : tc.textPri, fontSize: scaleFont(12) }]}>
          {icon}  {title}
        </Text>
        <Text style={{ color: tc.textSec, fontSize: scaleFont(12) }}>{expandedInfoSection === id ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedInfoSection === id && (
        <View style={{ backgroundColor: tc.bg, padding: scaleMod(16), borderWidth: 1, borderTopWidth: 0, borderColor: tc.border, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
          {typeof content === 'string' ? <Text style={[s.panelDesc, { color: tc.textSec, fontSize: scaleFont(11) }]}>{content}</Text> : content}
        </View>
      )}
    </View>
  );

  const renderInfo = () => {
    const isCompact = !isTablet;

    const renderOnboardingAccordionContent = () => (
      <View style={{ gap: scaleHeight(12) }}>
        <Text style={[s.panelDesc, { color: tc.textSec, fontSize: scaleFont(11), lineHeight: scaleFont(15) }]}>
          {t('permissions.cardDesc')}
        </Text>
        
        <View style={{ gap: scaleHeight(8), marginTop: scaleHeight(4) }}>
          {/* Bluetooth Status Row */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            backgroundColor: `${tc.textPri}05`,
            borderWidth: 1,
            borderColor: tc.border,
            borderRadius: 6,
            paddingVertical: scaleHeight(10),
            paddingHorizontal: scaleWidth(12)
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
              <Text style={{ fontSize: scaleFont(14) }}>⚡</Text>
              <Text style={{ color: tc.textPri, fontSize: scaleFont(11), fontFamily: MONO, fontWeight: '700' }}>
                {t('permissions.btLabel')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) }}>
              <View style={{ 
                width: 6, 
                height: 6, 
                borderRadius: 3, 
                backgroundColor: infoBtStatus === 'granted' ? tc.green : tc.red 
              }} />
              <Text style={{ 
                color: infoBtStatus === 'granted' ? tc.green : tc.red, 
                fontSize: scaleFont(10), 
                fontFamily: MONO,
                fontWeight: '900' 
              }}>
                {infoBtStatus === 'checking' ? '...' : (infoBtStatus === 'granted' ? t('common.active', 'ACTIVE') : t('common.disabled', 'DISABLED'))}
              </Text>
            </View>
          </View>

          {/* Location Status Row */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            backgroundColor: `${tc.textPri}05`,
            borderWidth: 1,
            borderColor: tc.border,
            borderRadius: 6,
            paddingVertical: scaleHeight(10),
            paddingHorizontal: scaleWidth(12)
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
              <Text style={{ fontSize: scaleFont(14) }}>📍</Text>
              <Text style={{ color: tc.textPri, fontSize: scaleFont(11), fontFamily: MONO, fontWeight: '700' }}>
                {t('permissions.locLabel')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) }}>
              <View style={{ 
                width: 6, 
                height: 6, 
                borderRadius: 3, 
                backgroundColor: infoLocStatus === 'granted' ? tc.green : tc.red 
              }} />
              <Text style={{ 
                color: infoLocStatus === 'granted' ? tc.green : tc.red, 
                fontSize: scaleFont(10), 
                fontFamily: MONO,
                fontWeight: '900' 
              }}>
                {infoLocStatus === 'checking' ? '...' : (infoLocStatus === 'granted' ? t('common.active', 'ACTIVE') : t('common.disabled', 'DISABLED'))}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={{ 
            marginTop: scaleHeight(6),
            backgroundColor: tc.elevated, 
            borderWidth: 1.5, 
            borderColor: tc.border, 
            borderRadius: 8, 
            paddingVertical: scaleHeight(10), 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8
          }}
          onPress={() => {
            useAppStore.getState().setHasOnboarded(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: tc.cyan, fontSize: scaleFont(10), fontWeight: '900', fontFamily: MONO }}>
            🛡️ {t('info.reconfigurePermissions').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    );

    const renderLeftCol = (isCompact: boolean) => (
      <View style={{ flex: isCompact ? undefined : 1, gap: isCompact ? scaleHeight(8) : scaleHeight(12) }}>
        {/* Top Section */}
        <View style={{ alignItems: 'center', marginBottom: isCompact ? scaleHeight(8) : scaleHeight(16), marginTop: scaleHeight(4) }}>
          <Text style={[s.logoText, { color: colors.cyan, fontSize: isCompact ? scaleFont(16) : scaleFont(22) }]}>MOTOCORTEX</Text>
          <Text style={[s.logoSub, { color: colors.cyan, fontSize: isCompact ? scaleFont(9) : scaleFont(11) }]}>v7 PRO</Text>
          <Text numberOfLines={3} style={{ color: colors.textSec, fontFamily: MONO, fontSize: isCompact ? scaleFont(9) : scaleFont(10), marginTop: scaleHeight(6), textAlign: 'center', paddingHorizontal: scaleWidth(10) }}>
            {t('info.desc')}
          </Text>
        </View>

        {/* Garage - View Only in Info Tab */}
        <View style={[s.panel, { padding: isCompact ? scaleMod(8) : scaleMod(12), flex: isCompact ? undefined : 1, marginBottom: 0 }]}>
          <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(6) : scaleHeight(10), fontSize: isCompact ? scaleFont(9) : scaleFont(11) }]}>{t('hub.pastRecords')}</Text>
          
          {garageRecords.length === 0 && vinHistory.length === 0 ? (
            <View style={{ flex: isCompact ? undefined : 1, justifyContent: 'center', alignItems: 'center', opacity: 0.7, paddingVertical: isCompact ? scaleHeight(30) : scaleHeight(15) }}>
              <Text style={{ color: tc.textSec, fontSize: isCompact ? scaleFont(9) : scaleFont(11), fontFamily: MONO, fontStyle: 'italic' }}>
                {t('expertise.noRecords')}
              </Text>
            </View>
          ) : (
            isCompact ? (
              (vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    marginBottom: scaleHeight(10),
                    padding: scaleMod(16),
                    backgroundColor: tc.card,
                    borderWidth: 1,
                    borderColor: tc.border,
                    borderRadius: 6,
                  }}
                  onPress={() => handleSelectRecord(item)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: tc.textPri, fontSize: scaleFont(14), fontWeight: '800', fontFamily: MONO }}>
                        {getLocalizedVehicleBrand(item.make, t)} {getLocalizedVehicleModel(item.model)}
                      </Text>
                      <Text style={{ color: tc.textSec, fontSize: scaleFont(11), fontFamily: MONO, marginTop: scaleHeight(4) }}>
                        {item.date} • {item.km} km
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: item.dtcs.length === 0 ? `${tc.green}1A` : `${tc.red}1A`,
                      borderWidth: 1,
                      borderColor: item.dtcs.length === 0 ? tc.green : tc.red,
                      borderRadius: 4,
                      paddingHorizontal: scaleWidth(10),
                      paddingVertical: scaleHeight(5),
                    }}>
                      <Text style={{
                        color: item.dtcs.length === 0 ? tc.green : tc.red,
                        fontSize: scaleFont(10),
                        fontWeight: '900',
                        fontFamily: MONO,
                      }}>
                        {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: scaleHeight(6) }}>
                {(vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      padding: scaleMod(10),
                      backgroundColor: tc.card,
                      borderWidth: 1,
                      borderColor: tc.border,
                      borderRadius: 6,
                    }}
                    onPress={() => handleSelectRecord(item)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: tc.textPri, fontSize: scaleFont(11), fontWeight: '800', fontFamily: MONO }}>
                          {getLocalizedVehicleBrand(item.make, t)} {getLocalizedVehicleModel(item.model)}
                        </Text>
                        <Text style={{ color: tc.textSec, fontSize: scaleFont(9), fontFamily: MONO, marginTop: scaleHeight(2) }}>
                          {item.date} • {item.km} km
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: item.dtcs.length === 0 ? `${tc.green}1A` : `${tc.red}1A`,
                        borderWidth: 1,
                        borderColor: item.dtcs.length === 0 ? tc.green : tc.red,
                        borderRadius: 4,
                        paddingHorizontal: scaleWidth(8),
                        paddingVertical: scaleHeight(3),
                      }}>
                        <Text style={{
                          color: item.dtcs.length === 0 ? tc.green : tc.red,
                          fontSize: scaleFont(8),
                          fontWeight: '900',
                          fontFamily: MONO,
                        }}>
                          {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          )}
        </View>

        <TouchableOpacity 
          style={{ paddingVertical: isCompact ? scaleHeight(8) : scaleHeight(12), borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center', flexShrink: 0 }}
          onPress={handleVersionTap}
          activeOpacity={1}
        >
          <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(9) }}>MotoCortex v1.0.0 (1) {(isPro || isSimulationMode) ? 'PRO' : 'FREE'}</Text>
        </TouchableOpacity>
        <Text style={{
          color: colors.textSec,
          fontFamily: MONO,
          fontSize: scaleFont(8),
          textAlign: 'center',
          opacity: 0.6,
          lineHeight: scaleFont(11.5),
          paddingHorizontal: scaleWidth(10),
          marginBottom: isCompact ? scaleHeight(10) : 0,
        }}>
          {t('disclaimer')}
        </Text>
      </View>
    );

    const renderRightCol = (isCompact: boolean) => {
      const accordions = (
        <>
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
          <InfoAccordion
            id="onboarding"
            icon="⚖️"
            title={t('info.sections.onboarding.title')}
            content={renderOnboardingAccordionContent()}
          />
        </>
      );

      return (
        <View style={{ flex: isCompact ? undefined : 1.2, gap: isCompact ? scaleHeight(8) : scaleHeight(12) }}>
          <Text style={[s.panelTitle, { marginLeft: 4, marginBottom: isCompact ? scaleHeight(12) : scaleHeight(2), fontSize: isCompact ? scaleFont(11) : scaleFont(9) }]}>{t('info.helpGuide')}</Text>

          {isCompact ? (
            accordions
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: scaleHeight(6), paddingBottom: scaleHeight(10) }}>
              {accordions}
            </ScrollView>
          )}
        </View>
      );
    };

    if (isTablet) {
      return (
        <View style={{ flex: 1, paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(16), paddingTop: scaleHeight(8), alignSelf: 'center', width: '100%', maxWidth: isLargeTablet ? 900 : undefined }}>
          <View style={{ flexDirection: 'row', gap: scaleMod(16), flex: 1 }}>
            {renderLeftCol(false)}
            {renderRightCol(false)}
          </View>
        </View>
      );
    }

    // Phone single-column scrollable layout
    return (
      <ScrollView style={s.tabContent} contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(40), gap: scaleHeight(12) }}>
        {renderLeftCol(true)}
        {renderRightCol(true)}
      </ScrollView>
    );
  };

  const renderDemoCard = (isCompact: boolean) => {
    const cardPadding = isCompact ? 10 : 16;
    const iconSize = isCompact ? 32 : 44;
    const titleSize = isCompact ? 11 : 13;

    return (
      <TouchableOpacity 
        style={{ 
          backgroundColor: isSimulationMode ? `${colors.green}14` : `${colors.cyan}14`,
          borderRadius: 20,
          borderWidth: 2.5,
          borderColor: isSimulationMode ? colors.green : colors.cyan,
          padding: cardPadding,
          flexDirection: 'row',
          alignItems: 'center',
          gap: isCompact ? 8 : 16,
          flex: 1,
        }}
        onPress={() => {
          const newMode = !isSimulationMode;
          toggleSimulationMode();
          if (newMode) {
            Alert.alert(t('common.demoMode'), t('common.demoModeDesc'));
          } else {
            disconnect();
          }
        }}
      >
        <View style={{ width: iconSize, height: iconSize, borderRadius: 12, backgroundColor: isSimulationMode ? `${colors.green}26` : `${colors.cyan}26`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: isCompact ? 14 : 20, color: isSimulationMode ? colors.green : colors.cyan, fontWeight: '900' }}>•</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPri, fontSize: titleSize, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}>{t('common.demoMode').toUpperCase()}</Text>
        </View>
        <View style={{ width: isCompact ? 32 : 40, height: isCompact ? 18 : 24, borderRadius: 12, backgroundColor: isSimulationMode ? colors.green : colors.textTertiary, padding: 2 }}>
          <View style={{ width: isCompact ? 14 : 20, height: isCompact ? 14 : 20, borderRadius: 7, backgroundColor: '#FFF', alignSelf: isSimulationMode ? 'flex-end' : 'flex-start' }} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderProCard = (isCompact: boolean) => {
    const cardPadding = isCompact ? 10 : 16;
    const iconSize = isCompact ? 32 : 44;
    const titleSize = isCompact ? 11 : 13;
    const subtitleSize = isCompact ? 8 : 10;
    const remaining = Math.max(0, 3 - freeUsageCount);

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => (!isPro && !isSimulationMode) && setIsPaywallVisible(true)}
        style={{
          backgroundColor: (isPro || isSimulationMode) ? `${colors.purple}14` : `${colors.purple}08`,
          borderRadius: 20,
          borderWidth: 2.5,
          borderColor: colors.purple,
          padding: cardPadding,
          flexDirection: 'row',
          alignItems: 'center',
          gap: isCompact ? 8 : 16,
          flex: 1,
        }}
      >
        <View style={{ 
          width: iconSize, 
          height: iconSize, 
          borderRadius: 12, 
          backgroundColor: `${colors.purple}26`, 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          <Text style={{ fontSize: isCompact ? 14 : 20 }}>{(isPro || isSimulationMode) ? '👑' : '🛡️'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPri, fontSize: titleSize, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}>
            {(isPro || isSimulationMode) ? t('common.proActive').toUpperCase() : t('common.freeAccount').toUpperCase()}
          </Text>
        </View>
        {(!isPro && !isSimulationMode) ? (
          <View style={{ backgroundColor: colors.purple, paddingHorizontal: isCompact ? 8 : 12, paddingVertical: isCompact ? 6 : 8, borderRadius: 10 }}>
            <Text style={{ color: '#FFF', fontSize: isCompact ? 9 : 11, fontWeight: '900', fontFamily: MONO }}>{t('common.upgrade').toUpperCase()}</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: `${colors.purple}26`, paddingHorizontal: isCompact ? 6 : 10, paddingVertical: isCompact ? 4 : 6, borderRadius: 8, borderWidth: 1, borderColor: colors.purple }}>
            <Text style={{ color: colors.purple, fontSize: isCompact ? 8 : 9, fontWeight: '900', fontFamily: MONO }}>{t('common.active').toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ===============================================================
  // MAIN RENDER (Bento Box / Glassmorphism Paradigm)
  // ===============================================================
  if (!hasOnboarded) {
    return <PermissionGateway />;
  }

  const isLightMode = theme === 'light';

  return (
    <BluetoothBridgeInitializer>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

        <View style={{ flex: 1 }}>
          {/* Top Header Bar */}
          <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={s.topLeft}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap}>
                <Text style={[
                  s.topLogo,
                  {
                    color: colors.cyan,
                    fontSize: isPhone ? (isSimulationMode ? scaleFont(12) : scaleFont(13.5)) : scaleFont(14.5),
                    letterSpacing: isPhone ? 1 : 2
                  }
                ]}>MOTOCORTEX {isSimulationMode ? 'SIM' : ''}</Text>
              </TouchableOpacity>
              <View style={[s.topBadge, { borderColor: statusColor(ecuStatus) }]}>
                <View style={[s.topBadgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
                <Text style={[s.topBadgeText, { color: statusColor(ecuStatus) }]}>
                  {isPhone ? "BLE" : (ecuStatus === 'connected' ? t('hub.bleConnected') : t('hub.bleIdle'))}
                </Text>
              </View>
            </View>
            <View style={s.topRight}>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => (isPro || isSimulationMode) ? Alert.alert(t('common.proActive'), t('common.proActiveDesc')) : setIsPaywallVisible(true)}
                style={{ backgroundColor: `${colors.purple}1F`, borderWidth: 1, borderColor: colors.purple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
              >
                <Text style={{ color: `${colors.purple}CC`, fontSize: 10, fontWeight: '900', fontFamily: MONO }}>👑 PRO</Text>
              </TouchableOpacity>
              {ecuStatus === 'connected' && (
                <TouchableOpacity onPress={() => disconnect()}>
                  <Text style={[s.topDisconnect, { color: colors.red }]}>
                    {isPhone ? t('connection.disconnectShort').toUpperCase() : t('connection.disconnect').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
        </View>

        {isCloneDevice && ecuStatus === 'connected' && (
          <View style={{
            backgroundColor: `${colors.amber}1A`,
            borderBottomWidth: 1,
            borderBottomColor: colors.amber,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <Text style={{
              color: colors.amber,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              ⚠️ {t('connection.safeModeActive')}
            </Text>
          </View>
        )}

        {/* Central Hub View vs Sub-Views */}
        {activeHubView === 'hub' ? (
          isTablet ? (
            <View style={{ flex: 1, paddingHorizontal: scaleWidth(16), paddingTop: scaleHeight(8), alignSelf: isLargeTablet ? 'center' : undefined, width: isLargeTablet ? scaleWidth(900) : '100%', maxWidth: isLargeTablet ? 900 : undefined }}>
              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ 
                  flexGrow: 1, 
                  justifyContent: 'space-between',
                  paddingBottom: scaleHeight(16)
                }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ gap: scaleHeight(24), flex: 1, justifyContent: 'center' }}>
                  <LiveEngineHero onConnectPress={() => {
                    if (hasFreeUsage()) {
                      setIsConnectModalVisible(true);
                    } else {
                      setIsPaywallVisible(true);
                    }
                  }} />

                  <View>
                    <Text style={{ fontSize: scaleFont(12), fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: scaleHeight(12), marginTop: scaleHeight(4), fontFamily: MONO }}>
                      {t('hub.controlHub').toUpperCase()}
                    </Text>
                    <BentoGrid
                      onOpenDiagnostics={() => setActiveHubView('expertise')}
                      onOpenSensors={() => navigateToSensors()}
                      onOpenProfile={() => setActiveHubView('info')}
                      onOpenSettings={() => setIsSettingsModalVisible(true)}
                      onOpenPaywall={() => setIsPaywallVisible(true)}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: scaleMod(12), flexShrink: 0, marginTop: scaleHeight(20) }}>
                  {renderDemoCard(false)}
                  {renderProCard(false)}
                </View>
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: scaleWidth(16),
                paddingBottom: isSmallPhone ? scaleHeight(16) : scaleHeight(24),
                paddingTop: isSmallPhone ? scaleHeight(4) : scaleHeight(12),
                justifyContent: 'space-between'
              }}
              showsVerticalScrollIndicator={false}
            >
              <LiveEngineHero onConnectPress={() => {
                if (hasFreeUsage()) {
                  setIsConnectModalVisible(true);
                } else {
                  setIsPaywallVisible(true);
                }
              }} />

              <Text style={{ fontSize: isSmallPhone ? scaleFont(9) : scaleFont(11), fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: isSmallPhone ? scaleHeight(4) : scaleHeight(12), marginTop: isSmallPhone ? scaleHeight(4) : scaleHeight(8), fontFamily: MONO }}>
                {t('hub.controlHub')}
              </Text>

              <BentoGrid
                onOpenDiagnostics={() => setActiveHubView('expertise')}
                onOpenSensors={() => navigateToSensors()}
                onOpenProfile={() => setActiveHubView('info')}
                onOpenSettings={() => setIsSettingsModalVisible(true)}
                onOpenPaywall={() => setIsPaywallVisible(true)}
              />

              <View style={{ flexDirection: 'row', gap: scaleMod(8), marginTop: isSmallPhone ? scaleHeight(8) : scaleHeight(12), flexShrink: 0 }}>
                {renderDemoCard(true)}
                {renderProCard(true)}
              </View>
            </ScrollView>
          )
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
              {activeHubView === 'sensors' && (
                <DashboardSpeedometer 
                  ecuStatus={ecuStatus} 
                  lastDeviceName={lastDeviceName} 
                  onConnectPress={() => {
                    if (hasFreeUsage()) {
                      setIsConnectModalVisible(true);
                    } else {
                      setIsPaywallVisible(true);
                    }
                  }} 
                  onGoToExpertise={() => setActiveHubView('expertise')}
                  onOpenHardwareHealth={() => setIsHardwareHealthVisible(true)}
                />
              )}
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

        {/* Save to Garage Overlay */}
        {isSaveModalVisible && (
          <View style={s.saveOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={s.saveKeyboardContainer}
            >
              <View style={[s.saveContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Text style={{ color: colors.textPri, fontSize: 16, fontWeight: '800', fontFamily: MONO, marginBottom: 16, textAlign: 'center' }}>
                  {t('common.save').toUpperCase()}
                </Text>
                
                <SearchableVehicleSelect 
                  confirmText={t('common.save')}
                  cancelText={t('common.cancel')}
                  onCancel={() => setIsSaveModalVisible(false)}
                  onConfirm={(brandId, modelId, year) => {
                    handleSaveToGarage(brandId, modelId, year);
                  }}
                  initialBrandId={activeSessionVehicle?.brand}
                  initialModelId={activeSessionVehicle?.model}
                  initialYear={activeSessionVehicle?.year}
                />
              </View>
            </KeyboardAvoidingView>
          </View>
        )}

        {/* Record Detail Modal */}
        <Modal
          visible={selectedRecord !== null}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedRecord(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPri, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{t('common.success')}: {selectedRecord ? `${getLocalizedVehicleBrand(selectedRecord.make, t)} ${getLocalizedVehicleModel(selectedRecord.model)}` : ''}</Text>
              <TouchableOpacity onPress={() => setSelectedRecord(null)} style={{ padding: 10 }}>
                <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            {selectedRecord && (
              <ScrollView style={{ padding: 16 }}>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>{t('expertise.vehicleIdentity')}</Text>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('report.date')}</Text><Text style={s.tableValue}>{selectedRecord.date}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('expertise.manualVin')}</Text><Text style={s.tableValue}>{getLocalizedVehicleBrand(selectedRecord.make, t)} {getLocalizedVehicleModel(selectedRecord.model)}</Text></View>
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

      </View>
      </SafeAreaView>

      {/* Hardware Health & ID Modal */}
      <HardwareHealthModal
        visible={isHardwareHealthVisible}
        onClose={() => setIsHardwareHealthVisible(false)}
      />

      {/* Quick Settings Modal */}
      <QuickSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        onTriggerDebug={() => {
          setIsSettingsModalVisible(false);
          setIsSecretDebugVisible(true);
        }}
        onDisconnect={disconnect}
      />

      {/* Mandatory Vehicle Selection Gate Modal */}
      <VehicleSelectModal
        visible={ecuStatus === 'connected' && !activeSessionVehicle}
        onDisconnect={disconnect}
      />

      {/* Secret Debug Modal */}
      <SecretDebugModal
        visible={isSecretDebugVisible}
        onClose={() => setIsSecretDebugVisible(false)}
      />

      {/* Paywall Modal Overlay */}
      <Paywall
        visible={isPaywallVisible}
        onClose={() => setIsPaywallVisible(false)}
      />
      </View>
    </BluetoothBridgeInitializer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
