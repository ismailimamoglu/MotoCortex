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
  Animated,
  TextInput
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetooth } from '../hooks/useBluetooth';
import { useBluetoothStore, ConnectionStep } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { triggerHaptic } from '../utils/haptics';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { RadarScannerView } from '../components/RadarScannerView';

interface ConnectionFlowScreenProps {
  onBack: () => void;
  onNavigateToHealth: () => void;
}

export default function ConnectionFlowScreen({ onBack, onNavigateToHealth }: ConnectionFlowScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { fs, ms, vs } = useResponsive();

  const [selectedType, setSelectedType] = useState<'BLUETOOTH' | 'WIFI' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'PASSENGER_CAR' | 'MOTORCYCLE' | 'HEAVY_DUTY_TRUCK' | null>(
    useBluetoothStore.getState().selectedCategoryByUser
  );
  const [wifiIp, setWifiIp] = useState('192.168.0.10');
  const [wifiPort, setWifiPort] = useState('35000');
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

  // Reset stale error status on screen mount so connection screen always opens with clean scan view
  useEffect(() => {
    const currentStatus = useBluetoothStore.getState().status;
    if (currentStatus === 'error') {
      useBluetoothStore.getState().setSensorData({ status: 'disconnected', adapterStatus: 'disconnected', error: null });
    }
  }, []);

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

  // Sort scanned devices by RSSI descending (strongest signal first)
  const sortedDevices = React.useMemo(() => {
    return [...scannedDevices].sort((a, b) => {
      const rssiA = typeof a.rssi === 'number' ? a.rssi : -999;
      const rssiB = typeof b.rssi === 'number' ? b.rssi : -999;
      return rssiB - rssiA;
    });
  }, [scannedDevices]);

  // Helper for 4-bar RSSI signal badge
  const getSignalInfo = useCallback((rssi?: number) => {
    if (typeof rssi !== 'number') {
      return { color: colors.textSec, level: 0, label: '' };
    }
    if (rssi >= -60) return { color: colors.green, level: 4, label: t('connection.signalStrong') };
    if (rssi >= -75) return { color: colors.cyan, level: 3, label: t('connection.signalGood') };
    if (rssi >= -88) return { color: colors.amber, level: 2, label: t('connection.signalFair') };
    return { color: colors.red, level: 1, label: t('connection.signalWeak') };
  }, [colors, t]);

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
            t('connection.btDisabled'),
            t('connection.btDisabledDesc')
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
    const wifiId = `WIFI:${wifiIp.trim() || '192.168.0.10'}:${wifiPort.trim() || '35000'}`;
    const store = useBluetoothStore.getState();
    store.setSensorData({ connectionType: 'WIFI', deviceId: wifiId, deviceName: 'Wi-Fi OBDII' });
    
    // Delegate connection to single source of truth: useBluetooth hook
    proceedWithConnection(wifiId, 'Wi-Fi OBDII');
  };

  // 7-Tier Diagnostic Error Troubleshooting Advice mapper
  const getTroubleshootingAdvice = () => {
    if (!errorMsg) return null;
    const msg = errorMsg.toUpperCase();
    if (msg.includes('BLUETOOTH_DISABLED') || msg.includes('POWERED_OFF') || msg.includes('LAYER 1')) {
      return t('connection.errLayer1');
    }
    if (msg.includes('TIMEOUT') || msg.includes('LAYER 2') || msg.includes('CONNECTION_LOST')) {
      return t('connection.errLayer2');
    }
    if (msg.includes('PROTOCOL_FAILED') || msg.includes('LAYER 5')) {
      return t('connection.errLayer5', 'Troubleshoot: OBD2 Protocol negotiation failed. Ensure your vehicle\'s ignition is switched to the ON position (engine running is recommended).');
    }
    if (msg.includes('ECU_HANDSHAKE') || msg.includes('LAYER 6')) {
      return t('connection.errLayer6');
    }
    return t('connection.errGeneric');
  };

  const getFormattedErrorReason = (rawMsg: string | null) => {
    if (!rawMsg) return '';
    const code = rawMsg.toUpperCase();
    if (code.includes('BLUETOOTH_UNAVAILABLE') || code.includes('BLUETOOTH_DISABLED') || code.includes('POWERED_OFF')) {
      return t('connection.errBluetoothUnavailable');
    }
    if (code.includes('DEVICE_NOT_FOUND') || code.includes('NO_DEVICE')) {
      return t('connection.errDeviceNotFound');
    }
    if (code.includes('TIMEOUT') || code.includes('CONNECTION_LOST')) {
      return t('connection.errTimeout');
    }
    if (code.includes('PROTOCOL_FAILED')) {
      return t('connection.errProtocolFailed');
    }
    if (code.includes('ECU_HANDSHAKE') || code.includes('NO_RESPONSE')) {
      return t('connection.errEcuHandshake');
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
          {t('vehicleSelect.titleMenu')}
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
              ? t('common.connected').toUpperCase() 
              : status === 'connecting' 
                ? t('connection.connecting').toUpperCase()
                : t('common.disconnected').toUpperCase()
            }
          </Text>
        </View>
        
        {ecuStatus === 'connected' ? (
          <View style={styles.successBlock}>
            <Text style={[styles.successText, { color: colors.textSec, fontSize: fs(12.5) }]}>
              {t('connection.successVin')}
            </Text>
            {vin && (
              <Text style={[styles.vinText, { color: colors.green, fontSize: fs(13), fontFamily: colors.mono }]}>
                VIN: {vin.replace(/_SIMULATED/gi, ' (DEMO)').replace(/_/g, ' ')}
              </Text>
            )}
            
            {isCloneDevice && (
              <View style={[styles.warningBanner, { backgroundColor: `${colors.amber}15`, borderColor: colors.amber }]}>
                <Text style={[styles.warningText, { color: colors.amber, fontSize: fs(11) }]}>
                  {t('connection.cloneWarning')}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.healthBtn, { backgroundColor: colors.cyan }]}
              onPress={onNavigateToHealth}
            >
              <Text style={[styles.healthBtnText, { fontSize: fs(13), fontFamily: colors.mono }]}>
                {t('connection.viewHealth')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.statusDesc, { color: colors.textSec, fontSize: fs(12) }]}>
            {t('connection.statusPrompt')}
          </Text>
        )}
      </View>

      {/* Auto-Connect Quick Action Banner for Last Connected Device */}
      {status === 'disconnected' && Boolean(lastDeviceId) && (
        <View style={[styles.quickConnectCard, { backgroundColor: `${colors.cyan}12`, borderColor: colors.cyan }]}>
          <View style={{ flex: 1, marginRight: ms(10) }}>
            <Text style={[styles.quickConnectTitle, { color: colors.cyan, fontSize: fs(12), fontFamily: colors.mono, fontWeight: '800' }]}>
              {t('connection.quickConnectTitle')}
            </Text>
            <Text style={[styles.quickConnectDesc, { color: colors.textPri, fontSize: fs(11.5), marginTop: vs(2) }]}>
              {t('connection.quickConnectDesc', { name: lastDeviceName || 'OBDII', defaultValue: `Quick connect to your last used adapter '${lastDeviceName || 'OBDII'}'?` })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.quickConnectBtn, { backgroundColor: colors.cyan }]}
            onPress={() => {
              triggerHaptic();
              proceedWithConnection(lastDeviceId!, lastDeviceName || 'OBD2 Adapter');
            }}
          >
            <Text style={[styles.quickConnectBtnText, { fontSize: fs(11), fontFamily: colors.mono, color: '#ffffff', fontWeight: '900' }]}>
              {t('connection.quickConnectBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
                ? t('connection.btDescIos')
                : t('connection.btDescAndroid')
              }
            </Text>
            <View style={[styles.recBadge, { backgroundColor: `${colors.green}1A` }]}>
              <Text style={[styles.recText, { color: colors.green, fontSize: fs(9) }]}>
                {t('common.recommended')}
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
              {t('connection.wifiDesc')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Vehicle Category Selection (Passenger Car / Motorcycle / Heavy Duty Truck) */}
      {status === 'disconnected' && selectedType && !selectedCategory && (
        <View style={{ width: '100%', marginVertical: vs(8) }}>
          <TouchableOpacity onPress={() => setSelectedType(null)} style={{ marginBottom: vs(12) }}>
            <Text style={[styles.backArrow, { color: colors.cyan, fontSize: fs(13) }]}>
              ← {t('connection.changeType', { defaultValue: 'Bağlantı Türünü Değiştir' })}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono, fontWeight: '700', marginBottom: vs(10), letterSpacing: 0.5 }}>
            {t('connection.selectCategory', { defaultValue: 'ARAÇ KATEGORİSİ SEÇİN' })}
          </Text>

          <TouchableOpacity
            style={[styles.cardBtn, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: vs(10), flexDirection: 'column', alignItems: 'flex-start' }]}
            onPress={() => {
              triggerHaptic();
              useBluetoothStore.getState().setSelectedCategoryByUser('PASSENGER_CAR');
              setSelectedCategory('PASSENGER_CAR');
            }}
          >
            <Text style={[styles.cardTitle, { color: colors.textPri, fontSize: fs(14), fontFamily: colors.mono }]}>
              {t('connection.passengerCar', { defaultValue: 'Otomobil' }).toUpperCase()}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSec, fontSize: fs(11), marginTop: vs(2) }]}>
              12V Binek & Hafif Ticari Araçlar (OBD2 / CAN / KWP)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardBtn, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: vs(10), flexDirection: 'column', alignItems: 'flex-start' }]}
            onPress={() => {
              triggerHaptic();
              useBluetoothStore.getState().setSelectedCategoryByUser('MOTORCYCLE');
              setSelectedCategory('MOTORCYCLE');
            }}
          >
            <Text style={[styles.cardTitle, { color: colors.textPri, fontSize: fs(14), fontFamily: colors.mono }]}>
              {t('connection.motorcycle', { defaultValue: 'Motosiklet' }).toUpperCase()}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSec, fontSize: fs(11), marginTop: vs(2) }]}>
              Euro 5 & High-RPM Motosiklet Telemetrisi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardBtn, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: vs(10), flexDirection: 'column', alignItems: 'flex-start' }]}
            onPress={() => {
              triggerHaptic();
              useBluetoothStore.getState().setSelectedCategoryByUser('HEAVY_DUTY_TRUCK');
              setSelectedCategory('HEAVY_DUTY_TRUCK');
            }}
          >
            <Text style={[styles.cardTitle, { color: colors.textPri, fontSize: fs(14), fontFamily: colors.mono }]}>
              {t('connection.heavyDutyTruck', { defaultValue: 'Kamyon & Ağır Ticari' }).toUpperCase()}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSec, fontSize: fs(11), marginTop: vs(2) }]}>
              24V Ağır Ticari Araçlar & Otobüs (SAE J1939)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3A: Bluetooth Device Scan & Radar View */}
      {selectedType === 'BLUETOOTH' && selectedCategory && status === 'disconnected' && (
        <View style={styles.btBlock}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Text style={[styles.backArrow, { color: colors.cyan, fontSize: fs(13) }]}>
                ← {t('connection.changeCategory', { defaultValue: 'Kategoriyi Değiştir' })}
              </Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'ios' && (
            <View style={[styles.warningBanner, { backgroundColor: `${colors.cyan}12`, borderColor: colors.cyan, marginVertical: vs(8) }]}>
              <Text style={[styles.warningText, { color: colors.cyan, fontSize: fs(11) }]}>
                {t('connection.iosClassicWarning', { defaultValue: 'Not: iOS cihazlar sadece BLE (Bluetooth Low Energy) destekli OBD2 adaptörleriyle çalışır. Standart (Classic) adaptörler taranamaz.' })}
              </Text>
            </View>
          )}

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
                  {t('connection.scanDevices').toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {isScanning && (
            <RadarScannerView
              statusText={t('connection.scanningDevices', { defaultValue: 'OBD2 Cihazları Taranıyor...' })}
              onCancel={() => {
                triggerHaptic();
                setIsScanning(false);
              }}
            />
          )}

          {!isScanning && sortedDevices.length === 0 && (
            <View style={[styles.radarContainer, { backgroundColor: `${colors.cyan}0F`, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: ms(16), marginVertical: vs(10), alignItems: 'center' }]}>
              <Text style={[styles.radarLabel, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono, fontWeight: '600', marginTop: vs(6) }]}>
                {t('connection.scanHint', { defaultValue: 'Eşleştirilmiş OBD cihazlarını bulmak için Cihaz Tara butonuna basın.' })}
              </Text>
              <Text style={[{ color: colors.textSec, fontSize: fs(11), textAlign: 'center', marginTop: vs(4) }]}>
                {Platform.OS === 'ios'
                  ? t('connection.scanHintIos')
                  : t('connection.scanHintAndroid')
                }
              </Text>
            </View>
          )}

          {/* List Scanned Devices */}
          {!isScanning && sortedDevices.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={[styles.listHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
                {t('connection.foundDevices')} ({sortedDevices.length})
              </Text>
              {sortedDevices.map((dev, idx) => {
                const signal = getSignalInfo(dev.rssi);
                return (
                  <TouchableOpacity 
                    key={(dev.address || dev.id || 'dev') + idx}
                    style={[styles.deviceRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleConnectDevice(dev.address || dev.id, dev.name)}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
                        {dev.name || 'Unknown OBD2'}
                      </Text>
                      <Text style={[styles.deviceAddr, { color: colors.textSec, fontSize: fs(10) }]}>
                        {dev.address || dev.id}
                      </Text>
                    </View>
                    <View style={styles.rssiContainer}>
                      {typeof dev.rssi === 'number' ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: vs(14) }}>
                            {[1, 2, 3, 4].map(barIdx => (
                              <View
                                key={barIdx}
                                style={{
                                  width: ms(3),
                                  height: vs(3 + barIdx * 2.5),
                                  borderRadius: 1.5,
                                  marginLeft: ms(2),
                                  backgroundColor: barIdx <= signal.level ? signal.color : `${colors.border}80`
                                }}
                              />
                            ))}
                          </View>
                          <Text style={[styles.rssiText, { color: signal.color, fontSize: fs(9), marginTop: vs(2), fontFamily: colors.mono }]}>
                            {signal.label} ({dev.rssi} dBm)
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.rssiText, { color: colors.textSec, fontSize: fs(10) }]}>
                          --
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Step 3B: Wi-Fi Selection view */}
      {selectedType === 'WIFI' && selectedCategory && status === 'disconnected' && (
        <View style={styles.wifiBlock}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)} style={{ marginBottom: vs(12) }}>
            <Text style={[styles.backArrow, { color: colors.cyan, fontSize: fs(13) }]}>
              ← {t('connection.changeCategory', { defaultValue: 'Kategoriyi Değiştir' })}
            </Text>
          </TouchableOpacity>

          <View style={[styles.infoBanner, { backgroundColor: `${colors.border}30`, borderColor: colors.border }]}>
            <Text style={[styles.infoBannerText, { color: colors.textSec, fontSize: fs(11.5) }]}>
              {t('connection.wifiGuide', 'To connect to your Wi-Fi adapter, go to your phone\'s Wi-Fi settings and choose the OBD adapter network (e.g. OBDII, V-LINK). Then return here.')}
            </Text>
          </View>

          <View style={styles.wifiIpRow}>
            <View style={{ flex: 3, marginRight: ms(8) }}>
              <Text style={[styles.wifiInputLabel, { color: colors.textSec, fontSize: fs(10) }]}>
                {t('connection.wifiIpLabel', { defaultValue: 'Wi-Fi IP Adresi' })}
              </Text>
              <TextInput
                value={wifiIp}
                onChangeText={setWifiIp}
                placeholder="192.168.0.10"
                placeholderTextColor={colors.textSec}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.wifiInput, { color: colors.textPri, borderColor: colors.border, fontFamily: colors.mono }]}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={[styles.wifiInputLabel, { color: colors.textSec, fontSize: fs(10) }]}>
                {t('connection.wifiPortLabel', { defaultValue: 'Wi-Fi Port' })}
              </Text>
              <TextInput
                value={wifiPort}
                onChangeText={setWifiPort}
                placeholder="35000"
                placeholderTextColor={colors.textSec}
                keyboardType="number-pad"
                style={[styles.wifiInput, { color: colors.textPri, borderColor: colors.border, fontFamily: colors.mono }]}
              />
            </View>
          </View>

          <View style={styles.wifiActions}>
            <TouchableOpacity 
              style={[styles.settingsBtn, { borderColor: colors.cyan }]}
              onPress={handleOpenWifiSettings}
            >
              <Text style={[styles.settingsBtnText, { color: colors.cyan, fontSize: fs(13), fontFamily: colors.mono }]}>
                {t('connection.openWifiSettings')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.connectWifiBtn, { backgroundColor: colors.green }]}
              onPress={handleConnectWifi}
            >
              <Text style={[styles.connectWifiBtnText, { fontSize: fs(13), fontFamily: colors.mono }]}>
                {t('connection.connectWifi')}
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
              ← {t('common.changeType')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.progressBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.progressHeader, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
            {t('connection.negotiating')}
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

          <TouchableOpacity
            style={{
              marginTop: vs(16),
              paddingVertical: vs(10),
              backgroundColor: '#FEF2F2',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#FCA5A5',
              alignItems: 'center',
            }}
            onPress={() => {
              triggerHaptic();
              disconnect();
              useBluetoothStore.getState().setSensorData({ status: 'disconnected', adapterStatus: 'disconnected' });
              setSelectedType(null);
            }}
            activeOpacity={0.8}
            testID="cancel-handshake-button"
          >
            <Text style={{ color: '#DC2626', fontSize: fs(12), fontWeight: '700' }}>
              {t('connection.cancelConnection', { defaultValue: 'BAĞLANTIYI İPTAL ET' })}
            </Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Connection Errors & Troubleshooting advice */}
      {status === 'error' && (
        <View style={[styles.errorBlock, { backgroundColor: `${colors.red}0F`, borderColor: colors.red }]}>
          <Text style={[styles.errorHeader, { color: colors.red, fontSize: fs(13), fontFamily: colors.mono }]}>
            {t('connection.failed')}
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
              {t('common.retry')}
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
              {t('common.demoMode').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* In-App Android Pairing Overlay Modal */}
      {showPairingOverlay && (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.overlayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.overlayTitle, { color: colors.textPri, fontSize: fs(15), fontFamily: colors.mono }]}>
              {t('connection.pairRequired')}
            </Text>
            
            <Text style={[styles.overlayDesc, { color: colors.textSec, fontSize: fs(12) }]}>
              {t('connection.pairRequiredDesc')}
            </Text>

            <View style={styles.pinRow}>
              <TouchableOpacity 
                style={[styles.pinBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
                onPress={() => {
                  Clipboard.setString('1234');
                  triggerHaptic();
                  Alert.alert(t('common.copied'), 'PIN 1234 copied.');
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
                  Alert.alert(t('common.copied'), 'PIN 0000 copied.');
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
                  {t('common.cancelBtn')}
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
                  {t('connection.pairNow')}
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
        Alert.alert(t('common.error'), t('connection.pairingFailed'));
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
  wifiIpRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  wifiInputLabel: {
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  wifiInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
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
  },
  quickConnectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  quickConnectTitle: {
    letterSpacing: 0.5,
  },
  quickConnectDesc: {
    fontWeight: '500',
    lineHeight: 16,
  },
  quickConnectBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickConnectBtnText: {
    fontWeight: '900',
  }
});
