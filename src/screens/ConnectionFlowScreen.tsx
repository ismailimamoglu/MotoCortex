// src/screens/ConnectionFlowScreen.tsx
// MotoCortex v7.9.9 - Redesigned Cross-Platform OBD2 Connection Interface

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  Clipboard,
  Animated
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetooth } from '../hooks/useBluetooth';
import { useBluetoothStore, ConnectionStep } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { triggerHaptic } from '../utils/haptics';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { DiagnosticLogMailer } from '../services/DiagnosticLogMailer';

interface ConnectionFlowScreenProps {
  onBack: () => void;
  onNavigateToHealth: () => void;
}

export default function ConnectionFlowScreen({ onBack, onNavigateToHealth }: ConnectionFlowScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { fs, ms, vs } = useResponsive();

  const [selectedType, setSelectedType] = useState<'BLUETOOTH' | 'WIFI' | null>('BLUETOOTH');
  const [scannedDevices, setScannedDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showPairingOverlay, setShowPairingOverlay] = useState(false);
  const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);

  // Read state from Bluetooth hook & store
  const {
    status,
    connectionState,
    ecuStatus,
    adapterStatus,
    enableBluetooth,
    scanDevices,
    connect,
    disconnect,
    lastDeviceId,
    lastDeviceName,
    vin
  } = useBluetooth();

  const connectionSteps = useBluetoothStore(s => s.connectionSteps);
  const connectionProgress = useBluetoothStore(s => s.connectionProgress);
  const connectionStatusTextKey = useBluetoothStore(s => s.connectionStatusTextKey);
  const isCloneDevice = useBluetoothStore(s => s.isCloneDevice);
  const errorMsg = useBluetoothStore(s => s.error);

  const radarScale = useRef(new Animated.Value(1)).current;

  // Radar scanning animation
  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(radarScale, {
            toValue: 1.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(radarScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      radarScale.setValue(1);
    }
  }, [isScanning]);

  // Scan OBD2 devices
  const handleScan = async () => {
    triggerHaptic();
    setIsScanning(true);
    setScannedDevices([]);
    try {
      // Bluetooth state powered-on check
      if (Platform.OS === 'android') {
        const enabled = await enableBluetooth();
        if (!enabled) {
          Alert.alert(
            t('connection.btDisabled', 'Bluetooth Disabled'),
            t('connection.btDisabledDesc', 'Please enable Bluetooth to scan for OBD2 adapters.')
          );
          setIsScanning(false);
          return;
        }
      }
      
      const found = await scanDevices();
      setScannedDevices(found || []);
    } catch (err: any) {
      console.warn('[ConnectionFlow] Scan failed:', err);
      Alert.alert(t('common.error'), err?.message || String(err));
    } finally {
      setIsScanning(false);
    }
  };

  // Connect to selected device
  const handleConnectDevice = async (id: string, name: string) => {
    triggerHaptic();
    
    // On Android Classic, if the device is not bonded, show custom pairing helper overlay
    if (Platform.OS === 'android' && !id.includes('BLE') && !id.includes('SIM')) {
      try {
        const bonded = await scanDevices(); // returns bonded first
        const isBonded = bonded.some((d: any) => d.id === id || d.address === id);
        if (!isBonded) {
          setPairingDeviceId(id);
          setShowPairingOverlay(true);
          return;
        }
      } catch (e) {}
    }

    proceedWithConnection(id, name);
  };

  const proceedWithConnection = (id: string, name: string) => {
    setShowPairingOverlay(false);
    // Delegate connection lifecycle to single source of truth: useBluetooth hook
    connect(id, name).catch((err: any) => {
      const BluetoothStore = useBluetoothStore.getState();
      BluetoothStore.setSensorData({ status: 'error', ecuStatus: 'error', error: err?.message || String(err) });
    });
  };

  // Open Wi-Fi system Settings panel
  const handleOpenWifiSettings = () => {
    triggerHaptic();
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:root=WIFI').catch(() => Linking.openSettings());
    } else {
      Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => Linking.openSettings());
    }
  };

  // Connect via Wi-Fi (IP/Port)
  const handleConnectWifi = async () => {
    triggerHaptic();
    const store = useBluetoothStore.getState();
    store.setSensorData({ connectionType: 'WIFI', deviceId: '192.168.0.10:35000', deviceName: 'Wi-Fi OBDII' });
    
    // Delegate connection to single source of truth: useBluetooth hook
    proceedWithConnection('192.168.0.10:35000', 'Wi-Fi OBDII');
  };

  const MotoCortexOBDModuleConnect = async (type: 'bluetooth' | 'ble' | 'wifi', target: string): Promise<boolean> => {
    try {
      const { connectDevice } = require('motocortex-obd');
      return await connectDevice(type, target);
    } catch (e) {
      // Fallback if native module call fails
      return false;
    }
  };

  // 7-Tier Diagnostic Error Troubleshooting Advice mapper
  const getTroubleshootingAdvice = () => {
    if (!errorMsg) return null;
    const msg = errorMsg.toUpperCase();
    if (msg.includes('BLUETOOTH_DISABLED') || msg.includes('POWERED_OFF') || msg.includes('LAYER 1')) {
      return t('connection.errLayer1', 'Troubleshoot: Bluetooth is disabled. Please turn on Bluetooth in your device settings.');
    }
    if (msg.includes('TIMEOUT') || msg.includes('LAYER 2') || msg.includes('CONNECTION_LOST')) {
      return t('connection.errLayer2', 'Troubleshoot: Connection timed out. Make sure the adapter is plugged firmly into the OBD2 port and its power indicator is lit.');
    }
    if (msg.includes('PROTOCOL_FAILED') || msg.includes('LAYER 5')) {
      return t('connection.errLayer5', 'Troubleshoot: OBD2 Protocol negotiation failed. Ensure your vehicle\'s ignition is switched to the ON position (engine running is recommended).');
    }
    if (msg.includes('ECU_HANDSHAKE') || msg.includes('LAYER 6')) {
      return t('connection.errLayer6', 'Troubleshoot: Adapter connected, but vehicle ECU is not responding. Please turn the ignition ON or restart the connection.');
    }
    return t('connection.errGeneric', 'Troubleshoot: Please ensure the adapter has power, ignition is turned ON, and no other OBD app is open.');
  };

  const getFormattedErrorReason = (rawMsg: string | null) => {
    if (!rawMsg) return '';
    const code = rawMsg.toUpperCase();
    if (code.includes('BLUETOOTH_UNAVAILABLE') || code.includes('BLUETOOTH_DISABLED') || code.includes('POWERED_OFF')) {
      return t('connection.errBluetoothUnavailable', 'Bluetooth is unavailable or disabled');
    }
    if (code.includes('DEVICE_NOT_FOUND') || code.includes('NO_DEVICE')) {
      return t('connection.errDeviceNotFound', 'OBD2 device not found');
    }
    if (code.includes('TIMEOUT') || code.includes('CONNECTION_LOST')) {
      return t('connection.errTimeout', 'Connection timeout');
    }
    if (code.includes('PROTOCOL_FAILED')) {
      return t('connection.errProtocolFailed', 'Protocol negotiation failed');
    }
    if (code.includes('ECU_HANDSHAKE') || code.includes('NO_RESPONSE')) {
      return t('connection.errEcuHandshake', 'ECU handshake failed');
    }
    return rawMsg
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPri, fontSize: fs(18), fontFamily: colors.mono }]}>
          {t('vehicleSelect.titleMenu', 'VEHICLE & CONNECTION')}
        </Text>
      </View>

      {/* Main Connection Status Card */}
      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statusHeader}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: ecuStatus === 'connected' ? colors.green : status === 'connecting' ? colors.amber : colors.red }
          ]} />
          <Text style={[styles.statusTitle, { color: colors.textPri, fontSize: fs(14), fontFamily: colors.mono }]}>
            {ecuStatus === 'connected' 
              ? t('common.connected', 'CONNECTED').toUpperCase() 
              : status === 'connecting' 
                ? t('connection.connecting', 'CONNECTING...').toUpperCase()
                : t('common.disconnected', 'DISCONNECTED').toUpperCase()
            }
          </Text>
        </View>
        
        {ecuStatus === 'connected' ? (
          <View style={styles.successBlock}>
            <Text style={[styles.successText, { color: colors.textSec, fontSize: fs(12.5) }]}>
              {t('connection.successVin', 'Connection established. Vehicle profile successfully identified.')}
            </Text>
            {vin && (
              <Text style={[styles.vinText, { color: colors.green, fontSize: fs(13), fontFamily: colors.mono }]}>
                VIN: {vin.replace(/_SIMULATED/gi, ' (DEMO)').replace(/_/g, ' ')}
              </Text>
            )}
            
            {isCloneDevice && (
              <View style={[styles.warningBanner, { backgroundColor: `${colors.amber}15`, borderColor: colors.amber }]}>
                <Text style={[styles.warningText, { color: colors.amber, fontSize: fs(11) }]}>
                  {t('connection.cloneWarning', 'Incompatible Clone Adapter Detected. Advanced coding features are locked for your safety.')}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.healthBtn, { backgroundColor: colors.cyan }]}
              onPress={onNavigateToHealth}
            >
              <Text style={[styles.healthBtnText, { fontSize: fs(13), fontFamily: colors.mono }]}>
                {t('connection.viewHealth', 'OBD2 HEALTH & CAPABILITY MENU')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.statusDesc, { color: colors.textSec, fontSize: fs(12) }]}>
            {t('connection.statusPrompt', 'Select your preferred OBD2 connection interface below.')}
          </Text>
        )}
      </View>

      {/* Connection Mode Selection (Bluetooth / Wi-Fi) */}
      {status === 'disconnected' && !selectedType && (
        <View style={styles.selectionGrid}>
          <TouchableOpacity 
            style={[styles.cardBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              triggerHaptic();
              setSelectedType('BLUETOOTH');
            }}
          >
            <Text style={[styles.cardTitle, { color: colors.textPri, fontSize: fs(14), fontFamily: colors.mono }]}>
              BLUETOOTH
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSec, fontSize: fs(11) }]}>
              {Platform.OS === 'ios' 
                ? t('connection.btDescIos', 'Connect using BLE OBD2 adaptors (Veepeak, vLinker).')
                : t('connection.btDescAndroid', 'Connect via Classic Bluetooth or BLE adapters.')
              }
            </Text>
            <View style={[styles.recBadge, { backgroundColor: `${colors.green}1A` }]}>
              <Text style={[styles.recText, { color: colors.green, fontSize: fs(9) }]}>
                {t('common.recommended', 'RECOMMENDED')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.cardBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              triggerHaptic();
              setSelectedType('WIFI');
            }}
          >
            <Text style={[styles.cardTitle, { color: colors.textPri, fontSize: fs(14), fontFamily: colors.mono }]}>
              WI-FI
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSec, fontSize: fs(11) }]}>
              {t('connection.wifiDesc', 'Connect to Wi-Fi adapters (typically 192.168.0.10).')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bluetooth Selection view */}
      {selectedType === 'BLUETOOTH' && status === 'disconnected' && (
        <View style={styles.btBlock}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setSelectedType(null)}>
              <Text style={[styles.backArrow, { color: colors.cyan, fontSize: fs(13) }]}>
                ← {t('common.changeType', 'Change Connection Type')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanActionRow}>
            <TouchableOpacity 
              style={[styles.scanBtn, { backgroundColor: colors.cyan }]}
              onPress={handleScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.scanText, { fontSize: fs(13), fontFamily: colors.mono }]}>
                  {t('connection.scanDevices', 'SCAN DEVICES').toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {(isScanning || scannedDevices.length === 0) && (
            <View style={[styles.radarContainer, { backgroundColor: `${colors.cyan}0F`, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: ms(16), marginVertical: vs(10), alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={colors.cyan} style={{ marginBottom: vs(8) }} />
              <Text style={[styles.radarLabel, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono, fontWeight: '600', marginTop: vs(6) }]}>
                {isScanning ? '🔍 OBD2 Bluetooth Cihazları Taranıyor...' : '🔄 Adaptör Taranıyor (Cevap Bekleniyor)...'}
              </Text>
              <Text style={[{ color: colors.textSec, fontSize: fs(11), textAlign: 'center', marginTop: vs(4) }]}>
                {Platform.OS === 'ios'
                  ? 'BLE OBD2 adaptörünüzün açık ve yakında olduğundan emin olun.'
                  : 'Bluetooth ve konum servislerinizin aktif olduğundan emin olun.'
                }
              </Text>
            </View>
          )}

          {/* List Scanned Devices */}
          {!isScanning && scannedDevices.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={[styles.listHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
                {t('connection.foundDevices', 'FOUND OBD2 DEVICES')}
              </Text>
              {scannedDevices.map((dev, idx) => (
                <TouchableOpacity 
                  key={dev.address + idx}
                  style={[styles.deviceRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleConnectDevice(dev.address, dev.name)}
                >
                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceName, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
                      {dev.name || 'Unknown OBD2'}
                    </Text>
                    <Text style={[styles.deviceAddr, { color: colors.textSec, fontSize: fs(10) }]}>
                      {dev.address}
                    </Text>
                  </View>
                  <View style={styles.rssiContainer}>
                    <Text style={[styles.rssiText, { color: colors.textSec, fontSize: fs(10) }]}>
                      {dev.rssi ? `${dev.rssi} dBm` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Wi-Fi Selection view */}
      {selectedType === 'WIFI' && status === 'disconnected' && (
        <View style={styles.wifiBlock}>
          <TouchableOpacity onPress={() => setSelectedType(null)} style={{ marginBottom: vs(12) }}>
            <Text style={[styles.backArrow, { color: colors.cyan, fontSize: fs(13) }]}>
              ← {t('common.changeType', 'Change Connection Type')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.infoBanner, { backgroundColor: `${colors.border}30`, borderColor: colors.border }]}>
            <Text style={[styles.infoBannerText, { color: colors.textSec, fontSize: fs(11.5) }]}>
              {t('connection.wifiGuide', 'To connect to your Wi-Fi adapter, go to your phone\'s Wi-Fi settings and choose the OBD adapter network (e.g. OBDII, V-LINK). Then return here.')}
            </Text>
          </View>

          <View style={styles.wifiActions}>
            <TouchableOpacity 
              style={[styles.settingsBtn, { borderColor: colors.cyan }]}
              onPress={handleOpenWifiSettings}
            >
              <Text style={[styles.settingsBtnText, { color: colors.cyan, fontSize: fs(13), fontFamily: colors.mono }]}>
                {t('connection.openWifiSettings', 'OPEN WI-FI SETTINGS')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.connectWifiBtn, { backgroundColor: colors.green }]}
              onPress={handleConnectWifi}
            >
              <Text style={[styles.connectWifiBtnText, { fontSize: fs(13), fontFamily: colors.mono }]}>
                {t('connection.connectWifi', 'CONNECT VIA WI-FI')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Connecting Steps Visual Progress */}
      {status === 'connecting' && (
        <View style={{ width: '100%' }}>
          <TouchableOpacity 
            onPress={() => {
              triggerHaptic();
              disconnect();
              useBluetoothStore.getState().setSensorData({ status: 'disconnected', adapterStatus: 'disconnected' });
              setSelectedType(null);
            }} 
            style={{ marginBottom: vs(12) }}
          >
            <Text style={[styles.backArrow, { color: colors.cyan, fontSize: fs(13) }]}>
              ← {t('common.changeType', 'Bağlantı Türünü Değiştir')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.progressBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.progressHeader, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
            {t('connection.negotiating', 'NEGOTIATING OBD2 HANDSHAKE')}
          </Text>
          
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${connectionProgress}%`, backgroundColor: colors.cyan }]} />
          </View>

          <View style={styles.stepsContainer}>
            {connectionSteps.map((step) => (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepIndicator}>
                  {step.status === 'success' ? (
                    <Text style={{ color: colors.green, fontSize: fs(13) }}>✓</Text>
                  ) : step.status === 'pending' ? (
                    <ActivityIndicator size="small" color={colors.cyan} />
                  ) : step.status === 'failed' ? (
                    <Text style={{ color: colors.red, fontSize: fs(13) }}>✗</Text>
                  ) : (
                    <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                  )}
                </View>
                <Text style={[
                  styles.stepLabel, 
                  { 
                    color: step.status === 'success' ? colors.textPri : colors.textSec, 
                    fontSize: fs(12),
                    fontFamily: step.status === 'pending' ? colors.mono : undefined
                  }
                ]}>
                  {step.labelKey ? t(step.labelKey, step.defaultLabel) : step.defaultLabel}
                </Text>
              </View>
            ))}
          </View>
          
          {connectionStatusTextKey && (
            <Text style={[styles.statusText, { color: colors.textSec, fontSize: fs(11) }]}>
              {t(connectionStatusTextKey)}
            </Text>
          )}
          </View>
        </View>
      )}

      {/* Connection Errors & Troubleshooting advice */}
      {status === 'error' && (
        <View style={[styles.errorBlock, { backgroundColor: `${colors.red}0F`, borderColor: colors.red }]}>
          <Text style={[styles.errorHeader, { color: colors.red, fontSize: fs(13), fontFamily: colors.mono }]}>
            {t('connection.failed', 'CONNECTION ATTEMPT FAILED')}
          </Text>
          
          <Text style={[styles.errorDetail, { color: colors.textPri, fontSize: fs(11.5) }]}>
            {getFormattedErrorReason(errorMsg)}
          </Text>
          
          <View style={[styles.divider, { backgroundColor: `${colors.red}3A` }]} />
          
          <Text style={[styles.adviceText, { color: colors.textSec, fontSize: fs(11.5) }]}>
            {getTroubleshootingAdvice()}
          </Text>

          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: colors.red }]}
            onPress={() => {
              triggerHaptic();
              setSelectedType(null);
              const store = useBluetoothStore.getState();
              store.reset();
            }}
          >
            <Text style={[styles.retryBtnText, { fontSize: fs(12.5), fontFamily: colors.mono }]}>
              {t('common.retry', 'RETRY CONNECTION')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: colors.cyan, marginTop: 10 }]}
            onPress={() => {
              triggerHaptic();
              const appStore = useAppStore.getState();
              if (!appStore.isSimulationMode) {
                appStore.toggleSimulationMode();
              }
              onBack();
            }}
          >
            <Text style={[styles.retryBtnText, { fontSize: fs(12.5), fontFamily: colors.mono }]}>
              🎮 {t('common.demoMode', 'SİMÜLASYON MODUNDA İNCELE').toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: colors.purple, marginTop: 10 }]}
            onPress={() => {
              triggerHaptic();
              const store = useBluetoothStore.getState();
              DiagnosticLogMailer.sendReport({
                status: 'FAILED',
                protocol: store.protocol,
                adapterScore: store.adapterCapabilityScore,
                isClone: store.isCloneDevice,
                logs: store.logs,
                errorReason: errorMsg || 'User Manual Export',
                forceSend: true,
              });
            }}
          >
            <Text style={[styles.retryBtnText, { fontSize: fs(12.5), fontFamily: colors.mono }]}>
              📧 KARA KUTU LOĞUNU MAİL İLE GÖNDER
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* In-App Android Pairing Overlay Modal */}
      {showPairingOverlay && (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.overlayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.overlayTitle, { color: colors.textPri, fontSize: fs(15), fontFamily: colors.mono }]}>
              {t('connection.pairRequired', 'Pairing OBD2 Device')}
            </Text>
            
            <Text style={[styles.overlayDesc, { color: colors.textSec, fontSize: fs(12) }]}>
              {t('connection.pairRequiredDesc', 'Android may request pairing because you are connecting for the first time. The pairing PIN is usually as follows:')}
            </Text>

            <View style={styles.pinRow}>
              <TouchableOpacity 
                style={[styles.pinBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
                onPress={() => {
                  Clipboard.setString('1234');
                  triggerHaptic();
                  Alert.alert(t('common.copied', 'Copied'), 'PIN 1234 copied.');
                }}
              >
                <Text style={[styles.pinBtnText, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
                  PIN: 1234
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.pinBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
                onPress={() => {
                  Clipboard.setString('0000');
                  triggerHaptic();
                  Alert.alert(t('common.copied', 'Copied'), 'PIN 0000 copied.');
                }}
              >
                <Text style={[styles.pinBtnText, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
                  PIN: 0000
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.overlayActions}>
              <TouchableOpacity 
                style={[styles.overlayCancel, { borderColor: colors.border }]}
                onPress={() => setShowPairingOverlay(false)}
              >
                <Text style={[styles.overlayCancelText, { color: colors.textSec, fontSize: fs(13) }]}>
                  {t('common.cancelBtn', 'Cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.overlayConfirm, { backgroundColor: colors.cyan }]}
                onPress={() => {
                  if (pairingDeviceId) {
                    // Trigger native pairDevice call
                    RNBluetoothClassicPair(pairingDeviceId);
                  }
                }}
              >
                <Text style={[styles.overlayConfirmText, { fontSize: fs(13), fontFamily: colors.mono }]}>
                  {t('connection.pairNow', 'PAIR & CONNECT')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  function RNBluetoothClassicPair(id: string) {
    RNBluetoothClassic.pairDevice(id)
      .then(() => {
        // Proceed with connection after pairing
        proceedWithConnection(id, 'OBDII-Paired');
      })
      .catch((err: any) => {
        Alert.alert(t('common.error'), t('connection.pairingFailed', 'Pairing failed. Please pair manually in Android settings.'));
      });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginEnd: 16,
  },
  backText: {
    fontWeight: '700',
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginEnd: 8,
  },
  statusTitle: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusDesc: {
    fontWeight: '500',
    lineHeight: 16,
  },
  successBlock: {
    marginTop: 4,
  },
  successText: {
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 8,
  },
  vinText: {
    fontWeight: '800',
    marginBottom: 12,
  },
  warningBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  warningText: {
    fontWeight: '800',
    lineHeight: 15,
  },
  healthBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  healthBtnText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  selectionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cardBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDesc: {
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },
  recBadge: {
    position: 'absolute',
    top: 10,
    end: 10,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  recText: {
    fontWeight: '900',
  },
  btBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  backArrow: {
    fontWeight: '800',
  },
  scanActionRow: {
    marginBottom: 16,
  },
  scanBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  radarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    position: 'absolute',
  },
  radarLabel: {
    fontWeight: '700',
    marginTop: 80,
  },
  listContainer: {
    marginTop: 8,
  },
  listHeader: {
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  deviceRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontWeight: '800',
  },
  deviceAddr: {
    fontWeight: '600',
    marginTop: 2,
  },
  rssiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rssiText: {
    fontWeight: '700',
  },
  scanHint: {
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  wifiBlock: {
    marginBottom: 20,
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    fontWeight: '600',
    lineHeight: 16,
  },
  wifiActions: {
    flexDirection: 'row',
    gap: 12,
  },
  settingsBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontWeight: '900',
  },
  connectWifiBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectWifiBtnText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  progressBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsContainer: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIndicator: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepLabel: {
    fontWeight: '600',
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16,
  },
  errorBlock: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  errorHeader: {
    fontWeight: '900',
    marginBottom: 8,
  },
  errorDetail: {
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  adviceText: {
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 16,
  },
  retryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 999,
  },
  overlayCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  overlayTitle: {
    fontWeight: '900',
    marginBottom: 8,
  },
  overlayDesc: {
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 16,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  pinBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBtnText: {
    fontWeight: '800',
  },
  overlayActions: {
    flexDirection: 'row',
    gap: 12,
  },
  overlayCancel: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCancelText: {
    fontWeight: '700',
  },
  overlayConfirm: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayConfirmText: {
    color: '#ffffff',
    fontWeight: '900',
  }
});
