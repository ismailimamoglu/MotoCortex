import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useBluetooth } from '../../hooks/useBluetooth';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import OBDCommandQueue from '../../api/OBDCommandQueue';
import VehicleConfirmationModal from './VehicleConfirmationModal';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface DiscoveredDevice {
  id: string;
  name: string;
}

interface DashboardSandboxProps {
  onClose?: () => void;
}

export default function DashboardSandbox({ onClose }: DashboardSandboxProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();

  // ─── Single Connection Hook (Singleton Delegator) ────────────────────────
  const {
    status: connectionStatus,
    ecuStatus,
    connect,
    disconnect,
    scanDevices,
    startPolling,
    stopPolling,
    isCloneDevice,
    protocol,
    adapterCapabilityScore,
    runDiagnostics,
    clearDiagnostics,
    sendCommand,
  } = useBluetooth();

  const rpm = useBluetoothStore((s) => s.rpm);
  const speed = useBluetoothStore((s) => s.speed);
  const coolant = useBluetoothStore((s) => s.coolant);
  const throttle = useBluetoothStore((s) => s.throttle);
  const telemetryStats = useBluetoothStore((s) => s.telemetryStats);
  const dtcs = useBluetoothStore((s) => s.dtcs);
  
  // Suggested Profile from VIE
  const suggestedVehicleProfile = useBluetoothStore((s) => s.suggestedVehicleProfile);
  const setSuggestedVehicleProfile = useBluetoothStore((s) => s.setSuggestedVehicleProfile);

  // OEM Feature Activation Modal State
  const [isFeatureModalVisible, setIsFeatureModalVisible] = useState(false);

  // FPS Tracker
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Format Status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return t('sandbox.connected');
      case 'connecting':
        return t('sandbox.connecting');
      case 'error':
        return t('sandbox.error');
      default:
        return t('sandbox.notConnected');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return colors.green;
      case 'connecting':
        return colors.amber;
      case 'error':
        return colors.red;
      default:
        return colors.textSec;
    }
  };

  // ─── Transient Subscription Pattern for Logs ─────────────────────────────
  const [isPaused, setIsPaused] = useState(false);
  const [logSnapshot, setLogSnapshot] = useState<string[]>(() => useBluetoothStore.getState().logs.slice(-50));
  const isPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    let lastLen = 0;
    const unsubscribe = useBluetoothStore.subscribe((state) => {
      if (!isPausedRef.current && state.logs.length !== lastLen) {
        lastLen = state.logs.length;
        setLogSnapshot(state.logs.slice(-50));
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── Custom Scan & Telemetry States ──────────────────────────────────────
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isStressActive, setIsStressActive] = useState(false);
  const stressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanning = async () => {
    setIsScanning(true);
    try {
      const devices = await scanDevices();
      setDiscoveredDevices(
        devices.map((d: any) => ({
          id: d.id,
          name: d.name || '',
        }))
      );
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const startTelemetry = (pids: string[], intervalMs: number) => {
    if (stressIntervalRef.current) {
      clearInterval(stressIntervalRef.current);
    }
    stopPolling();
    setIsStressActive(true);
    let commandInProgress = false;

    stressIntervalRef.current = setInterval(async () => {
      if (commandInProgress) return;
      commandInProgress = true;
      for (const pid of pids) {
        try {
          await OBDCommandQueue.add(`01 ${pid}`, 200);
        } catch (err) {
          // Silent catch
        }
      }
      commandInProgress = false;
    }, intervalMs);
  };

  const stopTelemetry = () => {
    if (stressIntervalRef.current) {
      clearInterval(stressIntervalRef.current);
      stressIntervalRef.current = null;
    }
    setIsStressActive(false);
    if (connectionStatus === 'connected') {
      startPolling();
    }
  };

  const performTeardown = async () => {
    stopTelemetry();
    await disconnect();
  };

  useEffect(() => {
    return () => {
      if (stressIntervalRef.current) {
        clearInterval(stressIntervalRef.current);
      }
    };
  }, []);

  // ─── Ad-Hoc Command Transmission ─────────────────────────────────────────
  const [inputCommand, setInputCommand] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendCommand = async () => {
    if (!inputCommand.trim() || isSending) return;
    const cmd = inputCommand.toUpperCase().trim();
    setInputCommand('');
    setIsSending(true);

    useBluetoothStore.getState().addLog(`TX: ${cmd}`);

    try {
      const response = await sendCommand(cmd);
      const resText = response || 'NO RESPONSE';
      useBluetoothStore.getState().addLog(`RX: ${resText}`);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('DEVICE_NOT_CONNECTED')) {
        useBluetoothStore.getState().addLog(`ERROR: [NOT CONNECTED] Please connect to OBD adapter first!`);
      } else if (errMsg.includes('BLOCK_COMMAND_VEHICLE_IN_MOTION') || errMsg.includes('HARDWARE_GATE_VIOLATION')) {
        useBluetoothStore.getState().addLog(`[SECURITY BLOCK]: Command rejected. Vehicle is in motion!`);
      } else {
        useBluetoothStore.getState().addLog(`ERROR: ${errMsg}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmProfile = (finalProfile: any) => {
    const vin = useBluetoothStore.getState().vin || 'UNKNOWN_VIN';
    
    // Write confirmed vehicle profile to TelemetryStore active session
    useTelemetryStore.getState().setActiveSessionVehicle({
      brand: finalProfile.make,
      model: finalProfile.model,
      year: finalProfile.year,
      vin
    });
    
    useBluetoothStore.getState().addLog(`VIE: User confirmed profile -> ${finalProfile.make} ${finalProfile.model} (${finalProfile.year})`);
    
    // Close modal
    setSuggestedVehicleProfile(null);
  };

  const handleSendDtcsToCloud = async () => {
    const telemetryState = useTelemetryStore.getState();
    const btState = useBluetoothStore.getState();
    const brand = btState.vehicleMake || 'GENERIC';
    const model = telemetryState.activeSessionVehicle?.model || 'GENERIC';
    const year = telemetryState.activeSessionVehicle?.year || new Date().getFullYear();
    const vin = btState.vin || 'UNKNOWN_VIN';

    telemetryState.enqueueTelemetry({
      brand,
      model,
      year,
      protocol: btState.protocol || 'ISO',
      ecu_id: btState.ecuId || 'UNKNOWN_ECU',
      dtc_codes: btState.dtcs || [],
      session_hash: 'SANDBOX_SESSION',
      engine_rpm: btState.rpm !== null ? Math.round(btState.rpm) : 0,
      coolant_temp: btState.coolant !== null ? btState.coolant : 0.0,
      throttle_pos: btState.throttle !== null ? btState.throttle : 0.0,
      is_simulated: false
    });
    
    useBluetoothStore.getState().addLog(`VIE: Manual DTC packet enqueued to local database cache for transmission.`);
  };

  // ─── Dynamic Styles ──────────────────────────────────────────────────────
  const sDyn = React.useMemo(() => {
    return {
      container: {
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: scaleWidth(16),
      },
      header: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingVertical: scaleHeight(12),
        borderBottomWidth: 1.5,
        borderBottomColor: colors.border,
        marginBottom: scaleHeight(12),
      },
      closeBtn: {
        backgroundColor: `${colors.red}1a`,
        borderColor: colors.red,
        borderWidth: 1,
        borderRadius: scaleMod(6),
        paddingHorizontal: scaleWidth(10),
        paddingVertical: scaleHeight(4),
      },
      closeBtnText: {
        color: colors.red,
        fontSize: scaleFont(9.5),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
      cancelConnectBtn: {
        backgroundColor: `${colors.red}1a`,
        borderColor: colors.red,
        borderWidth: 1,
        borderRadius: scaleMod(8),
        paddingVertical: scaleHeight(8),
        alignItems: 'center' as const,
        marginTop: scaleHeight(8),
      },
      cancelConnectBtnText: {
        color: colors.red,
        fontWeight: '900' as const,
        fontSize: scaleFont(11),
        fontFamily: MONO,
      },
      headerTitle: {
        fontSize: scaleFont(12.5),
        fontWeight: '900' as const,
        color: colors.cyan,
        fontFamily: MONO,
        letterSpacing: 1,
      },
      fpsText: {
        fontSize: scaleFont(10.5),
        fontWeight: '700' as const,
        color: colors.textSec,
        fontFamily: MONO,
      },
      statusCard: {
        backgroundColor: colors.card,
        borderWidth: 1.2,
        borderColor: colors.border,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        marginBottom: scaleHeight(12),
      },
      statusRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginBottom: scaleHeight(6),
      },
      statusLabel: {
        fontSize: scaleFont(11.5),
        color: colors.textSec,
        fontFamily: MONO,
      },
      statusValue: {
        fontSize: scaleFont(11.5),
        fontWeight: '700' as const,
        fontFamily: MONO,
      },
      controlCard: {
        backgroundColor: colors.card,
        borderWidth: 1.2,
        borderColor: colors.border,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        marginBottom: scaleHeight(12),
      },
      sectionTitle: {
        fontSize: scaleFont(11),
        fontWeight: '900' as const,
        color: colors.textPri,
        fontFamily: MONO,
        letterSpacing: 0.5,
        marginBottom: scaleHeight(8),
      },
      deviceList: {
        maxHeight: scaleHeight(100),
        marginBottom: scaleHeight(10),
      },
      deviceItem: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingVertical: scaleHeight(8),
        borderBottomWidth: 1,
        borderBottomColor: `${colors.border}44`,
      },
      deviceName: {
        fontSize: scaleFont(12),
        color: colors.textPri,
        fontWeight: '700' as const,
        fontFamily: MONO,
        flex: 1,
        marginRight: scaleWidth(8),
      },
      connectBtn: {
        backgroundColor: colors.cyan,
        borderRadius: scaleMod(6),
        paddingHorizontal: scaleWidth(10),
        paddingVertical: scaleHeight(4),
      },
      connectBtnText: {
        color: '#000000',
        fontSize: scaleFont(10),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
      scanBtn: {
        borderWidth: 1.2,
        borderColor: colors.cyan,
        backgroundColor: `${colors.cyan}12`,
        borderRadius: scaleMod(8),
        paddingVertical: scaleHeight(8),
        alignItems: 'center' as const,
        marginTop: scaleHeight(4),
      },
      scanBtnText: {
        color: colors.cyan,
        fontSize: scaleFont(11),
        fontWeight: '800' as const,
        fontFamily: MONO,
        letterSpacing: 0.5,
      },
      telemetryGrid: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        justifyContent: 'space-between' as const,
        gap: scaleMod(8),
        marginBottom: scaleHeight(12),
      },
      tile: {
        width: '48.5%',
        borderRadius: scaleMod(10),
        padding: scaleMod(10),
        justifyContent: 'space-between' as const,
        minHeight: scaleHeight(75),
      },
      tileHeader: {
        fontSize: scaleFont(9.5),
        fontWeight: '700' as const,
        color: colors.textSec,
        fontFamily: MONO,
        letterSpacing: 0.5,
      },
      tileValueRow: {
        flexDirection: 'row' as const,
        alignItems: 'baseline' as const,
        marginTop: scaleHeight(6),
      },
      tileValue: {
        fontSize: scaleFont(22),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
      tileUnit: {
        fontSize: scaleFont(10.5),
        fontWeight: '700' as const,
        color: colors.textSec,
        fontFamily: MONO,
        marginLeft: scaleMod(2),
      },
      actionContainer: {
        gap: scaleHeight(8),
        marginBottom: scaleHeight(12),
      },
      stressBtn: {
        borderRadius: scaleMod(10),
        paddingVertical: scaleHeight(12),
        alignItems: 'center' as const,
      },
      stressBtnText: {
        fontSize: scaleFont(12.5),
        fontWeight: '900' as const,
        fontFamily: MONO,
        letterSpacing: 0.5,
      },
      terminalCard: {
        backgroundColor: '#0d0e12',
        borderRadius: scaleMod(12),
        borderWidth: 1.2,
        borderColor: colors.border,
        padding: scaleMod(10),
        marginBottom: scaleHeight(12),
      },
      terminalHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        marginBottom: scaleHeight(6),
        borderBottomWidth: 1,
        borderBottomColor: `${colors.border}33`,
        paddingBottom: scaleHeight(6),
      },
      terminalTitle: {
        fontSize: scaleFont(10.5),
        fontWeight: '900' as const,
        color: colors.cyan,
        fontFamily: MONO,
        letterSpacing: 0.5,
      },
      pauseBtn: {
        backgroundColor: `${colors.cyan}14`,
        borderColor: colors.cyan,
        borderWidth: 1,
        borderRadius: scaleMod(4),
        paddingHorizontal: scaleWidth(8),
        paddingVertical: scaleHeight(3),
      },
      pauseBtnText: {
        color: colors.cyan,
        fontSize: scaleFont(9.5),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
      // ─── Input Dock Styles ───────────────────────────────────────────────
      inputArea: {
        flexDirection: 'row' as const,
        gap: scaleMod(8),
        marginTop: scaleHeight(8),
        borderTopWidth: 1,
        borderTopColor: `${colors.border}33`,
        paddingTop: scaleHeight(8),
      },
      textInput: {
        flex: 1,
        borderWidth: 1.2,
        borderColor: colors.border,
        borderRadius: scaleMod(8),
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(8),
        color: colors.textPri,
        backgroundColor: colors.bg,
        fontFamily: MONO,
        fontSize: scaleFont(11),
      },
      sendBtn: {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        borderRadius: scaleMod(8),
        backgroundColor: colors.cyan,
        paddingHorizontal: scaleWidth(16),
      },
      sendBtnText: {
        color: '#000000',
        fontWeight: '900' as const,
        fontFamily: MONO,
        fontSize: scaleFont(11),
      },
    };
  }, [colors, scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet]) as any;

  const isConnectedToEcu = ecuStatus === 'connected';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <View style={sDyn.container}>
        {/* Header */}
        <View style={sDyn.header}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[sDyn.headerTitle, { flex: 1 }]}>
            ⚡ {t('sandbox.title').toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
            <Text style={sDyn.fpsText}>{t('sandbox.fps', { fps })}</Text>
            {onClose && (
              <TouchableOpacity style={sDyn.closeBtn} onPress={onClose}>
                <Text style={sDyn.closeBtnText}>{t('common.close').toUpperCase()}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Unified Layout: Connection Status, OBD Health, and Full-Height Terminal */}
        <View style={{ flex: 1 }}>
          {/* Connection Status Card */}
          <View style={sDyn.statusCard}>
            <View style={sDyn.statusRow}>
              <Text style={sDyn.statusLabel}>{t('sandbox.connectionStatus')}</Text>
              <Text style={[sDyn.statusValue, { color: getStatusColor(connectionStatus) }]}>
                {getStatusText(connectionStatus).toUpperCase()}
              </Text>
            </View>
            <View style={sDyn.statusRow}>
              <Text style={sDyn.statusLabel}>{t('sandbox.ecuStatus')}</Text>
              <Text style={[sDyn.statusValue, { color: getStatusColor(ecuStatus) }]}>
                {getStatusText(ecuStatus).toUpperCase()}
              </Text>
            </View>
            {connectionStatus === 'connecting' && (
              <TouchableOpacity
                style={sDyn.cancelConnectBtn}
                onPress={disconnect}
              >
                <Text style={sDyn.cancelConnectBtnText}>
                  {t('connection.cancel').toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
            {isConnectedToEcu && (
              <TouchableOpacity
                style={[sDyn.cancelConnectBtn, { backgroundColor: `${colors.red}20`, borderColor: colors.red, marginTop: scaleHeight(8) }]}
                onPress={performTeardown}
              >
                <Text style={[sDyn.cancelConnectBtnText, { color: colors.red }]}>
                  🔌 {t('sandbox.stopDisconnect').toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* OBD Health Statistics Card */}
          <View style={sDyn.statusCard}>
            <Text style={[sDyn.sectionTitle, { color: colors.amber }]}>📊 {t('obdTerminal.statsTitle')}</Text>
            <View style={{ gap: scaleHeight(4) }}>
              <View style={sDyn.statusRow}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[sDyn.statusLabel, { flexShrink: 1, marginRight: scaleWidth(4) }]}>
                  {t('obdTerminal.connectionProtocol')}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[sDyn.statusValue, { color: colors.textPri }]}>
                  {protocol || t('obdTerminal.none')}
                </Text>
              </View>
              <View style={sDyn.statusRow}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[sDyn.statusLabel, { flexShrink: 1, marginRight: scaleWidth(4) }]}>
                  {t('obdTerminal.hardwareQualityScore')}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[sDyn.statusValue, { color: adapterCapabilityScore > 70 ? colors.green : colors.red }]}>
                  {adapterCapabilityScore}/100 ({adapterCapabilityScore > 70 ? t('obdTerminal.original') : t('obdTerminal.clone')})
                </Text>
              </View>
              <View style={sDyn.statusRow}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[sDyn.statusLabel, { flexShrink: 1, marginRight: scaleWidth(4) }]}>
                  {t('obdTerminal.requestResponseCount')}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[sDyn.statusValue, { color: colors.textPri }]}>
                  {telemetryStats.requestsSent} / {telemetryStats.responsesReceived}
                </Text>
              </View>
              <View style={sDyn.statusRow}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[sDyn.statusLabel, { flexShrink: 1, marginRight: scaleWidth(4) }]}>
                  {t('obdTerminal.timeoutCount')}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[sDyn.statusValue, { color: telemetryStats.timeoutCount > 0 ? colors.amber : colors.textPri }]}>
                  {telemetryStats.timeoutCount}
                </Text>
              </View>
              <View style={sDyn.statusRow}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[sDyn.statusLabel, { flexShrink: 1, marginRight: scaleWidth(4) }]}>
                  {t('obdTerminal.recoveryCount')}
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[sDyn.statusValue, { color: telemetryStats.recoveryCount > 0 ? colors.red : colors.textPri }]}>
                  {telemetryStats.recoveryCount}
                </Text>
              </View>
            </View>
          </View>

          {/* DTC (Diagnostic Trouble Codes) Card */}
          <View style={sDyn.statusCard}>
            <Text style={[sDyn.sectionTitle, { color: colors.red }]}>⚠️ {t('sandbox.dtcTitle')}</Text>
            
            <View style={{ marginBottom: scaleHeight(12) }}>
              {dtcs.length === 0 ? (
                <Text style={{ color: colors.green, fontSize: scaleFont(11), fontWeight: '700', fontFamily: MONO }}>
                  ✅ {t('sandbox.noDtcs')}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scaleWidth(6), marginVertical: scaleHeight(6) }}>
                  {dtcs.map((code) => (
                    <View key={code} style={{ backgroundColor: `${colors.red}18`, borderWidth: 1, borderColor: colors.red, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(8), paddingVertical: scaleHeight(4) }}>
                      <Text style={{ color: colors.red, fontWeight: '900', fontSize: scaleFont(12), fontFamily: MONO }}>{code}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: scaleWidth(8) }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: `${colors.cyan}15`, borderWidth: 1.2, borderColor: colors.cyan, borderRadius: scaleMod(8), paddingVertical: scaleHeight(8), alignItems: 'center' }}
                onPress={runDiagnostics}
              >
                <Text style={{ color: colors.cyan, fontWeight: '800', fontSize: scaleFont(10.5), fontFamily: MONO }}>
                  {t('sandbox.readDtcs')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: `${colors.red}15`, borderWidth: 1.2, borderColor: colors.red, borderRadius: scaleMod(8), paddingVertical: scaleHeight(8), alignItems: 'center' }}
                onPress={clearDiagnostics}
              >
                <Text style={{ color: colors.red, fontWeight: '800', fontSize: scaleFont(10.5), fontFamily: MONO }}>
                  {t('sandbox.clearDtcs')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  { flex: 1.2, borderRadius: scaleMod(8), paddingVertical: scaleHeight(8), alignItems: 'center', justifyContent: 'center' },
                  dtcs.length === 0 ? { backgroundColor: `${colors.cyan}44` } : { backgroundColor: colors.cyan }
                ]}
                onPress={handleSendDtcsToCloud}
                disabled={dtcs.length === 0}
              >
                <Text style={{ color: dtcs.length === 0 ? colors.textSec : '#000000', fontWeight: '900', fontSize: scaleFont(10.5), fontFamily: MONO }}>
                  🚀 {t('sandbox.sendDtcs')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>




          {/* Full height raw terminal with docked custom command TextInput */}
          <View style={[sDyn.terminalCard, { flex: 1 }]}>
            <View style={sDyn.terminalHeader}>
              <Text style={sDyn.terminalTitle}>🛰️ {t('sandbox.terminalTitle').toUpperCase()}</Text>
              <TouchableOpacity
                style={sDyn.pauseBtn}
                onPress={() => setIsPaused(!isPaused)}
              >
                <Text style={sDyn.pauseBtnText}>
                  {isPaused ? t('sandbox.resume') : t('sandbox.pause')}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={logSnapshot}
              keyExtractor={(item, index) => `${index}-${item}`}
              renderItem={({ item }) => {
                const isTx = item.includes('TX:');
                const isRx = item.includes('RX:');
                const isSecurity = item.includes('[SECURITY BLOCK]') || item.includes('SECURITY BLOCK') || item.includes('ERROR:');
                const itemColor = isSecurity ? '#f87171' : isTx ? '#d8b4fe' : isRx ? '#4ade80' : '#f1f5f9';
                return (
                  <Text style={{
                    color: itemColor,
                    fontFamily: MONO,
                    fontSize: scaleFont(9),
                    lineHeight: scaleHeight(13),
                    marginBottom: 2
                  }}>
                    {item}
                  </Text>
                );
              }}
              inverted={!isPaused}
              initialNumToRender={20}
              maxToRenderPerBatch={15}
              windowSize={5}
              style={{ flex: 1 }}
            />
            <View style={sDyn.inputArea}>
              <TextInput
                style={sDyn.textInput}
                placeholder={t('obdTerminal.inputPlaceholder')}
                placeholderTextColor={colors.textSec}
                value={inputCommand}
                onChangeText={setInputCommand}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={handleSendCommand}
                returnKeyType="send"
              />
              <TouchableOpacity 
                style={sDyn.sendBtn}
                onPress={handleSendCommand}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={sDyn.sendBtnText}>{t('obdTerminal.sendButton')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Vehicle Confirmation Modal with Language Selector */}
      <VehicleConfirmationModal
        visible={!!suggestedVehicleProfile}
        profile={suggestedVehicleProfile}
        onConfirm={handleConfirmProfile}
        onCancel={() => setSuggestedVehicleProfile(null)}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
