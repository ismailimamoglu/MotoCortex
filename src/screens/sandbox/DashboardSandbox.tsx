import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useDiagnosticEngine } from './useDiagnosticEngine';
import { useBluetoothStore } from '../../store/useBluetoothStore';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export default function DashboardSandbox() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();

  const {
    connectionStatus,
    ecuStatus,
    discoveredDevices,
    isScanning,
    isStressActive,
    startScanning,
    connectDevice,
    disconnectDevice,
    startTelemetry,
    stopTelemetry,
    rpm,
    speed,
    coolant,
    throttle,
  } = useDiagnosticEngine();

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
        return t('sandbox.connected', 'Connected');
      case 'connecting':
        return t('sandbox.connecting', 'Connecting...');
      case 'error':
        return t('sandbox.error', 'Error');
      default:
        return t('sandbox.notConnected', 'Not Connected');
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

  // Raw UART logs logic with freeze capability
  const [isPaused, setIsPaused] = useState(false);
  const [logSnapshot, setLogSnapshot] = useState<string[]>([]);
  const logs = useBluetoothStore((s) => s.logs);

  useEffect(() => {
    if (!isPaused) {
      setLogSnapshot(logs);
    }
  }, [logs, isPaused]);

  // Dynamic Styles
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
      headerTitle: {
        fontSize: scaleFont(16),
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
    };
  }, [colors, scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet]) as any;

  const isConnectedToEcu = ecuStatus === 'connected';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={sDyn.container}>
        {/* Header */}
        <View style={sDyn.header}>
          <Text style={sDyn.headerTitle}>⚡ {t('sandbox.title', 'Sandbox Telemetry Control').toUpperCase()}</Text>
          <Text style={sDyn.fpsText}>{t('sandbox.fps', { fps })}</Text>
        </View>

        {/* Dynamic Connected vs Disconnected State */}
        {!isConnectedToEcu ? (
          // DISCONNECTED STATE: Device setup and full-height raw terminal
          <View style={{ flex: 1 }}>
            {/* Connection Status Card */}
            <View style={sDyn.statusCard}>
              <View style={sDyn.statusRow}>
                <Text style={sDyn.statusLabel}>{t('sandbox.connectionStatus', 'Connection Status:')}</Text>
                <Text style={[sDyn.statusValue, { color: getStatusColor(connectionStatus) }]}>
                  {getStatusText(connectionStatus).toUpperCase()}
                </Text>
              </View>
              <View style={sDyn.statusRow}>
                <Text style={sDyn.statusLabel}>{t('sandbox.ecuStatus', 'ECU Status:')}</Text>
                <Text style={[sDyn.statusValue, { color: getStatusColor(ecuStatus) }]}>
                  {getStatusText(ecuStatus).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Device Scanner Card */}
            <View style={sDyn.controlCard}>
              <Text style={sDyn.sectionTitle}>🛰️ {t('sandbox.discoveredDevices', 'DISCOVERED DEVICES')}</Text>
              
              {isScanning ? (
                <ActivityIndicator size="small" color={colors.cyan} style={{ marginVertical: scaleHeight(12) }} />
              ) : (
                <FlatList
                  data={discoveredDevices}
                  keyExtractor={(item) => item.id}
                  style={sDyn.deviceList}
                  renderItem={({ item }) => (
                    <View style={sDyn.deviceItem}>
                      <Text numberOfLines={1} style={sDyn.deviceName}>
                        {item.name || t('connection.unknownDevice', 'Unknown Device')}
                      </Text>
                      <TouchableOpacity
                        style={sDyn.connectBtn}
                        onPress={() => connectDevice(item.id, item.name)}
                      >
                        <Text style={sDyn.connectBtnText}>{t('sandbox.connect', 'CONNECT')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  nestedScrollEnabled={true}
                />
              )}

              <TouchableOpacity
                style={sDyn.scanBtn}
                onPress={startScanning}
                disabled={isScanning}
              >
                <Text style={sDyn.scanBtnText}>
                  {isScanning ? t('sandbox.scanning', 'Scanning...') : t('sandbox.scan', 'Scan Devices').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Full height raw terminal */}
            <View style={[sDyn.terminalCard, { flex: 1 }]}>
              <View style={sDyn.terminalHeader}>
                <Text style={sDyn.terminalTitle}>🛰️ {t('sandbox.terminalTitle', 'Live Terminal & Bus Monitor').toUpperCase()}</Text>
                <TouchableOpacity
                  style={sDyn.pauseBtn}
                  onPress={() => setIsPaused(!isPaused)}
                >
                  <Text style={sDyn.pauseBtnText}>
                    {isPaused ? t('sandbox.resume', 'RESUME') : t('sandbox.pause', 'PAUSE')}
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={logSnapshot}
                keyExtractor={(item, index) => `${index}-${item}`}
                renderItem={({ item }) => {
                  const isTx = item.includes('TX:');
                  const isRx = item.includes('RX:');
                  const itemColor = isTx ? colors.purple : isRx ? colors.green : colors.textPri;
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
              />
            </View>
          </View>
        ) : (
          // CONNECTED STATE: Telemetry gauges, 20Hz Controls & shrunken raw terminal
          <View style={{ flex: 1 }}>
            {/* 4 Telemetry Grids/Tiles */}
            <View style={sDyn.telemetryGrid}>
              <View style={[sDyn.tile, { backgroundColor: `${colors.cyan}0f`, borderLeftWidth: 4, borderLeftColor: colors.cyan }]}>
                <Text style={sDyn.tileHeader}>⚙️ {t('sandbox.rpm', 'Engine RPM').toUpperCase()}</Text>
                <View style={sDyn.tileValueRow}>
                  <Text style={[sDyn.tileValue, { color: colors.cyan }]}>
                    {rpm !== null ? Math.round(rpm) : '--'}
                  </Text>
                  {rpm !== null && <Text style={sDyn.tileUnit}>rpm</Text>}
                </View>
              </View>

              <View style={[sDyn.tile, { backgroundColor: `${colors.purple}0f`, borderLeftWidth: 4, borderLeftColor: colors.purple }]}>
                <Text style={sDyn.tileHeader}>🏎️ {t('sandbox.speed', 'Vehicle Speed').toUpperCase()}</Text>
                <View style={sDyn.tileValueRow}>
                  <Text style={[sDyn.tileValue, { color: colors.purple }]}>
                    {speed !== null ? speed : '--'}
                  </Text>
                  {speed !== null && <Text style={sDyn.tileUnit}>km/h</Text>}
                </View>
              </View>

              <View style={[sDyn.tile, { backgroundColor: `${colors.red}0f`, borderLeftWidth: 4, borderLeftColor: colors.red }]}>
                <Text style={sDyn.tileHeader}>🌡️ {t('sandbox.coolant', 'Coolant Temp').toUpperCase()}</Text>
                <View style={sDyn.tileValueRow}>
                  <Text style={[sDyn.tileValue, { color: colors.red }]}>
                    {coolant !== null ? coolant : '--'}
                  </Text>
                  {coolant !== null && <Text style={sDyn.tileUnit}>°C</Text>}
                </View>
              </View>

              <View style={[sDyn.tile, { backgroundColor: `${colors.amber}0f`, borderLeftWidth: 4, borderLeftColor: colors.amber }]}>
                <Text style={sDyn.tileHeader}>🔌 {t('sandbox.throttle', 'Throttle Position').toUpperCase()}</Text>
                <View style={sDyn.tileValueRow}>
                  <Text style={[sDyn.tileValue, { color: colors.amber }]}>
                    {throttle !== null ? throttle : '--'}
                  </Text>
                  {throttle !== null && <Text style={sDyn.tileUnit}>%</Text>}
                </View>
              </View>
            </View>

            {/* Action Controls */}
            <View style={sDyn.actionContainer}>
              <TouchableOpacity
                style={[
                  sDyn.stressBtn,
                  {
                    backgroundColor: isStressActive ? `${colors.red}1a` : colors.cyan,
                    borderWidth: isStressActive ? 1.2 : 0,
                    borderColor: isStressActive ? colors.red : 'transparent',
                  },
                ]}
                onPress={() => {
                  if (isStressActive) {
                    stopTelemetry();
                  } else {
                    startTelemetry(['0C', '0D', '05', '11'], 50);
                  }
                }}
              >
                <Text
                  style={[
                    sDyn.stressBtnText,
                    { color: isStressActive ? colors.red : '#000000' },
                  ]}
                >
                  {isStressActive
                    ? t('sandbox.stressBtnStop', 'Stop Telemetry Loop').toUpperCase()
                    : t('sandbox.stressBtnStart', 'Start 20Hz Stress').toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[sDyn.stressBtn, { backgroundColor: `${colors.red}20`, borderWidth: 1.2, borderColor: colors.red }]}
                onPress={disconnectDevice}
              >
                <Text style={[sDyn.stressBtnText, { color: colors.red }]}>
                  🔌 {t('sandbox.stopDisconnect', 'Stop / Disconnect').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Shrunken terminal */}
            <View style={[sDyn.terminalCard, { height: scaleHeight(185), flex: 0 }]}>
              <View style={sDyn.terminalHeader}>
                <Text style={sDyn.terminalTitle}>🛰️ {t('sandbox.terminalTitle', 'Live Terminal & Bus Monitor').toUpperCase()}</Text>
                <TouchableOpacity
                  style={sDyn.pauseBtn}
                  onPress={() => setIsPaused(!isPaused)}
                >
                  <Text style={sDyn.pauseBtnText}>
                    {isPaused ? t('sandbox.resume', 'RESUME') : t('sandbox.pause', 'PAUSE')}
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={logSnapshot}
                keyExtractor={(item, index) => `${index}-${item}`}
                renderItem={({ item }) => {
                  const isTx = item.includes('TX:');
                  const isRx = item.includes('RX:');
                  const itemColor = isTx ? colors.purple : isRx ? colors.green : colors.textPri;
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
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={3}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
