import React, { useState, useEffect } from 'react';
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
import { saveGarageRecord, getGarageRecords, deleteGarageRecord, getRecordsByVin, GarageRecord } from './src/store/garageStore';
import './src/i18n';
import { useTranslation } from 'react-i18next';

// ─── Design Tokens ───────────────────────────────────────────────
const C = {
  bg: '#0a0a0a',
  card: '#111318',
  elevated: '#1a1d24',
  border: '#1e2430',
  cyan: '#00d4ff',
  green: '#00ff88',
  red: '#ff3b3b',
  amber: '#ffb800',
  textPri: '#e8eaed',
  textSec: '#6b7280',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

export default function App() {
  const { t, i18n } = useTranslation();
  const {
    status, adapterStatus, ecuStatus, logs,
    enableBluetooth, scanDevices, connect, disconnect,
    sendCommand, retryEcu, clearLogs,
    rpm, coolant, speed, throttle, voltage, engineLoad, intakeAirTemp, manifoldPressure,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expertise' | 'info'>('dashboard');
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);

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
      Alert.alert('Eksik Bilgi', 'Lütfen Marka ve Model alanını doldurun.');
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
    const dtcLines = dtcs.length > 0
      ? dtcs.map(dtc => {
        const desc = lookupDTC(dtc);
        return desc ? `  • ${dtc} — ${desc}` : `  • ${dtc}`;
      }).join('\n')
      : '  ✅ HATA KODU YOK — TEMİZ';

    const sensorLines = [
      rpm !== null ? `  RPM: ${rpm}` : null,
      speed !== null ? `  Hız: ${speed} km/h` : null,
      coolant !== null ? `  Motor Sıcaklığı: ${coolant}°C` : null,
      throttle !== null ? `  Gaz: ${throttle}%` : null,
      engineLoad !== null ? `  Motor Yükü: ${engineLoad}%` : null,
      intakeAirTemp !== null ? `  Emme Hava: ${intakeAirTemp}°C` : null,
      manifoldPressure !== null ? `  Manifold: ${manifoldPressure} kPa` : null,
      voltage ? `  Akü Voltajı: ${voltage}` : null,
    ].filter(Boolean).join('\n');

    const report = `🏍️ ═══ MOTOCORTEX TEŞHİS RAPORU ═══ 🏍️

📋 ARAÇ KİMLİĞİ
━━━━━━━━━━━━━━━━━━━━━━
  ${t('report.vin')}: ${vin || t('report.vinNotFound')}
  ${t('report.odometer')}: ${odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer} km` : t('common.unknown')}
  ${t('report.milDist')}: ${distanceMilOn !== null ? `${distanceMilOn} km` : '0 km'}
  ${t('report.distSinceCleared')}: ${distanceSinceCleared !== null ? `${distanceSinceCleared} km` : t('common.unknown')}

🔍 ARIZA KODLARI (${dtcs.length} adet)
━━━━━━━━━━━━━━━━━━━━━━
${dtcLines}

📊 CANLI SENSÖR VERİLERİ
━━━━━━━━━━━━━━━━━━━━━━
${sensorLines || '  Veri okunamadı'}

━━━━━━━━━━━━━━━━━━━━━━
*MotoCortex v7 PRO ile taranmıştır.*
*Tarih: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}*`;

    try {
      await Share.share({ message: report, title: t('report.title') });
    } catch (e) {
      console.error('Report sharing failed:', e);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'connected') return C.green;
    if (s === 'connecting') return C.amber;
    if (s === 'error') return C.red;
    return C.textSec;
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
              <Text style={s.actionBtnText}>↺  {t('connection.connectLast')} ({lastDeviceName})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.btEnableBtn} onPress={enableBluetooth}>
            <Text style={s.btEnableBtnText}>{t('connection.enableBt')}</Text>
          </TouchableOpacity>

          {status === 'scanning' && (
            <View style={s.scanningRow}>
              <ActivityIndicator color={C.cyan} size="small" />
              <Text style={s.scanningText}>{t('connection.scanning')}</Text>
            </View>
          )}

          {scannedDevices.length > 0 && (
            <View style={s.deviceSection}>
              <Text style={s.deviceSectionTitle}>{t('connection.foundDevices')}</Text>
              {scannedDevices.map(d => (
                <TouchableOpacity key={d.address} style={s.deviceCard} onPress={() => connect(d.address, d.name)}>
                  <View>
                    <Text style={s.deviceName}>{d.name || 'Bilinmeyen Cihaz'}</Text>
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
              <ActivityIndicator color={C.amber} size="small" />
              <Text style={[s.scanningText, { color: C.amber }]}>{t('connection.ecuWait')}</Text>
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
  const renderDashboard = () => {
    // Battery voltage warning
    const voltNum = voltage ? parseFloat(voltage.replace('V', '')) : null;
    const isBatteryLow = voltNum !== null && voltNum < 11.8;
    const isBatteryWarn = voltNum !== null && voltNum < 12.2 && voltNum >= 11.8;

    return (
      <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Device Connection Card */}
        <TouchableOpacity
          style={{
            backgroundColor: ecuStatus === 'connected' ? 'rgba(0,255,136,0.08)' : C.card,
            borderWidth: 1.5,
            borderColor: ecuStatus === 'connected' ? C.green : C.cyan,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onPress={() => setIsConnectModalVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor(ecuStatus) }} />
            <View>
              <Text style={{ color: C.textPri, fontSize: 14, fontWeight: '900', fontFamily: C.mono }}>
                {ecuStatus === 'connected' ? t('dashboard.connectedDevice') : t('dashboard.selectDevice')}
              </Text>
              <Text style={{ color: C.textSec, fontSize: 10, fontFamily: C.mono, marginTop: 2 }}>
                {ecuStatus === 'connected' && lastDeviceName ? lastDeviceName : t('dashboard.noConnection')}
              </Text>
            </View>
          </View>
          <Text style={{ color: ecuStatus === 'connected' ? C.green : C.cyan, fontSize: 18, fontWeight: '900' }}>›</Text>
        </TouchableOpacity>

        {/* Battery Warning */}
        {isBatteryLow && (
          <View style={[s.warningBanner, { borderColor: C.red }]}>
            <Text style={s.warningIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.warningTitle, { color: C.red }]}>{t('dashboard.batteryLow')}</Text>
              <Text style={s.warningBody}>{t('dashboard.batteryLowDesc', { voltage })}</Text>
            </View>
          </View>
        )}
        {isBatteryWarn && (
          <View style={[s.warningBanner, { borderColor: C.amber }]}>
            <Text style={s.warningIcon}>⚠</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.warningTitle, { color: C.amber }]}>{t('dashboard.batteryWarn')}</Text>
              <Text style={s.warningBody}>{t('dashboard.batteryWarnDesc', { voltage })}</Text>
            </View>
          </View>
        )}

        {/* RPM Hero */}
        <View style={s.rpmHero}>
          <Text style={s.rpmNumber}>{rpm !== null ? rpm : '----'}</Text>
          <Text style={s.rpmUnit}>RPM</Text>
        </View>

        {/* Sensor Grid */}
        <View style={s.sensorGrid}>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{speed !== null ? speed : '--'}</Text>
            <Text style={s.sensorLabel}>{t('dashboard.speed')}</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={[s.sensorValue, coolant !== null && coolant > 100 ? { color: C.red } : {}]}>
              {coolant !== null ? `${coolant}°` : '--'}
            </Text>
            <Text style={s.sensorLabel}>{t('dashboard.temp')}</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{throttle !== null ? `${throttle}%` : '--'}</Text>
            <Text style={s.sensorLabel}>{t('dashboard.throttle')}</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={[s.sensorValue, rpm !== null && (rpm > 7000 ? { color: C.red } : rpm > 3000 ? { color: C.green } : { color: C.amber }), { fontSize: 18 }]}>
              {rpm !== null ? (rpm > 7000 ? t('dashboard.statusHigh') : rpm > 3000 ? t('dashboard.statusNormal') : t('dashboard.statusLow')) : '--'}
            </Text>
            <Text style={s.sensorLabel}>{t('dashboard.status')}</Text>
          </View>
          <View style={[s.sensorCard, { borderColor: isBatteryLow ? C.red : isBatteryWarn ? C.amber : C.border }]}>
            <Text style={[s.sensorValue, { color: isBatteryLow ? C.red : isBatteryWarn ? C.amber : C.green }]}>
              {voltage || '--'}
            </Text>
            <Text style={s.sensorLabel}>{t('dashboard.battery')}</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{engineLoad !== null ? `${engineLoad}%` : '--'}</Text>
            <Text style={s.sensorLabel}>{t('dashboard.load')}</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={[s.sensorValue, intakeAirTemp !== null && intakeAirTemp > 60 ? { color: C.amber } : {}]}>
              {intakeAirTemp !== null ? `${intakeAirTemp}°` : '--'}
            </Text>
            <Text style={s.sensorLabel}>{t('dashboard.intake')}</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{manifoldPressure !== null ? manifoldPressure : '--'}</Text>
            <Text style={s.sensorLabel}>{t('dashboard.manifold')}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Expertise / Diagnostics Tab
  // ═══════════════════════════════════════════════════════════════
  const renderExpertise = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* VIN History Alert */}
      {vinHistory.length > 0 && (
        <View style={[s.warningBanner, { borderColor: C.cyan, backgroundColor: '#002b36' }]}>
          <Text style={s.warningIcon}>📜</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.warningTitle, { color: C.cyan }]}>{t('expertise.historyFound')}</Text>
            <Text style={s.warningBody}>{t('expertise.historyFoundDesc', { count: vinHistory.length })}</Text>
            <TouchableOpacity onPress={() => setIsGarageStatsExpanded(true)} style={{ marginTop: 8 }}>
              <Text style={{ color: C.cyan, fontWeight: 'bold' }}>{t('expertise.viewHistory')}</Text>
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
            style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: C.cyan, fontFamily: C.mono, marginTop: 10 }}
            value={manualVin}
            onChangeText={setManualVin}
            placeholder={t('expertise.vinPlaceholder')}
            placeholderTextColor="#444"
          />
        </View>
      )}

      <TouchableOpacity
        style={[s.actionBtn, s.actionPurple, (isDiagnosticMode || isAdaptationRunning) && { opacity: 0.5 }]}
        onPress={() => guardAction(runDiagnostics)}
        disabled={isDiagnosticMode || isAdaptationRunning}
      >
        <Text style={s.actionBtnText}>{isDiagnosticMode ? t('expertise.scanning') : `⬡  ${t('expertise.startScan')}`}</Text>
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
                  {desc && <Text style={{ color: '#ff9999', fontSize: 10, fontFamily: C.mono, marginTop: 2 }}>{desc}</Text>}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Secondary Actions (Formerly Service) — ABOVE Garage */}
      <View style={{ marginTop: 8 }}>
        <Text style={[s.panelTitle, { marginLeft: 16, marginBottom: 8 }]}>{t('expertise.extraActions')}</Text>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: '#1e3a5f' }]}
            onPress={() => guardAction(() => setIsFreezeFrameVisible(true))}
          >
            <Text style={s.miniActionText}>❄️ FREEZE FRAME</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: '#b45309' }]}
            onPress={() => guardAction(() => setIsBatteryTestVisible(true))}
          >
            <Text style={s.miniActionText}>⚡ AKÜ TESTİ</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 10 }}>
          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: '#0e7490' }]}
            onPress={() => guardAction(() => setIsPerformanceVisible(true))}
          >
            <Text style={s.miniActionText}>🏁 PERFORMANS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.miniAction, { backgroundColor: C.red }]}
            onPress={handleServiceRoutine}
          >
            <Text style={s.miniActionText}>🔧 ECU RESET</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Garage & Past Records Accordion inside Expertise */}
      <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 20 }}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: isGarageStatsExpanded ? C.elevated : C.card, borderWidth: 1, borderColor: isGarageStatsExpanded ? C.green : C.border, paddingVertical: 14 }]}
          onPress={() => setIsGarageStatsExpanded(!isGarageStatsExpanded)}
        >
          <Text style={[s.actionBtnText, { color: isGarageStatsExpanded ? C.green : C.textSec, fontSize: 12 }]}>
            {isGarageStatsExpanded ? `▼ ${t('expertise.garageTitle')}` : `📁 ${t('expertise.garageTitle')}`}
          </Text>
        </TouchableOpacity>

        {isGarageStatsExpanded && (
          <View style={{ backgroundColor: C.bg, borderRadius: 6, borderWidth: 1, borderColor: C.border, marginTop: 8, padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={[s.actionBtn, { flex: 1, backgroundColor: '#075E54', paddingVertical: 12 }, isDiagnosticMode && { opacity: 0.5 }]}
                onPress={handleShareReport}
                disabled={isDiagnosticMode}
              >
                <Text style={[s.actionBtnText, { fontSize: 11 }]}>📤 {t('expertise.share')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { flex: 1, backgroundColor: '#1e40af', paddingVertical: 12 }]}
                onPress={() => {
                  if (vin || manualVin) {
                    setIsSaveModalVisible(true);
                  } else {
                    Alert.alert('VIN Gerekli', 'Kayıt yapabilmek için şasi numarası (VIN) otomatik gelmeli veya el ile yazılmalıdır.');
                  }
                }}
              >
                <Text style={[s.actionBtnText, { fontSize: 11 }]}>💾 {t('expertise.saveVehicle')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.panelTitle, { marginLeft: 4, marginBottom: 12 }]}>GEÇMİŞ KAYITLAR</Text>
            {garageRecords.length === 0 && vinHistory.length === 0 ? (
              <Text style={{ color: C.textSec, fontSize: 11, fontFamily: C.mono, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>
                {t('expertise.noRecords')}
              </Text>
            ) : (
              (vinHistory.length > 0 ? vinHistory : garageRecords).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.panel, { marginBottom: 8, padding: 12 }]}
                  onPress={() => setSelectedRecord(item)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.textPri, fontSize: 13, fontWeight: '800', fontFamily: C.mono }}>
                        {item.make} {item.model}
                      </Text>
                      <Text style={{ color: C.textSec, fontSize: 10, fontFamily: C.mono, marginTop: 4 }}>
                        {item.date} • {item.km} km
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: item.dtcs.length === 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,59,59,0.1)',
                      borderWidth: 1,
                      borderColor: item.dtcs.length === 0 ? C.green : C.red,
                      borderRadius: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                      <Text style={{
                        color: item.dtcs.length === 0 ? C.green : C.red,
                        fontSize: 9,
                        fontWeight: '800',
                        fontFamily: C.mono,
                      }}>
                        {item.dtcs.length === 0 ? t('expertise.clean') : `${item.dtcs.length} ${t('expertise.faults')}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
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
        '⚠️ GÜVENLİK UYARISI',
        'Bu işlem sırasında:\n\n• Kontak AÇIK olmalı\n• Motor KAPALI olmalı\n• Aracı çalıştırmayın\n\nDevam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devam Et',
            onPress: () => {
              Alert.alert(
                'Adım 1: Arıza Kodlarını Sil',
                'Tüm kayıtlı arıza kodları (DTC) ve Check Engine ışığı silinecek. Yakıt trim değerleri sıfırlanacak.\n\nBu işlem geri alınamaz!',
                [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Kodları Sil',
                    style: 'destructive',
                    onPress: async () => {
                      await runAdaptationRoutine('fuel');
                      Alert.alert(
                        'Adım 2: ECU Hard Reset',
                        'Motor beynine elektriksel sıfırlama (Hard Reset) gönderilecek. Akü söküp takmak gibi çalışır.\n\n⚠️ Desteklemeyen ECU\'larda etkisizdir. Zarar vermez.',
                        [
                          { text: 'Atla (Bitir)', style: 'cancel', onPress: () => Alert.alert('Tamamlandı ✅', 'Servis işlemleri başarıyla tamamlandı. Aracı yeniden çalıştırabilirsiniz.') },
                          {
                            text: 'ECU Reset Yap',
                            style: 'destructive',
                            onPress: async () => {
                              await runAdaptationRoutine('ecu');
                              Alert.alert('Tamamlandı ✅', 'Tüm servis işlemleri başarıyla tamamlandı.\n\n• Arıza kodları silindi\n• Yakıt trimleri sıfırlandı\n• ECU resetlendi\n\nAracı yeniden çalıştırabilirsiniz.');
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
        style={[s.actionBtn, { backgroundColor: expandedInfoSection === id ? C.elevated : C.card, borderWidth: 1, borderColor: C.border, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }]}
        onPress={() => toggleInfoAcc(id)}
      >
        <Text style={[s.actionBtnText, { color: expandedInfoSection === id ? C.cyan : C.textPri, fontSize: 12 }]}>
          {icon}  {title}
        </Text>
        <Text style={{ color: C.textSec, fontSize: 12 }}>{expandedInfoSection === id ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedInfoSection === id && (
        <View style={{ backgroundColor: C.bg, padding: 16, borderWidth: 1, borderTopWidth: 0, borderColor: C.border, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
          {typeof content === 'string' ? <Text style={s.panelDesc}>{content}</Text> : content}
        </View>
      )}
    </View>
  );

  const renderInfo = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top Section */}
      <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 10 }}>
        <Text style={s.logoText}>MOTOCORTEX</Text>
        <Text style={[s.logoSub, { color: C.cyan }]}>v7 PRO</Text>
        <Text style={{ color: C.textSec, fontFamily: C.mono, fontSize: 10, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
          {t('info.desc')}
        </Text>
      </View>

      {/* Language Switcher */}
      <View style={{ marginBottom: 24, paddingVertical: 12, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
        <Text style={{ color: C.textSec, fontSize: 10, fontWeight: '800', fontFamily: C.mono, marginBottom: 12, letterSpacing: 1 }}>{t('info.language')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['tr', 'en', 'id'].map((lang) => (
            <TouchableOpacity
              key={lang}
              onPress={async () => {
                await i18n.changeLanguage(lang);
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem('user-language', lang);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                backgroundColor: i18n.language === lang ? 'rgba(0,212,255,0.1)' : C.elevated,
                borderWidth: 1,
                borderColor: i18n.language === lang ? C.cyan : C.border
              }}
            >
              <Text style={{ color: i18n.language === lang ? C.cyan : C.textSec, fontWeight: 'bold', fontFamily: C.mono, fontSize: 12 }}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#7c3aed', marginBottom: 24 }]}
        onPress={() => Alert.alert('Erken Erişim 🎉', 'MotoCortex şu an geliştirme aşamasındadır. Siz erken dönem kullanıcımız olduğunuz için tüm profesyonel özellikler şu an size açıktır. Geri bildirimleriniz bizim için çok değerli!')}
      >
        <Text style={[s.actionBtnText, { color: '#a78bfa', fontSize: 14 }]}>{t('info.upgrade')}</Text>
      </TouchableOpacity>

      <Text style={[s.panelTitle, { marginLeft: 4, marginBottom: 12 }]}>{t('info.helpGuide')}</Text>

      {/* Middle Section: Accordions */}
      <InfoAccordion
        id="canli"
        icon="📊"
        title="CANLI İZLEME SENSÖRLERİ"
        content={t('info.sections.live.content')}
      />

      <InfoAccordion
        id="ekspertiz"
        icon="🔍"
        title="EKSPERTİZ VE GARANTİ"
        content={t('info.sections.expertise.content')}
      />

      <InfoAccordion
        id="testler"
        icon="⚡"
        title="AKÜ / PERFORMANS TESTLERİ"
        content={t('info.sections.tests.content')}
      />

      <InfoAccordion
        id="donanim"
        icon="🔌"
        title="DONANIM UYUMLULUĞU"
        content={t('info.sections.hardware.content')}
      />

      <InfoAccordion
        id="uyarilar"
        icon="⚠️"
        title="ÖNEMLİ UYARILAR"
        content={t('info.sections.warnings.content')}
      />

      {/* Bottom Section: Support Links */}
      <View style={{ marginTop: 24, paddingVertical: 20, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center', gap: 16 }}>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:ismailimamoglu610@gmail.com')}>
          <Text style={{ color: C.cyan, fontFamily: C.mono, fontSize: 13, fontWeight: '700' }}>{t('info.support')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert(t('info.thanks'), t('info.thanksDesc'))}>
          <Text style={{ color: C.textSec, fontFamily: C.mono, fontSize: 12, fontWeight: '700' }}>✉️ {t('expertise.share').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER (Unblocked Navigation)
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={{ flex: 1 }}>
        {/* Top Bar */}
        <View style={s.topBar}>
          <View style={s.topLeft}>
            <Text style={s.topLogo}>MOTOCORTEX</Text>
            <Text style={s.topVersion}>v7 PRO</Text>
          </View>
          <View style={s.topRight}>
            {ecuStatus === 'connected' && (
              <TouchableOpacity onPress={() => retryEcu()}>
                <Text style={s.topDisconnect}>{t('connection.disconnect').toUpperCase()}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Bar */}
        <View style={s.tabBar}>
          {(['dashboard', 'expertise', 'info'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
                {tab === 'dashboard' ? t('tabs.dashboard') : tab === 'expertise' ? t('tabs.expertise') : t('tabs.info')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'expertise' && renderExpertise()}
        {activeTab === 'info' && renderInfo()}

        {/* Connection Modal */}
        <Modal
          visible={isConnectModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsConnectModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.textPri, fontSize: 16, fontWeight: '800', fontFamily: C.mono }}>{t('connection.foundDevices')}</Text>
              <TouchableOpacity onPress={() => setIsConnectModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>{t('common.cancel').toUpperCase()}</Text>
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
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 30 }}>
            <View style={{ backgroundColor: C.card, borderRadius: 8, padding: 24, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.textPri, fontSize: 16, fontWeight: '800', fontFamily: C.mono, marginBottom: 16 }}>{t('common.save').toUpperCase()}</Text>
              <TextInput
                style={{ backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, color: '#ffffff', fontFamily: C.mono, fontSize: 14, marginBottom: 10 }}
                value={saveMake}
                onChangeText={setSaveMake}
                placeholder="Marka (Honda, Yamaha...)"
                placeholderTextColor={C.textSec}
                selectionColor={C.cyan}
              />
              <TextInput
                style={{ backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, color: '#ffffff', fontFamily: C.mono, fontSize: 14, marginBottom: 16 }}
                value={saveModel}
                onChangeText={setSaveModel}
                placeholder="Model (CBR600, MT07...)"
                placeholderTextColor={C.textSec}
                selectionColor={C.cyan}
              />
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#1e40af' }]}
                onPress={handleSaveToGarage}
              >
                <Text style={s.actionBtnText}>{t('common.save').toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.elevated, marginTop: 8, borderWidth: 1, borderColor: C.border }]}
                onPress={() => setIsSaveModalVisible(false)}
              >
                <Text style={[s.actionBtnText, { color: C.textSec }]}>{t('common.cancel').toUpperCase()}</Text>
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
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.textPri, fontSize: 14, fontWeight: '800', fontFamily: C.mono }}>{t('common.success')}: {selectedRecord?.make} {selectedRecord?.model}</Text>
              <TouchableOpacity onPress={() => setSelectedRecord(null)} style={{ padding: 10 }}>
                <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>{t('common.cancel').toUpperCase()}</Text>
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
                            {desc && <Text style={{ color: '#ff9999', fontSize: 10, fontFamily: C.mono, marginTop: 2 }}>{desc}</Text>}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionRed, { marginTop: 12 }]}
                  onPress={() => {
                    Alert.alert('Silme Onayı', 'Bu kaydı silmek istediğinize emin misiniz?', [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'Sil', style: 'destructive', onPress: async () => {
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
                  <Text style={s.actionBtnText}>{t('common.delete').toUpperCase()}</Text>
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
          voltage={voltage}
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
          speed={speed}
        />
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // ── Connection Screen ──
  connectPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: '900', color: C.cyan, fontFamily: C.mono, letterSpacing: 4 },
  logoSub: { fontSize: 14, color: C.textSec, fontFamily: C.mono, marginTop: 4, letterSpacing: 6 },

  badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', fontFamily: C.mono },

  connectActions: { width: '100%', alignItems: 'center', gap: 12 },
  scanBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: C.cyan, borderRadius: 4, paddingVertical: 16, paddingHorizontal: 50, width: '100%', alignItems: 'center' },
  scanBtnText: { color: C.cyan, fontWeight: '900', fontSize: 16, fontFamily: C.mono, letterSpacing: 2 },
  btEnableBtn: { backgroundColor: C.elevated, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 30, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  btEnableBtnText: { color: C.textSec, fontWeight: '700', fontSize: 12, fontFamily: C.mono },

  scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  scanningText: { color: C.cyan, fontSize: 12, fontFamily: C.mono },

  deviceSection: { width: '100%', marginTop: 20 },
  deviceSectionTitle: { color: C.textSec, fontSize: 10, fontWeight: '800', fontFamily: C.mono, marginBottom: 10, letterSpacing: 2 },
  deviceCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceName: { color: C.textPri, fontSize: 14, fontWeight: '700', fontFamily: C.mono },
  deviceMac: { color: C.textSec, fontSize: 10, fontFamily: C.mono, marginTop: 4 },
  connectLabel: { color: C.cyan, fontSize: 12, fontWeight: '800', fontFamily: C.mono },
  hintText: { color: C.textSec, fontSize: 11, fontFamily: C.mono, marginTop: 20, textAlign: 'center' },

  ecuConnecting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ecuErrorText: { color: C.red, fontSize: 12, fontFamily: C.mono, textAlign: 'center', marginBottom: 10 },
  retryBtn: { backgroundColor: C.amber, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 30, width: '100%', alignItems: 'center', marginBottom: 10 },
  retryBtnText: { color: '#000', fontWeight: '900', fontSize: 13, fontFamily: C.mono },
  disconnectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.red, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 30, width: '100%', alignItems: 'center' },
  disconnectBtnText: { color: C.red, fontWeight: '700', fontSize: 12, fontFamily: C.mono },

  // ── Top Bar ──
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  topLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  topLogo: { color: C.cyan, fontSize: 16, fontWeight: '900', fontFamily: C.mono, letterSpacing: 2 },
  topVersion: { color: C.textSec, fontSize: 10, fontFamily: C.mono },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  topBadgeDot: { width: 5, height: 5, borderRadius: 3 },
  topBadgeText: { fontSize: 9, fontWeight: '900', fontFamily: C.mono },
  topDisconnect: { color: C.red, fontSize: 10, fontWeight: '800', fontFamily: C.mono },

  // ── Tab Bar ──
  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: C.cyan },
  tabLabel: { color: C.textSec, fontSize: 10, fontWeight: '800', fontFamily: C.mono, letterSpacing: 1 },
  tabLabelActive: { color: C.cyan },

  // ── Tab Content ──
  tabContent: { flex: 1, padding: 16 },

  // ── Dashboard: RPM ──
  rpmHero: { alignItems: 'center', paddingVertical: 24, backgroundColor: C.card, borderRadius: 4, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  rpmNumber: { fontSize: 72, fontWeight: '900', color: C.textPri, fontFamily: C.mono },
  rpmUnit: { fontSize: 14, fontWeight: '700', color: C.textSec, fontFamily: C.mono, marginTop: -4 },

  // ── Dashboard: Sensor Grid ──
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sensorCard: { width: '48.5%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingVertical: 20, alignItems: 'center' },
  sensorValue: { fontSize: 28, fontWeight: '900', color: C.textPri, fontFamily: C.mono },
  sensorLabel: { fontSize: 10, fontWeight: '700', color: C.textSec, fontFamily: C.mono, marginTop: 4, letterSpacing: 2 },

  // ── Quick Command Bar ──
  quickBar: { marginBottom: 16 },
  cmdRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cmdInput: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, color: C.textPri, fontFamily: C.mono, fontSize: 12 },
  cmdSend: { backgroundColor: C.cyan, borderRadius: 4, width: 44, alignItems: 'center', justifyContent: 'center' },
  cmdSendText: { color: '#000', fontSize: 20, fontWeight: '900' },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: C.cyan, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: C.cyan, fontSize: 10, fontWeight: '800', fontFamily: C.mono },

  // ── Terminal ──
  terminalBox: { backgroundColor: '#000', borderWidth: 1, borderColor: C.border, borderRadius: 4, overflow: 'hidden' },
  terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  terminalTitle: { color: C.textSec, fontSize: 10, fontWeight: '800', fontFamily: C.mono },
  terminalClear: { color: C.cyan, fontSize: 10, fontWeight: '700', fontFamily: C.mono },
  terminalScroll: { maxHeight: 160, padding: 10 },
  terminalLine: { color: C.green, fontSize: 10, fontFamily: C.mono, lineHeight: 16 },

  // ── Panels (Expertise/Service) ──
  panel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 16, marginBottom: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: C.textSec, fontSize: 11, fontWeight: '900', fontFamily: C.mono, letterSpacing: 1, marginBottom: 12 },
  panelDesc: { color: C.textSec, fontSize: 11, fontFamily: C.mono, lineHeight: 18, marginBottom: 16 },

  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  tableLabel: { color: C.textSec, fontSize: 12, fontFamily: C.mono },
  tableValue: { color: C.textPri, fontSize: 12, fontWeight: '700', fontFamily: C.mono },

  // ── Action Buttons ──
  actionBtn: { borderRadius: 4, paddingVertical: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, fontFamily: C.mono, letterSpacing: 1 },
  actionPurple: { backgroundColor: '#7c3aed' },
  actionCyan: { backgroundColor: '#0891b2' },
  actionRed: { backgroundColor: C.red },

  // ── Brand Selector ──
  brandScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  brandScrollContent: { paddingRight: 32, gap: 10 },
  brandChip: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  brandChipActive: { backgroundColor: 'rgba(0, 212, 255, 0.1)', borderColor: C.cyan },
  brandChipText: { color: C.textSec, fontSize: 11, fontWeight: '700', fontFamily: C.mono },
  brandChipTextActive: { color: C.cyan, fontWeight: '900' },

  // ── DTC Items ──
  cleanBadge: { backgroundColor: 'rgba(0, 255, 136, 0.08)', borderWidth: 1, borderColor: C.green, borderRadius: 4, paddingVertical: 14, alignItems: 'center' },
  cleanBadgeText: { color: C.green, fontWeight: '800', fontSize: 12, fontFamily: C.mono },
  dtcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 59, 59, 0.08)', borderWidth: 1, borderColor: C.red, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6 },
  dtcDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  dtcCode: { color: C.red, fontWeight: '800', fontSize: 14, fontFamily: C.mono },

  clearBtn: { backgroundColor: 'rgba(255, 59, 59, 0.15)', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4 },
  clearBtnText: { color: C.red, fontSize: 10, fontWeight: '800', fontFamily: C.mono },

  // ── Warning Banner ──
  warningBanner: { flexDirection: 'row', backgroundColor: 'rgba(255, 184, 0, 0.1)', borderWidth: 1, borderColor: C.amber, borderRadius: 4, padding: 14, marginBottom: 16, gap: 10, alignItems: 'flex-start' },
  warningIcon: { color: C.amber, fontSize: 20 },
  warningTitle: { color: C.amber, fontSize: 12, fontWeight: '900', fontFamily: C.mono, marginBottom: 4 },
  warningBody: { color: '#fef08a', fontSize: 11, fontFamily: C.mono, lineHeight: 17 },

  // ── New Styles ──
  miniAction: { flex: 1, borderRadius: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  miniActionText: { color: '#fff', fontWeight: '800', fontSize: 11, fontFamily: C.mono },
});
