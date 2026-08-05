import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Platform, PermissionsAndroid, ActivityIndicator, Share, Modal, Alert, FlatList, Linking, useWindowDimensions, KeyboardAvoidingView, LogBox, Image, Animated, I18nManager, NativeModules, DeviceEventEmitter } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useBluetooth } from '../hooks/useBluetooth';
import ChronicFaultsWidget from '../components/ChronicFaultsWidget';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { ADAPTER_COMMANDS } from '../api/commands';
import { lookupDTC, prefetchDtcChunksForCodes } from '../data/dtcDictionary';
import { getGuidedDiagnostics } from '../services/dtcIntelligenceService';
import BatteryTestModal from '../components/BatteryTestModal';
import FreezeFrameModal from '../components/FreezeFrameModal';
import PerformanceModal from '../components/PerformanceModal';
import AiDoctorModal from '../components/AiDoctorModal';
import { AiDiagnosticContext } from '../services/aiDoctorService';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { saveGarageRecord, getGarageRecords, deleteGarageRecord, getRecordsByVin, GarageRecord } from '../store/garageStore';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PermissionGateway from '../components/PermissionGateway';
import LiveEngineHero from '../components/LiveEngineHero';
import BentoGrid from '../components/BentoGrid';
import AdminSecretModal from '../components/AdminSecretModal';
import * as Clipboard from 'expo-clipboard';
import { useAppStore, checkIsProStatus, AppLanguage } from '../store/useAppStore';
import Purchases from 'react-native-purchases';
import Paywall from '../components/Paywall';
import ContextualPaywallModal from '../components/ContextualPaywallModal';
import { useThemeColors } from '../theme';
import { BluetoothBridgeInitializer } from '../components/BluetoothBridgeInitializer';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { useTelemetrySync } from '../services/TelemetrySyncManager';
import SearchableVehicleSelect from '../components/SearchableVehicleSelect';
import { toSnakeCase, getLocalizedVehicleBrand, getLocalizedVehicleModel } from '../utils/vehicleStandardizer';
import CustomizeDashboardModal from '../components/CustomizeDashboardModal';
import { useDashboardStore, ALL_SENSORS } from '../store/useDashboardStore';
import AboutView from '../components/AboutView';
import LanguageSelectionView from '../components/LanguageSelectionView';
import DashboardSandbox from '../screens/sandbox/DashboardSandbox';
import ConnectionFlowScreen from '../screens/ConnectionFlowScreen';
import ObdHealthScreen from '../screens/ObdHealthScreen';
import IgnitionWarningModal from '../components/IgnitionWarningModal';
import HorsepowerModal from '../components/HorsepowerModal';
import FuelTrimModal from '../components/FuelTrimModal';
import DpfMonitorModal from '../components/DpfMonitorModal';
import MultiEcuScanModal from '../components/MultiEcuScanModal';
import DctResetModal from '../components/DctResetModal';
import FeatureActivationModal from '../components/FeatureActivationModal';
import ObdService from '../services/obdService';
import { createAppStyles } from '../styles/appStyles';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export default function MainApp() {
  const { t, i18n } = useTranslation();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isPhone, isTablet, isLargeTablet, isPortrait, height, width } = useResponsive();
  const isSmallPhone = height < 820;

  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const activeSessionBrand = useTelemetryStore((state) => state.activeSessionVehicle?.brand);
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
    runDiagnostics, clearDiagnostics, runAdaptationRoutine, proGuardAction,
    lastDeviceId, lastDeviceName, isCloneDevice, connectionState,
    protocol, adapterCapabilityScore
  } = useBluetooth();

  const connectionProgress = useBluetoothStore((s) => s.connectionProgress);
  const connectionSteps = useBluetoothStore((s) => s.connectionSteps);
  const connectionStatusTextKey = useBluetoothStore((s) => s.connectionStatusTextKey);
  const connectionStatusTextParams = useBluetoothStore((s) => s.connectionStatusTextParams);

  // Reset active session telemetry details on disconnect
  useEffect(() => {
    if (ecuStatus !== 'connected') {
      useTelemetryStore.setState({ chronicFaults: [], sessionDynamicKey: null });
    }
  }, [ecuStatus]);

  // Fetch chronic faults on connection/brand changes
  useEffect(() => {
    if (ecuStatus === 'connected' && activeSessionBrand) {
      fetchChronicFaults(activeSessionBrand);
    }
  }, [ecuStatus, activeSessionBrand]);

  // Initialize the persistent Device UUID
  useEffect(() => {
    useAppStore.getState().initializeDeviceUuid();
    try {
      crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('[MainApp] Firebase Crashlytics collection enabled programmatically.');
    } catch (e) {
      console.warn('[MainApp] Failed to enable Crashlytics collection:', e);
    }
  }, []);

  const [manualVin, setManualVin] = useState('');
  const [selectedDtcDetail, setSelectedDtcDetail] = useState<string | null>(null);
  const [isDtcModalOpen, setIsDtcModalOpen] = useState(false);
  const isPro = useAppStore((state) => state.isPro);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  const colors = useThemeColors();
  const tc = colors;

  const s = useMemo(
    () => createAppStyles({ tc, scaleWidth, scaleHeight, scaleMod, scaleFont }),
    [tc, scaleWidth, scaleHeight, scaleMod, scaleFont]
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={tc.bg} />
      <PermissionGateway>
        {status !== 'connected' ? (
          <ConnectionFlowScreen
            onBack={() => {}}
            onNavigateToHealth={() => {}}
          />
        ) : (
          <DashboardSandbox />
        )}
      </PermissionGateway>
    </SafeAreaView>
  );
}
