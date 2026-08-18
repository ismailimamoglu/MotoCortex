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
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import AdminSecretModal from '../components/AdminSecretModal';
import * as Clipboard from 'expo-clipboard';
import { useAppStore, checkIsProStatus, AppLanguage } from '../store/useAppStore';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import Paywall from '../components/Paywall';
import { useThemeColors } from '../theme';
import { BluetoothBridgeInitializer } from '../components/BluetoothBridgeInitializer';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { useTelemetrySync } from '../services/TelemetrySyncManager';
import SearchableVehicleSelect from '../components/SearchableVehicleSelect';
import { toSnakeCase, getLocalizedVehicleBrand, getLocalizedVehicleModel } from '../utils/vehicleStandardizer';
import * as Location from 'expo-location';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';
import CustomizeDashboardModal from '../components/CustomizeDashboardModal';
import { useDashboardStore, ALL_SENSORS } from '../store/useDashboardStore';
import AboutView from '../components/AboutView';
import LanguageSelectionView from '../components/LanguageSelectionView';
import DashboardSandbox from '../screens/sandbox/DashboardSandbox';
import { useJsiTelemetry } from '../hooks/useJsiTelemetry';
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


const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

import DashboardSpeedometer from './DashboardSpeedometer';
import SettingsView from './SettingsView';



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
 status, adapterStatus, ecuStatus,
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
 // Clear runtime telemetry session keys but keep the user's selected vehicle
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
 const [selectedDtcDetail, setSelectedDtcDetail] = useState<string | null>(null);
 const [isDtcModalOpen, setIsDtcModalOpen] = useState(false);

 const [hasShownCloneWarning, setHasShownCloneWarning] = useState(false);

 const [scannedDevices, setScannedDevices] = useState<any[]>([]);
 const [permissionGranted, setPermissionGranted] = useState(false);
 const [isPolling, setIsPolling] = useState(false);
 const hasOnboarded = useAppStore((state) => state.hasOnboarded);
 const isPro = useAppStore((state) => state.isPro);
 const isSimulationMode = useAppStore((state) => state.isSimulationMode);
 const toggleSimulationMode = useAppStore((state) => state.toggleSimulationMode);
 const freeUsageCount = useAppStore((state) => state.freeUsageCount);
 const initializeDeviceUuid = useAppStore((state) => state.initializeDeviceUuid);
 const appUserId = useAppStore((state) => state.appUserId);
 const language = useAppStore((state) => state.language);

 const [isAiDoctorAnalysisActive, setIsAiDoctorAnalysisActive] = useState(false);

 const handleOpenDtcDetail = (dtcCode: string) => {
 setSelectedDtcDetail(dtcCode);
 setIsAiDoctorAnalysisActive(false);
 setIsDtcModalOpen(true);
 };

 const renderDtcDetailModal = () => {
 if (!selectedDtcDetail) return null;
 const code = selectedDtcDetail.toUpperCase();
 const desc = lookupDTC(code) || t('dtc.generalFault');
 const prefix = code.charAt(0);

 let categoryName = t('dtcCategory.powertrain');
 let categoryColor = tc.red;

 if (prefix === 'C') {
 categoryName = t('dtcCategory.chassis');
 categoryColor = tc.amber;
 } else if (prefix === 'B') {
 categoryName = t('dtcCategory.body');
 categoryColor = tc.cyan;
 } else if (prefix === 'U') {
 categoryName = t('dtcCategory.network');
 categoryColor = tc.purple;
 }

 if (isAiDoctorAnalysisActive) {
 const guided = getGuidedDiagnostics(code);
 return (
 <Modal
 visible={isDtcModalOpen}
 animationType="fade"
 transparent={true}
 onRequestClose={() => setIsDtcModalOpen(false)}
 >
 <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
 <View style={{
 backgroundColor: tc.card,
 borderTopLeftRadius: 20,
 borderTopRightRadius: 20,
 borderWidth: 1,
 borderColor: tc.cyan,
 padding: scaleMod(20),
 maxHeight: '85%',
 }}>
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(16) }}>
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(10) }}>
 <View style={{ backgroundColor: `${tc.cyan}20`, borderWidth: 1, borderColor: tc.cyan, borderRadius: 8, paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(4) }}>
 <Text style={{ color: tc.cyan, fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO }}>{t('errorBoundary.aiDoctor')}</Text>
 </View>
 <Text style={{ color: tc.textPri, fontSize: scaleFont(12), fontWeight: '900', fontFamily: MONO }}>{code} {t('aiDoctor.reportTitle')}</Text>
 </View>
 <TouchableOpacity onPress={() => setIsDtcModalOpen(false)} style={{ padding: scaleMod(6) }}>
 <Text style={{ color: tc.textPri, fontSize: scaleFont(16), fontWeight: '900', fontFamily: MONO }}>✕</Text>
 </TouchableOpacity>
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: scaleHeight(14), paddingBottom: scaleHeight(20) }}>
 {/* Health Score Impact Card */}
 <View style={{ backgroundColor: '#0d331e', borderWidth: 1, borderColor: '#00cc66', borderRadius: 12, padding: scaleMod(12), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ color: '#00ee77', fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO }}>
 {t('aiDoctor.healthImpactTitle').toUpperCase()}
 </Text>
 <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: scaleFont(12), fontFamily: MONO }}>75 / 100</Text>
 </View>

 {/* Driving Safety Guidance */}
 <View style={{ backgroundColor: tc.bg, borderRadius: 12, padding: scaleMod(14), borderWidth: 1, borderColor: tc.border, gap: scaleHeight(6) }}>
 <Text style={{ fontSize: scaleFont(10), color: tc.cyan, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 }}>
 {t('aiDoctor.drivingSafety').toUpperCase()}
 </Text>
 <Text style={{ fontSize: scaleFont(11), color: tc.textPri, fontFamily: MONO, lineHeight: scaleFont(16) }}>
 {t('aiDoctor.warningDrive')}
 </Text>
 </View>

 {/* Probable Causes */}
 <View style={{ backgroundColor: tc.bg, borderRadius: 12, padding: scaleMod(14), borderWidth: 1, borderColor: tc.border, gap: scaleHeight(8) }}>
 <Text style={{ fontSize: scaleFont(10), color: tc.cyan, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 }}>
 {t('aiDoctor.causes').toUpperCase()}
 </Text>
 {guided.probableCauses.map((pc, idx) => (
 <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: scaleFont(11), color: tc.textPri, fontFamily: MONO, flex: 1 }}>• {pc.cause}</Text>
 <Text style={{ fontSize: scaleFont(10), color: tc.cyan, fontFamily: MONO, fontWeight: '800', marginLeft: scaleWidth(8) }}>%{pc.probability}</Text>
 </View>
 ))}
 </View>

 {/* Mechanical Steps */}
 <View style={{ backgroundColor: tc.bg, borderRadius: 12, padding: scaleMod(14), borderWidth: 1, borderColor: tc.border, gap: scaleHeight(8) }}>
 <Text style={{ fontSize: scaleFont(10), color: tc.cyan, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 }}>
 {t('aiDoctor.recommendedAction').toUpperCase()}
 </Text>
 <Text style={{ fontSize: scaleFont(11), color: tc.textPri, fontFamily: MONO, lineHeight: scaleFont(16) }}>
 1. {guided.recommendedAction}
 </Text>
 <Text style={{ fontSize: scaleFont(11), color: tc.textSec, fontFamily: MONO, lineHeight: scaleFont(16) }}>
 2. {t('aiDoctor.stepGeneric2')}
 </Text>
 </View>

 <View style={{ gap: scaleHeight(10), marginTop: scaleHeight(4) }}>
 <TouchableOpacity
 style={{ backgroundColor: tc.bg, borderWidth: 1, borderColor: tc.cyan, borderRadius: 10, paddingVertical: scaleHeight(12), alignItems: 'center' }}
 onPress={() => setIsAiDoctorAnalysisActive(false)}
 >
 <Text style={{ color: tc.cyan, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO, letterSpacing: 1 }}>
 {t('dtcDetail.backToDetail').toUpperCase()}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={{ backgroundColor: `${tc.red}18`, borderWidth: 1, borderColor: tc.red, borderRadius: 10, paddingVertical: scaleHeight(10), alignItems: 'center' }}
 onPress={() => {
 setIsDtcModalOpen(false);
 clearDiagnostics();
 }}
 >
 <Text style={{ color: tc.red, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO }}>
 {t('service.clearCodes').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 </View>
 </View>
 </Modal>
 );
 }

 return (
 <Modal
 visible={isDtcModalOpen}
 animationType="slide"
 transparent={true}
 onRequestClose={() => setIsDtcModalOpen(false)}
 >
 <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
 <View style={{
 backgroundColor: tc.card,
 borderTopLeftRadius: 20,
 borderTopRightRadius: 20,
 borderWidth: 1,
 borderColor: tc.border,
 padding: scaleMod(20),
 maxHeight: '85%',
 }}>
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(16) }}>
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(10) }}>
 <View style={{ backgroundColor: `${categoryColor}20`, borderWidth: 1, borderColor: categoryColor, borderRadius: 8, paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(4) }}>
 <Text style={{ color: categoryColor, fontSize: scaleFont(14), fontWeight: '900', fontFamily: MONO }}>{code}</Text>
 </View>
 <Text style={{ color: tc.textSec, fontSize: scaleFont(10), fontWeight: '800', fontFamily: MONO, letterSpacing: 1 }}>{categoryName}</Text>
 </View>
 <TouchableOpacity onPress={() => setIsDtcModalOpen(false)} style={{ padding: scaleMod(6) }}>
 <Text style={{ color: tc.textPri, fontSize: scaleFont(16), fontWeight: '900', fontFamily: MONO }}>✕</Text>
 </TouchableOpacity>
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: scaleHeight(16), paddingBottom: scaleHeight(20) }}>
 <View style={{ backgroundColor: tc.bg, borderRadius: 12, padding: scaleMod(14), borderWidth: 1, borderColor: tc.border }}>
 <Text style={{ fontSize: scaleFont(10), color: tc.textSec, fontFamily: MONO, fontWeight: '800', letterSpacing: 1, marginBottom: scaleHeight(6) }}>
 {t('dtcDetail.descTitle').toUpperCase()}
 </Text>
 <Text style={{ fontSize: scaleFont(13), color: tc.textPri, fontFamily: MONO, fontWeight: '700', lineHeight: scaleFont(18) }}>
 {desc}
 </Text>
 </View>

 {/* Smart Driving Safety Risk Assessment */}
 {(() => {
 let riskBadge = { color: tc.green, title: t('dtcRisk.safeTitle'), desc: t('dtcRisk.safeDesc') };
 if (['P0300', 'P0700', 'C0110', 'B0001', 'P0AA6', 'P0562', 'P0115'].includes(code)) {
 riskBadge = { color: tc.red, title: t('dtcRisk.criticalTitle'), desc: t('dtcRisk.criticalDesc') };
 } else if (prefix === 'P' || prefix === 'C' || prefix === 'B') {
 riskBadge = { color: tc.amber, title: t('dtcRisk.warningTitle'), desc: t('dtcRisk.warningDesc') };
 }
 return (
 <View style={{ backgroundColor: `${riskBadge.color}15`, borderRadius: 12, padding: scaleMod(12), borderWidth: 1, borderColor: riskBadge.color }}>
 <Text style={{ fontSize: scaleFont(11), color: riskBadge.color, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5, marginBottom: scaleHeight(4) }}>
 {riskBadge.title}
 </Text>
 <Text style={{ fontSize: scaleFont(10), color: tc.textPri, fontFamily: MONO, lineHeight: scaleFont(14) }}>
 {riskBadge.desc}
 </Text>
 </View>
 );
 })()}

 {(() => {
 const guided = getGuidedDiagnostics(code);
 return (
 <View style={{ gap: scaleHeight(12) }}>
 <View style={{ backgroundColor: tc.bg, borderRadius: 12, padding: scaleMod(14), borderWidth: 1, borderColor: tc.border, gap: scaleHeight(8) }}>
 <Text style={{ fontSize: scaleFont(10), color: tc.cyan, fontFamily: MONO, fontWeight: '800', letterSpacing: 1 }}>
 {t('dtcDetail.possibleCausesTitle').toUpperCase()}
 </Text>
 {guided.probableCauses.map((pc, idx) => (
 <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: scaleFont(11), color: tc.textPri, fontFamily: MONO, flex: 1 }}>• {pc.cause}</Text>
 <Text style={{ fontSize: scaleFont(10), color: tc.cyan, fontFamily: MONO, fontWeight: '800', marginLeft: scaleWidth(8) }}>%{pc.probability}</Text>
 </View>
 ))}
 <Text style={{ fontSize: scaleFont(10), color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), fontStyle: 'italic' }}>
 {t('dtcDetail.recommendedAction')}: {guided.recommendedAction}
 </Text>
 </View>

 {guided.tsbSummary && (
 <View style={{ backgroundColor: `${tc.purple}15`, borderWidth: 1, borderColor: tc.purple, borderRadius: 12, padding: scaleMod(12) }}>
 <Text style={{ fontSize: scaleFont(10), color: tc.purple, fontFamily: MONO, fontWeight: '900', letterSpacing: 1, marginBottom: scaleHeight(4) }}>
 {t('dtcDetail.tsbTitle')}
 </Text>
 <Text style={{ fontSize: scaleFont(10), color: tc.textPri, fontFamily: MONO, lineHeight: scaleFont(14) }}>
 {guided.tsbSummary}
 </Text>
 </View>
 )}
 </View>
 );
 })()}

 <View style={{ gap: scaleHeight(10), marginTop: scaleHeight(4) }}>
 <TouchableOpacity
 style={{ backgroundColor: tc.cyan, borderRadius: 10, paddingVertical: scaleHeight(12), alignItems: 'center' }}
 onPress={() => setIsAiDoctorAnalysisActive(true)}
 >
 <Text style={{ color: tc.card, fontWeight: '900', fontSize: scaleFont(12), fontFamily: MONO, letterSpacing: 1 }}>
 {t('dtcDetail.aiDoctorBtn').toUpperCase()}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={{ backgroundColor: `${tc.red}18`, borderWidth: 1, borderColor: tc.red, borderRadius: 10, paddingVertical: scaleHeight(10), alignItems: 'center' }}
 onPress={() => {
 setIsDtcModalOpen(false);
 clearDiagnostics();
 }}
 >
 <Text style={{ color: tc.red, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO }}>
 {t('service.clearCodes').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 </View>
 </View>
 </Modal>
 );
 };

 // Sync language selection to i18n instance on rehydration and updates with session protection
 useEffect(() => {
 if (language) {
 i18n.changeLanguage(language);
 const isRTL = language === 'ar';
 if (I18nManager.isRTL !== isRTL) {
 I18nManager.allowRTL(isRTL);
 I18nManager.forceRTL(isRTL);
 
 // Protect active Bluetooth OBD2 telemetry streams from getting disconnected
 if (!isPolling) {
 setTimeout(() => {
 Updates.reloadAsync().catch(err => {
 console.error('Failed to reload bundle for RTL transition:', err);
 });
 }, 300);
 }
 }
 }
 }, [language, isPolling]);





 const handleSupportEmail = async () => {
 const state = useAppStore.getState();
 const appUserIdVal = state.appUserId || 'N/A';
 const deviceUuidVal = state.deviceUuid || 'N/A';
 const isProStatus = state.isPro ? 'PRO (PREMIUM)' : 'FREE';
 const activeLang = state.language || i18n.language || 'en';
 const platformInfo = `${Platform.OS} (${Platform.Version})`;

 const subject = encodeURIComponent(t('info.supportSubject'));
 const body = encodeURIComponent(
 `Hi Cortex OBD2 Support Team,\n\n` +
 `Please write your message or issue description below:\n` +
 `--------------------------------------------------\n\n\n` +
 `--------------------------------------------------\n` +
 `--- System & Diagnostics Credentials ---\n` +
 `User ID: ${appUserIdVal}\n` +
 `Device UUID: ${deviceUuidVal}\n` +
 `Platform: ${platformInfo}\n` +
 `App Version: 1.2.0\n` +
 `Active Language: ${activeLang}\n` +
 `License Status: ${isProStatus}\n`
 );

 const mailtoUrl = `mailto:ismailimamoglu610@gmail.com?subject=${subject}&body=${body}`;

 try {
 const canOpen = await Linking.canOpenURL(mailtoUrl);
 if (canOpen) {
 await Linking.openURL(mailtoUrl);
 } else {
 const siteUrl = `https://motocortex-telemetry.vercel.app/?userId=${appUserIdVal}&lang=${activeLang}#support`;
 await Linking.openURL(siteUrl);
 }
 } catch (err) {
 const siteUrl = `https://motocortex-telemetry.vercel.app/?userId=${appUserIdVal}&lang=${activeLang}#support`;
 Linking.openURL(siteUrl).catch(() => {});
 }
 };

 const handleShareApp = async () => {
 try {
 await Share.share({
 message: t('info.shareMessageText'),
 title: 'Cortex OBD2 Diagnostic Scanner'
 });
 } catch (e) {
 console.error('Share action error:', e);
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

 topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 24, paddingVertical: scaleHeight(8), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
 topLeft: { flexDirection: 'row', alignItems: 'baseline', gap: scaleMod(6) },
 topLogo: { color: tc.cyan, fontSize: scaleFont(13.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
 topVersion: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO },
 topRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 16 },
 topBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(3), gap: scaleMod(4) },
 topBadgeDot: { width: scaleMod(5), height: scaleMod(5), borderRadius: scaleMod(2.5) },
 topBadgeText: { fontSize: scaleFont(8.5), fontWeight: '900', fontFamily: MONO },
 topDisconnect: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO, flexShrink: 0 },

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
 dtcRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scaleMod(8), backgroundColor: `${tc.red}14`, borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(10), marginBottom: scaleHeight(5) },
 dtcDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3), backgroundColor: tc.red, marginTop: scaleHeight(5) },
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
 const [activeHubView, setActiveHubView] = useState<
 | 'hub'
 | 'vehicle'
 | 'sensors'
 | 'expertise'
 | 'info'
 | 'settings'
 | 'connection_flow'
 | 'obd_health'
 | 'hp_gauge'
 | 'fuel_trim'
 | 'dpf'
 | 'multi_ecu'
 | 'dct'
 | 'feature_coding'
 >('hub');

 const handleCloseSubView = React.useCallback(() => setActiveHubView('hub'), []);
 const [isPaywallVisible, setIsPaywallVisible] = useState(false);
 const [activeTab, setActiveTab] = useState<'dashboard' | 'expertise' | 'info'>('dashboard'); // Kept for legacy fallback views compatibility
 const [isCustomizeModalVisible, setIsCustomizeModalVisible] = useState(false);
 const [isDiagVisible, setIsDiagVisible] = useState(false);
 const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
 const [isHpModalVisible, setIsHpModalVisible] = useState(false);
 const [isFuelTrimModalVisible, setIsFuelTrimModalVisible] = useState(false);
 const [isDpfModalVisible, setIsDpfModalVisible] = useState(false);
 const [isMultiEcuModalVisible, setIsMultiEcuModalVisible] = useState(false);
 const [isDctModalVisible, setIsDctModalVisible] = useState(false);
 const [isIgnitionModalVisible, setIsIgnitionModalVisible] = useState(false);
 const [isAiDoctorModalVisible, setIsAiDoctorModalVisible] = useState(false);
 const [aiDoctorContext, setAiDoctorContext] = useState<AiDiagnosticContext>({ dtcCodes: [] });
 const adminTapCountRef = useRef(0);
 const adminTapTimerRef = useRef<NodeJS.Timeout | null>(null);

 const paywallContext = useBluetoothStore((s) => s.paywallContext);
 useEffect(() => {
   if (paywallContext) {
     setIsPaywallVisible(true);
     useBluetoothStore.getState().clearPaywallContext();
   }
 }, [paywallContext]);

 // Force disable React Native Element Inspector overlay on startup if currently shown
 useEffect(() => {
 if (__DEV__) {
 const dismissInspector = () => {
 try {
 const Inspector = require('react-native/Libraries/Inspector/Inspector');
 if (Inspector && typeof Inspector.isShown === 'function' && Inspector.isShown()) {
 if (NativeModules.DevSettings && typeof NativeModules.DevSettings.toggleElementInspector === 'function') {
 NativeModules.DevSettings.toggleElementInspector();
 }
 }
 } catch (e) {}
 };

 dismissInspector();
 const t1 = setTimeout(dismissInspector, 400);
 const t2 = setTimeout(dismissInspector, 1000);

 return () => {
 clearTimeout(t1);
 clearTimeout(t2);
 };
 }
 }, []);

 const handleAdminHeaderTap = () => {
 if (activeHubView !== 'info') return;
 adminTapCountRef.current += 1;
 if (adminTapCountRef.current >= 7) {
 adminTapCountRef.current = 0;
 if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);
 setIsAdminModalVisible(true);
 return;
 }
 if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);
 adminTapTimerRef.current = setTimeout(() => {
 adminTapCountRef.current = 0;
 }, 2000);
 };

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

 // Navigation Safety Gate: Auto Kick-out if clone device locks coding features
 const isCodingAllowed = useBluetoothStore((s) => s.isCodingAllowed);
 const storeVoltage = useBluetoothStore((s) => s.voltage);
 const storeSpeed = useBluetoothStore((s) => s.speed);
 const storeRpm = useBluetoothStore((s) => s.rpm);
 const engineLoad = useBluetoothStore((s) => s.engineLoad);
 const oilTemp = useBluetoothStore((s) => s.oilTemp);
 const mafFlow = useBluetoothStore((s) => s.mafFlow);
 useEffect(() => {
 if (!isCodingAllowed && isDiagVisible) {
 setIsDiagVisible(false);
 Alert.alert(
 t('common.securityAlert'),
 t('common.cloneSafetyRedirect')
 );
 }
 }, [isCodingAllowed, isDiagVisible]);

 // RevenueCat CustomerInfo Listener for Entitlement Revocation Security
 const wasProRef = useRef<boolean>(false);

 useEffect(() => {
 const listener = async (customerInfo: any) => {
 try {
 const isSimulationMode = useAppStore.getState().isSimulationMode;
 if (__DEV__) {
 const bypass = await AsyncStorage.getItem('bypass_pro');
 if (bypass === 'true') {
 const expiryStr = await AsyncStorage.getItem('bypass_pro_expiry');
 if (expiryStr) {
 const expiryTime = parseInt(expiryStr, 10);
 if (!isNaN(expiryTime) && Date.now() < expiryTime) {
 wasProRef.current = true;
 useAppStore.getState().setIsPro(true);
 return;
 }
 } else {
 wasProRef.current = true;
 useAppStore.getState().setIsPro(true);
 return;
 }
 }
 }

 const isProActive = checkIsProStatus(customerInfo);
 const { isAtomicOperationRunning, triggerPendingRevocation, flushPendingRevocation } = useBluetoothStore.getState();

 if (!isProActive) {
 const hadActiveSubscription = wasProRef.current;
 wasProRef.current = false;

 if (isAtomicOperationRunning) {
 // Defer revocation since critical diagnostic/telemetry loop is running
 triggerPendingRevocation();
 } else {
 // Update store state
 useAppStore.getState().setIsPro(false);
 flushPendingRevocation();

 // ONLY alert if user previously had an active PRO subscription that was cancelled/refunded
 // Do NOT alert on fresh app launch, non-PRO users, or in Demo/Simulation Mode
 if (hadActiveSubscription && !isSimulationMode) {
 Alert.alert(
 t('common.revocationTitle'),
 t('common.revocationMsg')
 );
 }
 }
 } else {
 // Ensure status is Pro
 wasProRef.current = true;
 useAppStore.getState().setIsPro(true);
 // Clear pending revocation if subscription active
 flushPendingRevocation();
 }
 } catch (err) {
 // Silently mask listener callback exceptions
 console.error('[RevenueCat Background Error Masked]:', err);
 }
 };

 const registerListener = async () => {
 try {
 const configured = await Purchases.isConfigured();
 if (configured) {
 Purchases.addCustomerInfoUpdateListener(listener);
 }
 } catch (e) {
 console.warn('[RevenueCat Listener] Failed to register customer info listener:', e);
 }
 };
 registerListener();

 return () => {
 const unregisterListener = async () => {
 try {
 const configured = await Purchases.isConfigured();
 if (configured) {
 Purchases.removeCustomerInfoUpdateListener(listener);
 }
 } catch (e) {
 console.warn('[RevenueCat Listener] Failed to remove customer info listener:', e);
 }
 };
 unregisterListener();
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
 const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
 if (androidVersion >= 31) {
 const scan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
 const connect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
 btGranted = scan && connect;
 } else {
 btGranted = locGranted;
 }
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

 // Force Crashlytics & Analytics Initialization
 useEffect(() => {
 const initFirebase = async () => {
 try {
 const crash = crashlytics();
 if (crash && typeof crash.setCrashlyticsCollectionEnabled === 'function') {
 if (!crash.isCrashlyticsCollectionEnabled) {
 await crash.setCrashlyticsCollectionEnabled(true);
 }
 crash.log('App mounted and Crashlytics initialized');
 }
 } catch (e) {
 console.warn('Crashlytics init warning (handled):', e);
 }

 try {
 const ana = analytics();
 if (ana && typeof ana.setAnalyticsCollectionEnabled === 'function') {
 await ana.setAnalyticsCollectionEnabled(true);
 await ana.logEvent('app_open', {
 platform: Platform.OS,
 timestamp: new Date().toISOString()
 });
 }
 } catch (e) {
 console.warn('Analytics init warning (handled):', e);
 }
 };
 initFirebase();
 }, []);

 useEffect(() => {
 if (ecuStatus === 'connected' && !isPolling) {
 startPolling(); setIsPolling(true);
 } else if (ecuStatus !== 'connected' && isPolling) {
 stopPolling(); setIsPolling(false);
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
 t('common.simMode'),
 t('expertise.simSaveBlocked')
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
 const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
 let btOk = false;
 if (androidVersion >= 31) {
 const scan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
 const connect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
 btOk = scan && connect;
 } else {
 btOk = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
 }
 let locOk = false;
 try {
 const loc = await Location.getForegroundPermissionsAsync();
 locOk = loc.status === 'granted';
 } catch (e) {
 console.warn('Location permissions check warning:', e);
 }
 setPermissionGranted(btOk && locOk);
 } catch (err) {
 console.warn(err);
 setPermissionGranted(false);
 }
 } else {
 setPermissionGranted(true);
 }
 };

 const handleScan = async () => {
 setScannedDevices([]);

 try {
 const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
 if (!isEnabled) {
 const opened = await enableBluetooth();
 if (!opened) return;
 // Wait up to 3 seconds for it to register as enabled
 for (let i = 0; i < 6; i++) {
 if (await RNBluetoothClassic.isBluetoothEnabled()) break;
 await new Promise(r => setTimeout(r, 500));
 }
 }

 const devices = await scanDevices();
 if (devices.length > 0) {
 setScannedDevices(devices.map((d: any) => ({
 id: d.address || d.id,
 address: d.address || d.id,
 name: d.name || t('connection.unknownDevice'),
 rssi: d.rssi || 0,
 })));
 }
 } catch (e) {
 console.warn('[handleScan] Scan failed:', e);
 }
 };


 const guardAction = (action: () => void) => {
 if (ecuStatus !== 'connected' && !isSimulationMode) {
 Alert.alert(t('expertise.connRequired'), t('expertise.connRequiredDesc'));
 setActiveHubView('connection_flow');
 return;
 }
 action();
 };

 const hasFreeUsage = () => {
 return isPro || isSimulationMode || (useAppStore.getState().freeUsageCount < 3);
 };

 const handleRealConnect = (id: string, name: string) => {
 connect(id, name);
 };

 const navigateToSensors = () => {
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
 return desc ? ` • ${dtc} — ${desc}` : ` • ${dtc}`;
 }).join('\n')
 : ` ${i18n.t('report.noDtcs')}`;

 const sensorLines = [
 rpm !== null ? ` RPM: ${rpm}` : null,
 speed !== null ? ` ${i18n.t('report.speed')}: ${speed} km/h` : null,
 coolant !== null ? ` ${i18n.t('report.coolant')}: ${coolant}°C` : null,
 throttle !== null ? ` ${i18n.t('report.throttle')}: ${throttle}%` : null,
 engineLoad !== null ? ` ${i18n.t('report.engineLoad')}: ${engineLoad}%` : null,
 intakeAirTemp !== null ? ` ${i18n.t('report.intakeAir')}: ${intakeAirTemp}°C` : null,
 manifoldPressure !== null ? ` ${i18n.t('report.manifold')}: ${manifoldPressure} kPa` : null,
 voltage ? ` ${i18n.t('report.voltage')}: ${voltage}` : null,
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
${sensorLines || ` ${i18n.t('report.noData')}`}

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
 <View style={s.logoArea}>
 <Text style={s.logoText}>{t('errorBoundary.cortex')}</Text>
 <Text style={[s.logoText, { fontSize: scaleFont(14), letterSpacing: 2, marginTop: scaleHeight(2) }]}>{t('errorBoundary.obdScanner')}</Text>
 <Text style={s.logoSub}>v7 PRO {isSimulationMode ? '(SIM)' : ''}</Text>
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
 <TouchableOpacity style={s.scanBtn} onPress={handleScan} activeOpacity={0.4}>
 <Text style={s.scanBtnText}>* {t('connection.scanDevices')}</Text>
 </TouchableOpacity>

 {lastDeviceId && (
 <TouchableOpacity
 style={[s.actionBtn, s.actionCyan, { marginTop: 12, width: '100%', borderRadius: 12 }, isDiagnosticMode && { opacity: 0.5 }]}
 onPress={() => handleRealConnect(lastDeviceId, lastDeviceName || 'Last Device')}
 disabled={isDiagnosticMode}
 activeOpacity={0.4}
 >
 <Text style={[s.actionBtnText, { color: tc.card }]}>↺ {t('connection.connectLast')} ({lastDeviceName})</Text>
 </TouchableOpacity>
 )}

 <TouchableOpacity style={s.btEnableBtn} onPress={() => {
 if (Platform.OS === 'ios') {
 Alert.alert(t('common.warning'), t('connection.iosBtManual'));
 } else {
 enableBluetooth();
 }
 }} activeOpacity={0.4}>
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
 <TouchableOpacity key={d.address || d.id} style={s.deviceCard} onPress={() => handleRealConnect(d.address || d.id, d.name)} activeOpacity={0.3}>
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
 <View style={{ alignItems: 'stretch', gap: scaleMod(14), marginVertical: scaleHeight(16), width: '100%' }}>
 {/* Progress Bar Header */}
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(2) }}>
 <Text style={{ color: tc.textPri, fontFamily: MONO, fontSize: scaleFont(12), fontWeight: '900', letterSpacing: 0.5 }}>
 {t('connection.connectingECU').toUpperCase()}
 </Text>
 <Text style={{ color: tc.cyan, fontFamily: MONO, fontSize: scaleFont(14), fontWeight: '900' }}>
 %{connectionProgress}
 </Text>
 </View>

 {/* Progress Bar Line */}
 <View style={{ height: scaleHeight(8), width: '100%', backgroundColor: `${tc.border}66`, borderRadius: scaleMod(4), overflow: 'hidden' }}>
 <View style={{ height: '100%', width: `${connectionProgress}%`, backgroundColor: tc.cyan, borderRadius: scaleMod(4) }} />
 </View>

 {/* Connection Sub-status Message */}
 {connectionStatusTextKey && (
 <Text style={{ color: tc.textSec, fontFamily: MONO, fontSize: scaleFont(9.5), textAlign: 'center', marginTop: scaleHeight(2), lineHeight: scaleFont(13) }}>
 {t(connectionStatusTextKey, connectionStatusTextParams || {}) as string}
 </Text>
 )}

 {/* Steps Checklist Card */}
 <View style={{ backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(12), padding: scaleMod(14), gap: scaleMod(10) }}>
 {connectionSteps.map((step) => {
 const isIdle = step.status === 'idle';
 const isPending = step.status === 'pending';
 const isSuccess = step.status === 'success';
 const isFailed = step.status === 'failed';

 let statusIcon = '';
 let textColor = tc.textSec;
 let fontW: 'normal' | 'bold' | '900' = 'normal';

 if (isPending) {
 statusIcon = '';
 textColor = tc.amber;
 fontW = 'bold';
 } else if (isSuccess) {
 statusIcon = '';
 textColor = tc.green;
 fontW = 'bold';
 } else if (isFailed) {
 statusIcon = '';
 textColor = tc.red;
 fontW = 'bold';
 }

 return (
 <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(10) }}>
 <Text style={{ fontSize: scaleFont(12.5) }}>{statusIcon}</Text>
 <Text style={{ flex: 1, color: textColor, fontFamily: MONO, fontSize: scaleFont(10.5), fontWeight: fontW }}>
 {t(step.labelKey, step.defaultLabel).toUpperCase()}
 </Text>
 </View>
 );
 })}
 </View>
 </View>
 )}
 {ecuStatus === 'error' && (
 <View style={{ alignItems: 'center', marginVertical: 12, gap: 10, width: '100%' }}>
 <Text style={{ color: tc.red, fontFamily: MONO, fontSize: 11, fontWeight: 'bold', textAlign: 'center', lineHeight: 15 }}>
 {adapterCapabilityScore < 55 ? (
 t('connection.lowQualityAdapterWarning', { score: adapterCapabilityScore }) as string
 ) : (
 t('connection.ecuNoResponse') as string
 )}
 </Text>
 
 {adapterCapabilityScore >= 55 && (
 <Text style={{ color: tc.textSec, fontFamily: MONO, fontSize: 10, textAlign: 'center' }}>
 {t('connection.hardwareCapabilityScore', { score: adapterCapabilityScore })}
 </Text>
 )}

 <TouchableOpacity style={s.retryBtn} onPress={retryEcu}>
 <Text style={s.retryBtnText}>{t('connection.retry')}</Text>
 </TouchableOpacity>

 <TouchableOpacity 
 style={[s.retryBtn, { backgroundColor: tc.cyan, marginTop: 8 }]} 
 onPress={() => {
 if (!isSimulationMode) {
 toggleSimulationMode();
 }
 setActiveHubView('hub');
 }}
 >
 <Text style={s.retryBtnText}> {t('common.demoMode').toUpperCase()}</Text>
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

 // Contextual ASO copywriting: dynamic persuasion text based on DTC system group
 const getContextualDtcDesc = (dtcCode: string): string => {
 const upper = dtcCode.toUpperCase();
 const prefix = upper.charAt(0);
 const subGroup = upper.substring(1, 3);
 switch (prefix) {
 case 'P':
 if (subGroup === '01') return t('dtcContext.cooling');
 if (subGroup === '03') return t('dtcContext.ignition');
 return t('dtcContext.powertrain');
 case 'C':
 return t('dtcContext.chassis');
 case 'B':
 return t('dtcContext.body');
 case 'U':
 return t('dtcContext.network');
 default:
 return t('dtcContext.fallback');
 }
 };
 
 return (
 <View style={{ flex: 1, gap: isCompact ? scaleHeight(8) : scaleHeight(16) }}>
 {/* VIN History Alert */}
 {vinHistory.length > 0 && (
 <View style={[s.warningBanner, { borderColor: tc.cyan, backgroundColor: `${tc.cyan}14`, padding: scaleMod(8), marginBottom: 0 }]}>
 <Text style={[s.warningIcon, { fontSize: isCompact ? scaleFont(14) : scaleFont(18) }]}></Text>
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
 <Text style={{ fontSize: isCompact ? scaleFont(11) : scaleFont(13), marginRight: scaleWidth(6) }}></Text>
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
 {isDiagnosticMode ? t('expertise.scanning') : ` ${t('expertise.startScan')}`}
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
 <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
 <View style={[s.panelHeader, { marginBottom: isCompact ? scaleHeight(4) : scaleHeight(8) }]}>
 <Text style={[s.panelTitle, { marginBottom: 0, fontSize: titleSz }]}>{t('expertise.dtcTitle')}</Text>
 </View>
 {dtcs.length === 0 ? (
 isCompact ? (
 <View style={[s.cleanBadge, { paddingVertical: scaleHeight(6) }]}>
 <Text style={[s.cleanBadgeText, { fontSize: scaleFont(10) }]}> {t('expertise.dtcClean')}</Text>
 </View>
 ) : (
 <View style={{ flex: 1, gap: scaleHeight(8), justifyContent: 'center' }}>
 <View style={[s.cleanBadge, { paddingVertical: scaleHeight(12), marginBottom: scaleHeight(4) }]}>
 <Text style={[s.cleanBadgeText, { fontSize: scaleFont(12) }]}> {t('expertise.dtcClean')}</Text>
 </View>
 <Text style={{ fontSize: scaleFont(9.5), fontWeight: '800', color: tc.textSec, letterSpacing: 1.5, marginBottom: scaleHeight(4), fontFamily: MONO }}>
 {t('expertise.scannedModules').toUpperCase()}
 </Text>
 <View style={{ gap: scaleHeight(6), backgroundColor: `${tc.green}0A`, borderWidth: 1, borderColor: `${tc.green}26`, borderRadius: 8, padding: scaleMod(10) }}>
 {[
 { name: t('expertise.moduleEngine'), status: 'OK' },
 { name: t('expertise.moduleAbs'), status: 'OK' },
 { name: t('expertise.moduleTcm'), status: 'OK' },
 { name: t('expertise.moduleBcm'), status: 'OK' },
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
 const isPro = useAppStore.getState().isPro;
 const displayDesc = isPro ? desc : getContextualDtcDesc(dtc);
 return (
 <TouchableOpacity
 key={i}
 style={[s.dtcRow, { paddingVertical: scaleHeight(8), marginBottom: 0 }]}
 onPress={() => {
 if (!isPro) {
 setIsPaywallVisible(true);
 } else {
 handleOpenDtcDetail(dtc);
 }
 }}
 >
 <View style={s.dtcDot} />
 <View style={{ flex: 1 }}>
 <Text style={[s.dtcCode, { fontSize: scaleFont(11) }]}>{dtc}</Text>
 <Text style={{ color: isPro ? tc.red : tc.amber, opacity: isPro ? 0.85 : 0.95, fontSize: scaleFont(9), fontFamily: MONO, marginTop: scaleHeight(1), paddingBottom: Platform.OS === 'ios' ? 2 : 0, lineHeight: scaleFont(12), fontWeight: isPro ? '400' : '600' }}>
 {displayDesc}
 </Text>
 </View>
 </TouchableOpacity>
 );
 })
 ) : (
 <View style={{ gap: scaleHeight(4) }}>
 {dtcs.map((dtc, i) => {
 const desc = lookupDTC(dtc);
 const isPro = useAppStore.getState().isPro;
 const displayDesc = isPro ? desc : getContextualDtcDesc(dtc);
 return (
 <TouchableOpacity
 key={i}
 style={[s.dtcRow, { paddingVertical: scaleHeight(8), marginBottom: 0 }]}
 onPress={() => {
 if (!isPro) {
 setIsPaywallVisible(true);
 } else {
 handleOpenDtcDetail(dtc);
 }
 }}
 >
 <View style={s.dtcDot} />
 <View style={{ flex: 1 }}>
 <Text style={[s.dtcCode, { fontSize: scaleFont(10) }]}>{dtc}</Text>
 <Text style={{ color: isPro ? tc.red : tc.amber, opacity: isPro ? 0.85 : 0.95, fontSize: scaleFont(8), fontFamily: MONO, marginTop: scaleHeight(1), paddingBottom: Platform.OS === 'ios' ? 2 : 0, lineHeight: scaleFont(11), fontWeight: isPro ? '400' : '600' }}>
 {displayDesc}
 </Text>
 </View>
 </TouchableOpacity>
 );
 })}
 </View>
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
 {/* Secondary Actions (4 Extra Actions Grid) */}
 <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
 <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(6) : scaleHeight(10), fontSize: titleSz }]}>{t('expertise.extraActions')}</Text>

 <View style={{ gap: isCompact ? scaleHeight(6) : scaleHeight(8) }}>
 {isCompact ? (
 <>
 <View style={{ flexDirection: 'row', gap: scaleWidth(6) }}>
 <TouchableOpacity
 style={[s.miniAction, { flex: 1, backgroundColor: tc.purple, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
 onPress={() => proGuardAction(() => setIsFreezeFrameVisible(true))}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>{t('freeze.title')}</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[s.miniAction, { flex: 1, backgroundColor: tc.amber, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
 onPress={() => proGuardAction(() => setIsBatteryTestVisible(true))}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>{t('battery.title')}</Text>
 </TouchableOpacity>
 </View>

 <View style={{ flexDirection: 'row', gap: scaleWidth(6) }}>
 <TouchableOpacity
 style={[s.miniAction, { flex: 1, backgroundColor: tc.cyan, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
 onPress={() => proGuardAction(() => setIsPerformanceVisible(true))}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>{t('perf.title')}</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[s.miniAction, { flex: 1, backgroundColor: tc.red, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
 onPress={() => proGuardAction(handleServiceRoutine)}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>{t('service.ecuReset')}</Text>
 </TouchableOpacity>
 </View>
 </>
 ) : (
 <>
 <TouchableOpacity
 style={[s.miniAction, { backgroundColor: tc.purple, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
 onPress={() => proGuardAction(() => setIsFreezeFrameVisible(true))}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>{t('freeze.title')}</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[s.miniAction, { backgroundColor: tc.amber, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
 onPress={() => proGuardAction(() => setIsBatteryTestVisible(true))}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>{t('battery.title')}</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[s.miniAction, { backgroundColor: tc.cyan, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
 onPress={() => proGuardAction(() => setIsPerformanceVisible(true))}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>{t('perf.title')}</Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={[s.miniAction, { backgroundColor: tc.red, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
 onPress={() => proGuardAction(handleServiceRoutine)}
 >
 <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>{t('service.ecuReset')}</Text>
 </TouchableOpacity>
 </>
 )}
 </View>
 </View>

  {/* Separate Bottom Panel: OBD2 Capabilities & Compatibility Matrix */}
  <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        s.actionBtn, 
        { 
          backgroundColor: tc.cyan, 
          paddingVertical: isCompact ? scaleHeight(10) : scaleHeight(12), 
          borderRadius: 8, 
          marginVertical: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }
      ]}
      onPress={() => setActiveHubView('obd_health')}
    >
      <Text style={[s.actionBtnText, { color: '#ffffff', fontSize: isCompact ? scaleFont(9.5) : scaleFont(11), fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 }]}>
        {t('health.titleMenu', { defaultValue: 'OBD2 YETENEKLERİ & UYUMLULUK MATRİSİ' })}
      </Text>
    </TouchableOpacity>
  </View>


 </View>
 );
 };

 if (isTablet) {
 return (
 <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
 <View style={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(24), paddingTop: scaleHeight(8), alignSelf: 'center', width: '100%', maxWidth: isLargeTablet ? 900 : 720 }}>
 <View style={{ flexDirection: 'row', gap: scaleMod(16), marginBottom: scaleHeight(16) }}>
 {renderLeftColumn(false)}
 {renderRightColumn(false)}
 </View>
 <ChronicFaultsWidget />
 
 </View>
 </ScrollView>
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
 await clearDiagnostics();
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
 const renderInfo = () => {
 return (
 <AboutView
 infoBtStatus={infoBtStatus}
 infoLocStatus={infoLocStatus}
 onReconfigurePermissions={() => {
 useAppStore.getState().setHasOnboarded(false);
 }}
 onAccordionToggle={(section) => {
 setExpandedInfoSection(section);
 }}
 />
 );
 };

 const renderVehicleConnectionCard = () => {
 const isConnected = ecuStatus === 'connected';
 const vehicleName = activeSessionVehicle
 ? `${getLocalizedVehicleBrand(activeSessionVehicle.brand, t)} ${getLocalizedVehicleModel(activeSessionVehicle.model)}`
 : null;

 return (
 <View style={{ gap: scaleHeight(10), marginBottom: scaleHeight(2) }}>
 {/* ── ECU'YA BAĞLAN Button Card ── */}
 <TouchableOpacity
 style={{
 backgroundColor: colors.card,
 borderWidth: 2.2,
 borderColor: isConnected ? colors.green : colors.cyan,
 borderRadius: scaleMod(16),
 paddingHorizontal: scaleMod(18),
 paddingVertical: scaleHeight(24),
 alignItems: 'center',
 justifyContent: 'center',
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.06,
 shadowRadius: 6,
 elevation: 3,
 }}
 onPress={() => setActiveHubView('connection_flow')}
 activeOpacity={0.7}
 >
 <Text
 allowFontScaling={false}
 numberOfLines={1}
 adjustsFontSizeToFit
 minimumFontScale={0.8}
 style={{
 color: isConnected ? colors.green : colors.cyan,
 fontSize: scaleFont(13.5),
 fontFamily: MONO,
 fontWeight: '900',
 letterSpacing: 1,
 }}
 >
 {t('vehicleSelect.connectDevice').toUpperCase()}
 </Text>
 </TouchableOpacity>

 {/* ── KAYITLI ARAÇLARIM Button Card ── */}
 <TouchableOpacity
 style={{
 backgroundColor: colors.card,
 borderWidth: 2.2,
 borderColor: colors.purple,
 borderRadius: scaleMod(16),
 paddingHorizontal: scaleMod(18),
 paddingVertical: scaleHeight(15),
 alignItems: 'center',
 justifyContent: 'center',
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.06,
 shadowRadius: 6,
 elevation: 3,
 }}
 onPress={() => setActiveHubView('vehicle')}
 activeOpacity={0.7}
 >
 <Text
 allowFontScaling={false}
 numberOfLines={1}
 adjustsFontSizeToFit
 minimumFontScale={0.8}
 style={{
 color: colors.purple,
 fontSize: scaleFont(12.5),
 fontFamily: MONO,
 fontWeight: '900',
 letterSpacing: 1,
 }}
 >
 {t('vehicleSelect.registeredVehiclesButton').toUpperCase()}
 </Text>
 </TouchableOpacity>

 {/* ── Connection Status / Warning Pills ── */}
 <View
 style={{
 flexDirection: 'row',
 flexWrap: 'wrap',
 alignItems: 'center',
 justifyContent: 'center',
 gap: scaleMod(6),
 paddingVertical: scaleHeight(4),
 }}
 >
 {/* Connection status pill */}
 <View style={{
 flexDirection: 'row',
 alignItems: 'center',
 gap: scaleMod(4),
 backgroundColor: isConnected ? `${colors.green}18` : `${colors.red}18`,
 borderRadius: scaleMod(20),
 paddingHorizontal: scaleMod(10),
 paddingVertical: scaleHeight(5),
 }}>
 <View style={{ width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3), backgroundColor: isConnected ? colors.green : colors.red }} />
 <Text allowFontScaling={false} numberOfLines={1} style={{ color: isConnected ? colors.green : colors.red, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: '800' }}>
 {isConnected ? t('dashboard.connectedDevice') : t('common.disconnected')}
 </Text>
 </View>

 {/* Selected Vehicle Info - If not connected but a vehicle is selected, or if connected */}
 {vehicleName && (
 <View style={{
 flexDirection: 'row',
 alignItems: 'center',
 gap: scaleMod(4),
 backgroundColor: `${colors.cyan}12`,
 borderRadius: scaleMod(20),
 paddingHorizontal: scaleMod(10),
 paddingVertical: scaleHeight(5),
 }}>
 <Text allowFontScaling={false} numberOfLines={1} style={{ color: colors.cyan, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: '800' }}>
 {vehicleName.toUpperCase()}
 </Text>
 </View>
 )}

 {/* DTC chip — only when connected */}
 {isConnected && (
 <View style={{
 flexDirection: 'row',
 alignItems: 'center',
 gap: scaleMod(4),
 backgroundColor: dtcs.length > 0 ? `${colors.red}18` : `${colors.green}18`,
 borderRadius: scaleMod(20),
 paddingHorizontal: scaleMod(10),
 paddingVertical: scaleHeight(5),
 }}>
 <Text allowFontScaling={false} numberOfLines={1} style={{ color: dtcs.length > 0 ? colors.red : colors.green, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: '800' }}>
 {dtcs.length > 0 ? `${dtcs.length} DTC` : t('bento.noDtc')}
 </Text>
 </View>
 )}

 {/* Odometer chip */}
 {isConnected && odometer && odometer !== 'UNSUPPORTED' && (
 <View style={{
 flexDirection: 'row',
 alignItems: 'center',
 gap: scaleMod(4),
 backgroundColor: `${colors.amber}18`,
 borderRadius: scaleMod(20),
 paddingHorizontal: scaleMod(10),
 paddingVertical: scaleHeight(5),
 }}>
 <Text allowFontScaling={false} numberOfLines={1} style={{ color: colors.amber, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: '800' }}>{odometer} km</Text>
 </View>
 )}

 {/* Auto Hardware Health Info: Quality score */}
 {isConnected && (
 <View style={{
 flexDirection: 'row',
 alignItems: 'center',
 gap: scaleMod(4),
 backgroundColor: isCloneDevice ? `${colors.red}12` : `${colors.green}12`,
 borderRadius: scaleMod(20),
 paddingHorizontal: scaleMod(10),
 paddingVertical: scaleHeight(5),
 }}>
 <Text allowFontScaling={false} numberOfLines={1} style={{ color: isCloneDevice ? colors.red : colors.green, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: '800' }}>
 {isCloneDevice ? t('dashboard.adapterCloneShort') : t('dashboard.adapterOriginalShort')} {adapterCapabilityScore}%
 </Text>
 </View>
 )}

 {/* Auto Hardware Health Info: Connected Protocol */}
 {isConnected && protocol && (
 <View style={{
 flexDirection: 'row',
 alignItems: 'center',
 gap: scaleMod(4),
 backgroundColor: `${colors.purple}12`,
 borderRadius: scaleMod(20),
 paddingHorizontal: scaleMod(10),
 paddingVertical: scaleHeight(5),
 maxWidth: scaleWidth(185),
 }}>
 <Text allowFontScaling={false} numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.purple, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: '800' }}>
 {protocol === 'SIMULATED_OBD' ? 'CAN BUS (DEMO)' : protocol.replace(/_/g, ' ')}
 </Text>
 </View>
 )}
 </View>
 </View>
 );
 };


 // ===============================================================
 // MAIN RENDER (Bento Box / Glassmorphism Paradigm)
 // ===============================================================
 if (!hasOnboarded) {
 return <PermissionGateway />;
 }

 const isLightMode = true;

 return (
 <BluetoothBridgeInitializer>
 <View style={{ flex: 1, backgroundColor: colors.bg }}>
 <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
 <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

 <View style={{ flex: 1 }}>
 {/* Top Header Bar */}
 <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
 <View style={s.topLeft}>
 <Text style={[
 s.topLogo,
 {
 color: colors.cyan,
 fontSize: isPhone ? (isSimulationMode ? scaleFont(10.5) : scaleFont(11.5)) : scaleFont(13),
 letterSpacing: 0.5
 }
 ]}>CORTEX OBD2 {isSimulationMode ? 'SIM' : ''}</Text>
 <View style={[s.topBadge, { borderColor: statusColor(ecuStatus) }]}>
 <View style={[s.topBadgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
 <Text style={[s.topBadgeText, { color: statusColor(ecuStatus) }]}>
 {isPhone ? "BLE" : (ecuStatus === 'connected' ? t('hub.bleConnected') : t('hub.bleIdle'))}
 </Text>
 </View>
 </View>
 <View style={s.topRight}>
 {(ecuStatus === 'connected' || isSimulationMode) && (
 <TouchableOpacity 
 onPress={() => {
 if (isSimulationMode) {
 toggleSimulationMode();
 } else {
 disconnect();
 }
 }} 
 style={{ 
 paddingHorizontal: 10, 
 paddingVertical: 5, 
 backgroundColor: `${colors.red}1F`, 
 borderRadius: 12, 
 borderWidth: 1.2, 
 borderColor: colors.red 
 }}
 activeOpacity={0.6}
 >
 <Text style={[s.topDisconnect, { color: colors.red, fontFamily: MONO, fontWeight: '900', fontSize: scaleFont(9.5) }]}>
 {t('bento.safeDisconnect').toUpperCase()}
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
 {t('connection.safeModeActive')}
 </Text>
 </View>
 )}

 {/* Central Hub View vs Sub-Views */}
 {activeHubView === 'hub' ? (
 isTablet ? (
 <ScrollView
 style={{ flex: 1 }}
 contentContainerStyle={{
 flexGrow: 1,
 paddingHorizontal: scaleWidth(16),
 paddingTop: scaleHeight(8),
 alignSelf: 'center',
 width: '100%',
 maxWidth: 720,
 justifyContent: 'space-between',
 paddingBottom: scaleHeight(24)
 }}
 showsVerticalScrollIndicator={false}
 >
 <View style={{ width: '100%', gap: scaleHeight(12), marginTop: scaleHeight(8) }}>
 {renderVehicleConnectionCard()}

 <View style={{ marginTop: scaleHeight(4) }}>
 <Text style={{ fontSize: scaleFont(12), fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: scaleHeight(8), marginTop: scaleHeight(2), fontFamily: MONO }}>
 {t('hub.controlHub').toUpperCase()}
 </Text>
 <BentoGrid
 onOpenDiagnostics={() => setActiveHubView('expertise')}
 onOpenSensors={() => navigateToSensors()}
 onOpenProfile={() => setActiveHubView('info')}
 onOpenSettings={() => setActiveHubView('settings')}
 onOpenPaywall={() => setIsPaywallVisible(true)}
 onOpenSupport={handleSupportEmail}
 onShareApp={handleShareApp}
 onDisconnect={disconnect}
 onOpenHpGauge={() => setActiveHubView('hp_gauge')}
 onOpenFuelTrim={() => setActiveHubView('fuel_trim')}
 onOpenDpf={() => setActiveHubView('dpf')}
 onOpenMultiEcu={() => setActiveHubView('multi_ecu')}
 onOpenDct={() => setActiveHubView('dct')}
 onSafeDisconnect={() => ObdService.safeDisconnect(sendCommand, disconnect)}
 onOpenConnect={() => setActiveHubView('connection_flow')}
 onOpenFeatureActivation={() => setActiveHubView('feature_coding')}
 />
 </View>
 </View>

 {/* Version and Disclaimer at main dashboard bottom */}
 <View style={{ alignItems: 'center', marginTop: scaleHeight(20), gap: scaleHeight(4), width: '100%' }}>
 <Text style={{
 color: colors.textSec,
 fontFamily: MONO,
 fontSize: scaleFont(7),
 textAlign: 'center',
 opacity: 0.65,
 lineHeight: scaleFont(11),
 paddingHorizontal: scaleWidth(20),
 }}>
 {t('disclaimer')}
 </Text>
 </View>
 </ScrollView>
 ) : (
 <ScrollView
 style={{ flex: 1 }}
 contentContainerStyle={{
 flexGrow: 1,
 paddingHorizontal: scaleWidth(16),
 paddingBottom: isSmallPhone ? scaleHeight(8) : scaleHeight(16),
 paddingTop: isSmallPhone ? scaleHeight(2) : scaleHeight(8),
 justifyContent: 'space-between',
 }}
 showsVerticalScrollIndicator={false}
 >
 <View style={{ width: '100%', gap: scaleHeight(12), marginTop: scaleHeight(8) }}>
 {renderVehicleConnectionCard()}

 <View style={{ width: '100%' }}>
 <Text style={{ fontSize: isSmallPhone ? scaleFont(9) : scaleFont(11), fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: scaleHeight(6), fontFamily: MONO }}>
 {t('hub.controlHub').toUpperCase()}
 </Text>
 <BentoGrid
 onOpenDiagnostics={() => setActiveHubView('expertise')}
 onOpenSensors={() => navigateToSensors()}
 onOpenProfile={() => setActiveHubView('info')}
 onOpenSettings={() => setActiveHubView('settings')}
 onOpenPaywall={() => setIsPaywallVisible(true)}
 onOpenSupport={handleSupportEmail}
 onShareApp={handleShareApp}
 onDisconnect={disconnect}
 onOpenHpGauge={() => setActiveHubView('hp_gauge')}
 onOpenFuelTrim={() => setActiveHubView('fuel_trim')}
 onOpenDpf={() => setActiveHubView('dpf')}
 onOpenMultiEcu={() => setActiveHubView('multi_ecu')}
 onOpenDct={() => setActiveHubView('dct')}
 onSafeDisconnect={() => ObdService.safeDisconnect(sendCommand, disconnect)}
 onOpenConnect={() => setActiveHubView('connection_flow')}
 onOpenFeatureActivation={() => setActiveHubView('feature_coding')}
 />
 </View>
 </View>

 {/* 3. Disclaimer at main dashboard bottom */}
 <View style={{ alignItems: 'center', gap: scaleHeight(2), width: '100%' }}>
 <Text style={{
 color: colors.textSec,
 fontFamily: MONO,
 fontSize: scaleFont(6.8),
 textAlign: 'center',
 opacity: 0.65,
 lineHeight: scaleFont(10),
 paddingHorizontal: scaleWidth(10),
 }}>
 {t('disclaimer')}
 </Text>
 </View>
 </ScrollView>
 )
 ) : (
 <View style={{ flex: 1 }}>
 {/* Prominent Hub Navigation Header */}
 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8, zIndex: 100, elevation: 100, position: 'relative' }}>
 <TouchableOpacity
 style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingEnd: 12, zIndex: 110, elevation: 110 }}
 onPress={() => {
 console.log('[App] Back to Hub pressed!');
 setIsCustomizeModalVisible(false);
 setIsPaywallVisible(false);
 setIsAdminModalVisible(false);
 setIsDiagVisible(false);
 setIsBatteryTestVisible(false);
 setIsFreezeFrameVisible(false);
 setIsPerformanceVisible(false);
 setIsSaveModalVisible(false);
 setIsIgnitionModalVisible(false);
 useBluetoothStore.getState().clearPaywallContext();
 setActiveHubView('hub');
 }}
 activeOpacity={0.6}
 delayPressIn={0}
 hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
 >
 <Text style={{ color: colors.cyan, fontSize: 18, fontWeight: '900' }}>←</Text>
 <Text numberOfLines={1} style={{ color: colors.textPri, fontSize: 13, fontWeight: '800', fontFamily: MONO }}>
 {t('hub.backToHub')}
 </Text>
 </TouchableOpacity>
 {activeHubView !== 'connection_flow' && activeHubView !== 'obd_health' && (
 <TouchableOpacity
 onPress={handleAdminHeaderTap}
 activeOpacity={activeHubView === 'info' ? 0.6 : 1}
 style={{ flex: 1, alignItems: 'flex-end' }}
 >
 <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.textSec, fontSize: 11, fontFamily: MONO, textAlign: 'right' }}>
 {activeHubView === 'sensors' ? t('hub.liveSensorsView') 
 : activeHubView === 'expertise' ? t('hub.diagnosticsView') 
 : activeHubView === 'settings' ? t('bento.quickSettings') 
 : activeHubView === 'vehicle' ? t('vehicleSelect.titleMenu') 
 : activeHubView === 'hp_gauge' ? t('bento.hpGauge') 
 : activeHubView === 'fuel_trim' ? t('bento.fuelTrim') 
 : activeHubView === 'dpf' ? t('bento.dpfFilter') 
 : activeHubView === 'multi_ecu' ? t('bento.multiEcu') 
 : activeHubView === 'dct' ? t('bento.dctAdapt') 
 : activeHubView === 'feature_coding' ? t('bento.featureActivation')
 : t('hub.vehicleProfileView')}
 </Text>
 </TouchableOpacity>
 )}
 </View>

 {/* Sub-view Content */}
 <View style={{ flex: 1 }}>
 {activeHubView === 'sensors' && (
 <DashboardSpeedometer 
 ecuStatus={ecuStatus} 
 lastDeviceName={lastDeviceName} 
 onGoToExpertise={() => setActiveHubView('expertise')}
 onOpenCustomize={() => setIsCustomizeModalVisible(true)}
 />
 )}
 {activeHubView === 'expertise' && renderExpertise()}
 {activeHubView === 'info' && renderInfo()}
 {activeHubView === 'feature_coding' && (
 <FeatureActivationModal
 visible={true}
 onClose={handleCloseSubView}
 connectedVehicleMake={activeSessionBrand}
 onOpenPaywall={() => setIsPaywallVisible(true)}
 />
 )}
 {activeHubView === 'hp_gauge' && (
 <HorsepowerModal
 visible={true}
 onClose={() => setActiveHubView('hub')}
 rpm={storeRpm || 0}
 mafGps={mafFlow || 0}
 engineTorqueNm={0}
 calculatedLoadPct={engineLoad || 0}
 />
 )}
 {activeHubView === 'fuel_trim' && (
 <FuelTrimModal
 visible={true}
 onClose={() => setActiveHubView('hub')}
 stftBank1Pct={0}
 ltftBank1Pct={0}
 />
 )}
 {activeHubView === 'dpf' && (
 <DpfMonitorModal
 visible={true}
 onClose={() => setActiveHubView('hub')}
 />
 )}
 {activeHubView === 'multi_ecu' && (
 <MultiEcuScanModal
 visible={true}
 onClose={() => setActiveHubView('hub')}
 />
 )}
 {activeHubView === 'dct' && (
 <DctResetModal
 visible={true}
 onClose={() => setActiveHubView('hub')}
 transmissionOilTempC={oilTemp || 55}
 />
 )}
 {activeHubView === 'connection_flow' && (
 <ConnectionFlowScreen
 onBack={() => setActiveHubView('hub')}
 onNavigateToHealth={() => setActiveHubView('obd_health')}
 />
 )}
 {activeHubView === 'obd_health' && (
 <ObdHealthScreen
 onBack={() => setActiveHubView('expertise')}
 />
 )}
 {activeHubView === 'settings' && (
 <SettingsView
 disconnect={disconnect}
 setActiveHubView={setActiveHubView}
 s={s}
 />
 )}
 {activeHubView === 'vehicle' && (
 <LiveEngineHero
 onConnectPress={() => {
 const isConnected = ecuStatus === 'connected';
 if (isConnected) {
 disconnect();
 } else {
 setActiveHubView('vehicle');
 }
 }}
 onGoToSensors={() => navigateToSensors()}
 onGoToExpertise={() => setActiveHubView('expertise')}
 onOpenDiag={() => setIsDiagVisible(true)}
 status={status}
 connectionState={connectionState}
 ecuStatus={ecuStatus}
 adapterStatus={adapterStatus}
 scannedDevices={scannedDevices}
 handleScan={handleScan}
 handleRealConnect={handleRealConnect}
 disconnect={disconnect}
 enableBluetooth={enableBluetooth}
 lastDeviceId={lastDeviceId}
 lastDeviceName={lastDeviceName}
 retryEcu={retryEcu}
 permissionGranted={permissionGranted}
 />
 )}
 </View>
 </View>
 )}



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
 <View style={s.cleanBadge}><Text style={s.cleanBadgeText}> {t('expertise.clean')}</Text></View>
 ) : (
 selectedRecord.dtcs.map((dtc, i) => {
 const desc = lookupDTC(dtc);
 return (
 <View key={i} style={s.dtcRow}>
 <View style={s.dtcDot} />
 <View style={{ flex: 1 }}>
 <Text style={s.dtcCode}>{dtc}</Text>
 {desc && <Text style={{ color: colors.red, opacity: 0.8, fontSize: 10, fontFamily: MONO, marginTop: 2, paddingBottom: Platform.OS === 'ios' ? 2 : 0, lineHeight: 14 }}>{desc}</Text>}
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
 <BatteryTestModal
 visible={isBatteryTestVisible}
 onClose={() => setIsBatteryTestVisible(false)}
 sendCommand={sendCommand}
 voltage={storeVoltage}
 />

 {/* Freeze Frame Modal */}
 <FreezeFrameModal
 visible={isFreezeFrameVisible}
 onClose={() => setIsFreezeFrameVisible(false)}
 sendCommand={sendCommand}
 hasDtcs={dtcs.length > 0}
 />

 {/* Performance Modal */}
 <PerformanceModal
 visible={isPerformanceVisible}
 onClose={() => setIsPerformanceVisible(false)}
 speed={storeSpeed}
 />



 {/* DTC Detail Modal */}
 {renderDtcDetailModal()}

 {/* Paywall Modal Overlay */}
 <Paywall
 visible={isPaywallVisible}
 onClose={() => setIsPaywallVisible(false)}
 />

 {/* Contextual Paywall Modal */}
 <ContextualPaywallModal />

 {/* DIAG Modal */}
 <Modal
 visible={isDiagVisible}
 animationType="slide"
 transparent={false}
 onRequestClose={() => setIsDiagVisible(false)}
 >
 <View style={{ flex: 1, backgroundColor: colors.bg }}>
 <DashboardSandbox
 onClose={() => setIsDiagVisible(false)}
 />
 </View>
 </Modal>

 {/* Secret Admin & OBD Terminal Modal */}
 <AdminSecretModal
 visible={isAdminModalVisible}
 onClose={() => setIsAdminModalVisible(false)}
 />

 {/* 1. Ignition Warning Modal */}
 <IgnitionWarningModal
 visible={isIgnitionModalVisible}
 onClose={() => setIsIgnitionModalVisible(false)}
 onRetry={retryEcu}
 voltageV={parseFloat(storeVoltage || '0') || 0}
 />

 {/* AI Doctor Diagnostic Modal */}
 <AiDoctorModal
 visible={isAiDoctorModalVisible}
 onClose={() => setIsAiDoctorModalVisible(false)}
 context={aiDoctorContext}
 />

 {/* Customize Dashboard Modal */}
 <CustomizeDashboardModal
 visible={isCustomizeModalVisible}
 onClose={() => setIsCustomizeModalVisible(false)}
 onOpenPaywall={() => setIsPaywallVisible(true)}
 />
 </View>
 </SafeAreaView>
 </View>
 </BluetoothBridgeInitializer>
 );
}

function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
 const { t } = useTranslation();
 return (
 <View style={{ flex: 1, backgroundColor: '#090d16', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
 <Text style={{ color: '#ff4444', fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>{t('errorBoundary.systemRecovery')}</Text>
 <Text style={{ color: '#88a0c0', textAlign: 'center', marginBottom: 12 }}>
 {t('errorBoundary.unexpectedError')}
 </Text>
 {error?.message && (
 <View style={{ width: '100%', backgroundColor: '#111827', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#1f2937' }}>
 <Text style={{ color: '#f87171', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
 {error.message}
 </Text>
 </View>
 )}
 <TouchableOpacity
 onPress={resetErrorBoundary}
 style={{ backgroundColor: '#00e5ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
 >
 <Text style={{ color: '#000000', fontWeight: 'bold' }}>{t('errorBoundary.retryApp')}</Text>
 </TouchableOpacity>
 </View>
 );
}
