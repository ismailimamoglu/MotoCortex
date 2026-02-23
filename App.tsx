import React, { useState, useEffect } from 'react';
import './global.css';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Platform, PermissionsAndroid, ActivityIndicator, Share, Modal, Alert, FlatList } from 'react-native';
import { useBluetooth } from './src/hooks/useBluetooth';
import { BluetoothDevice } from 'react-native-bluetooth-classic';
import { ADAPTER_COMMANDS } from './src/api/commands';
import { lookupDTC } from './src/data/dtcDictionary';
import { saveGarageRecord, getGarageRecords, deleteGarageRecord, GarageRecord } from './src/store/garageStore';
import BatteryTestModal from './src/components/BatteryTestModal';
import FreezeFrameModal from './src/components/FreezeFrameModal';
import PerformanceModal from './src/components/PerformanceModal';

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
  const {
    status, adapterStatus, ecuStatus, logs,
    enableBluetooth, scanDevices, connect, disconnect,
    sendCommand, retryEcu, clearLogs,
    rpm, coolant, speed, throttle, voltage, engineLoad, intakeAirTemp, manifoldPressure,
    dtcs, vin, odometer, distanceSinceCleared, distanceMilOn,
    isDiagnosticMode, isAdaptationRunning, selectedBrand, setSelectedBrand,
    startPolling, stopPolling,
    runDiagnostics, clearDiagnostics, runAdaptationRoutine,
    lastDeviceId, lastDeviceName, isCloneDevice
  } = useBluetooth();

  const [hasShownCloneWarning, setHasShownCloneWarning] = useState(false);

  const [scannedDevices, setScannedDevices] = useState<BluetoothDevice[]>([]);
  const [manualCmd, setManualCmd] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expertise' | 'service' | 'garage' | 'info'>('dashboard');
  const [showTerminal, setShowTerminal] = useState(false);
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);

  // Garage states
  const [garageRecords, setGarageRecords] = useState<GarageRecord[]>([]);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [saveMake, setSaveMake] = useState('');
  const [saveModel, setSaveModel] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<GarageRecord | null>(null);
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

  // Load garage records on mount and when tab switches to garage
  useEffect(() => {
    if (activeTab === 'garage') {
      getGarageRecords().then(setGarageRecords);
    }
  }, [activeTab]);

  // Clone Device Warning
  useEffect(() => {
    if (isCloneDevice && !hasShownCloneWarning && status === 'connected') {
      Alert.alert(
        "Kopya Adaptör Tespit Edildi ⚠️",
        "ELM327 v2.1 klon adaptör kullandığınız tespit edildi. Bu tip adaptörler düşük kalitelidir ve Odometer okuma gibi 'PRO' özellikleri desteklemeyebilir, hatta bağlantı hatalarına yol açabilir.\n\nEn iyi deneyim için v1.5 veya kaliteli markalı adaptörler (vLinker, OBDLink vb.) kullanmanızı öneririz.",
        [{ text: "Anladım", onPress: () => setHasShownCloneWarning(true) }]
      );
    }
  }, [isCloneDevice, hasShownCloneWarning, status]);

  const handleSaveToGarage = async () => {
    if (!saveMake.trim() || !saveModel.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen Marka ve Model alanını doldurun.');
      return;
    }
    await saveGarageRecord({
      make: saveMake.trim(),
      model: saveModel.trim(),
      vin: vin || 'Bilinmiyor',
      km: odometer === 'UNSUPPORTED' ? 'Desteklenmiyor' : odometer !== null ? `${odometer}` : 'Bilinmiyor',
      dtcs: dtcs,
    });
    setIsSaveModalVisible(false);
    setSaveMake('');
    setSaveModel('');
    Alert.alert('Kaydedildi ✅', 'Ekspertiz sonucu garajınıza eklendi.');
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
  const handleSend = async () => {
    if (!manualCmd.trim()) return;
    try { await sendCommand(manualCmd); setManualCmd(''); } catch (e) { console.error(e); }
  };

  const guardAction = (action: () => void) => {
    if (ecuStatus !== 'connected') {
      Alert.alert('Bağlantı Gerekli', 'Lütfen bu işlemi başlatmak için önce araca bağlanın.');
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
  Şasi No (VIN): ${vin || 'Tespit Edilemedi'}
  Mesafe (KM): ${odometer === 'UNSUPPORTED' ? 'Desteklenmiyor' : odometer !== null ? `${odometer} km` : 'Bilinmiyor'}
  Motor Işığı Yanık: ${distanceMilOn !== null ? `${distanceMilOn} km` : '0 km'}
  Arıza Silineli: ${distanceSinceCleared !== null ? `${distanceSinceCleared} km` : 'Bilinmiyor'}

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
      await Share.share({ message: report, title: 'MotoCortex Teşhis Raporu' });
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
    if (s === 'connected') return 'ONLINE';
    if (s === 'connecting') return 'BAĞLANIYOR';
    if (s === 'error') return 'HATA';
    return 'OFFLINE';
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Connection Screen (not connected to ECU)
  // ═══════════════════════════════════════════════════════════════
  const renderConnectionScreen = () => (
    <ScrollView contentContainerStyle={s.connectPage}>
      {/* Logo */}
      <View style={s.logoArea}>
        <Text style={s.logoText}>MOTOCORTEX</Text>
        <Text style={s.logoSub}>v6 PRO</Text>
      </View>

      {/* Status Badges */}
      <View style={s.badgeRow}>
        <View style={[s.badge, { borderColor: statusColor(adapterStatus) }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor(adapterStatus) }]} />
          <Text style={[s.badgeText, { color: statusColor(adapterStatus) }]}>ADAPTER: {statusLabel(adapterStatus)}</Text>
        </View>
        <View style={[s.badge, { borderColor: statusColor(ecuStatus) }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
          <Text style={[s.badgeText, { color: statusColor(ecuStatus) }]}>ECU: {statusLabel(ecuStatus)}</Text>
        </View>
      </View>

      {/* Actions */}
      {adapterStatus !== 'connected' ? (
        <View style={s.connectActions}>
          <TouchableOpacity style={s.scanBtn} onPress={handleScan}>
            <Text style={s.scanBtnText}>⟐  CİHAZ TARA</Text>
          </TouchableOpacity>

          {lastDeviceId && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionCyan, { marginTop: 12, width: '100%', borderRadius: 12 }, isDiagnosticMode && { opacity: 0.5 }]}
              onPress={() => connect(lastDeviceId, lastDeviceName || 'Last Device')}
              disabled={isDiagnosticMode}
            >
              <Text style={s.actionBtnText}>↺  SON CİHAZA BAĞLAN ({lastDeviceName})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.btEnableBtn} onPress={enableBluetooth}>
            <Text style={s.btEnableBtnText}>BLUETOOTH'U AÇ</Text>
          </TouchableOpacity>

          {status === 'scanning' && (
            <View style={s.scanningRow}>
              <ActivityIndicator color={C.cyan} size="small" />
              <Text style={s.scanningText}>Taranıyor...</Text>
            </View>
          )}

          {scannedDevices.length > 0 && (
            <View style={s.deviceSection}>
              <Text style={s.deviceSectionTitle}>BULUNAN CİHAZLAR</Text>
              {scannedDevices.map(d => (
                <TouchableOpacity key={d.address} style={s.deviceCard} onPress={() => connect(d.address, d.name)}>
                  <View>
                    <Text style={s.deviceName}>{d.name || 'Bilinmeyen Cihaz'}</Text>
                    <Text style={s.deviceMac}>{d.address}</Text>
                  </View>
                  <Text style={s.connectLabel}>BAĞLAN ›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {scannedDevices.length === 0 && permissionGranted && status !== 'scanning' && (
            <Text style={s.hintText}>Eşleştirilmiş OBD cihazlarını bulmak için tarayın.</Text>
          )}
        </View>
      ) : (
        <View style={s.connectActions}>
          {ecuStatus === 'connecting' && (
            <View style={s.ecuConnecting}>
              <ActivityIndicator color={C.amber} size="small" />
              <Text style={[s.scanningText, { color: C.amber }]}>ECU'ya bağlanılıyor...</Text>
            </View>
          )}
          {ecuStatus === 'error' && (
            <View style={s.connectActions}>
              <Text style={s.ecuErrorText}>ECU yanıt vermiyor. Kontağı açın.</Text>
              <TouchableOpacity style={s.retryBtn} onPress={retryEcu}>
                <Text style={s.retryBtnText}>YENİDEN DENE</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={s.disconnectBtn} onPress={disconnect}>
            <Text style={s.disconnectBtnText}>BAĞLANTIYI KES</Text>
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
        {/* Battery Warning */}
        {isBatteryLow && (
          <View style={[s.warningBanner, { borderColor: C.red }]}>
            <Text style={s.warningIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.warningTitle, { color: C.red }]}>AKÜ VOLTAJI DÜŞÜK!</Text>
              <Text style={s.warningBody}>Akü voltajı {voltage} seviyesinde. Aracı çalıştırın veya şarj edin. Düşük voltajda ECU iletişimi kesilebilir.</Text>
            </View>
          </View>
        )}
        {isBatteryWarn && (
          <View style={[s.warningBanner, { borderColor: C.amber }]}>
            <Text style={s.warningIcon}>⚠</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.warningTitle, { color: C.amber }]}>AKÜ ZAYIFLIYOR</Text>
              <Text style={s.warningBody}>Akü voltajı {voltage}. Uzun süreli işlemlerde dikkatli olun.</Text>
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
            <Text style={s.sensorLabel}>KM/H</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={[s.sensorValue, coolant !== null && coolant > 100 ? { color: C.red } : {}]}>
              {coolant !== null ? `${coolant}°` : '--'}
            </Text>
            <Text style={s.sensorLabel}>SICAKLIK</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{throttle !== null ? `${throttle}%` : '--'}</Text>
            <Text style={s.sensorLabel}>GAZ</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={[s.sensorValue, { color: C.cyan, fontSize: 18 }]}>
              {rpm !== null ? (rpm > 7000 ? 'YÜKSEK' : rpm > 3000 ? 'NORMAL' : 'DÜŞÜK') : '--'}
            </Text>
            <Text style={s.sensorLabel}>DEVİR DURUMU</Text>
          </View>
          <View style={[s.sensorCard, { borderColor: isBatteryLow ? C.red : isBatteryWarn ? C.amber : C.border }]}>
            <Text style={[s.sensorValue, { color: isBatteryLow ? C.red : isBatteryWarn ? C.amber : C.green }]}>
              {voltage || '--'}
            </Text>
            <Text style={s.sensorLabel}>AKÜ</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{engineLoad !== null ? `${engineLoad}%` : '--'}</Text>
            <Text style={s.sensorLabel}>YÜK</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={[s.sensorValue, intakeAirTemp !== null && intakeAirTemp > 60 ? { color: C.amber } : {}]}>
              {intakeAirTemp !== null ? `${intakeAirTemp}°` : '--'}
            </Text>
            <Text style={s.sensorLabel}>EMME HAVA</Text>
          </View>
          <View style={s.sensorCard}>
            <Text style={s.sensorValue}>{manifoldPressure !== null ? manifoldPressure : '--'}</Text>
            <Text style={s.sensorLabel}>MANİFOLD kPa</Text>
          </View>
        </View>


        {/* Terminal Toggle */}
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: showTerminal ? C.elevated : C.card, borderWidth: 1, borderColor: showTerminal ? C.cyan : C.border }]}
            onPress={() => setShowTerminal(!showTerminal)}
          >
            <Text style={[s.actionBtnText, { color: showTerminal ? C.cyan : C.textSec, fontSize: 11 }]}>
              {showTerminal ? '▼ TERMİNALİ KAPAT' : '▶ TERMİNAL AÇ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terminal Console */}
        {showTerminal && (
          <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: '#000000', borderRadius: 6, borderWidth: 1, borderColor: '#1a3a1a', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0a0f0a', borderBottomWidth: 1, borderBottomColor: '#1a3a1a' }}>
              <Text style={{ color: '#00ff88', fontSize: 11, fontWeight: '800', fontFamily: C.mono }}>TERMINAL</Text>
              <TouchableOpacity onPress={clearLogs}>
                <Text style={{ color: '#ff5555', fontSize: 10, fontWeight: 'bold', fontFamily: C.mono }}>TEMİZLE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300, paddingHorizontal: 10, paddingVertical: 6 }} nestedScrollEnabled>
              {logs.length === 0 ? (
                <Text style={{ color: '#333', fontSize: 10, fontFamily: C.mono, fontStyle: 'italic' }}>Henüz komut gönderilmedi...</Text>
              ) : (
                logs.map((line, i) => (
                  <Text key={i} style={{
                    color: line.includes('TX:') ? '#00d4ff' : line.includes('ERR') ? '#ff3b3b' : line.includes('RX:') ? '#00ff88' : '#666',
                    fontSize: 10, fontFamily: C.mono, lineHeight: 16,
                  }}>{line}</Text>
                ))
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1a3a1a', padding: 6, gap: 6 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: '#1a3a1a', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, color: '#00ff88', fontFamily: C.mono, fontSize: 12 }}
                value={manualCmd}
                onChangeText={setManualCmd}
                placeholder="OBD komutu yaz... (ATZ, 010C, 22 11 02)"
                placeholderTextColor="#333"
                selectionColor="#00ff88"
              />
              <TouchableOpacity
                style={{ backgroundColor: '#00d4ff', borderRadius: 4, paddingHorizontal: 14, justifyContent: 'center' }}
                onPress={handleSend}
              >
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>⟩</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingBottom: 6, gap: 4, flexWrap: 'wrap' }}>
              <TouchableOpacity style={[s.chip, { borderColor: '#1a3a1a' }]} onPress={() => guardAction(() => sendCommand(ADAPTER_COMMANDS.RPM))}>
                <Text style={[s.chipText, { color: '#00d4ff' }]}>RPM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, { borderColor: '#1a3a1a' }]} onPress={() => guardAction(() => sendCommand(ADAPTER_COMMANDS.VOLTAGE))}>
                <Text style={[s.chipText, { color: '#00ff88' }]}>VOLTAJ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, { borderColor: '#1a3a1a' }]} onPress={() => guardAction(() => sendCommand('ATI'))}>
                <Text style={[s.chipText, { color: '#ffb800' }]}>ATI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.chip, { borderColor: '#1a3a1a' }]} onPress={() => guardAction(() => sendCommand(ADAPTER_COMMANDS.LOAD))}>
                <Text style={[s.chipText, { color: '#a78bfa' }]}>YÜK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Expertise / Diagnostics Tab
  // ═══════════════════════════════════════════════════════════════
  const renderExpertise = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Brand Selector */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>MARKA SEÇİMİ (DERİN TARAMA İÇİN)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.brandScroll} contentContainerStyle={s.brandScrollContent}>
          {(['GENERIC', 'HONDA', 'YAMAHA', 'SUZUKI', 'KTM'] as const).map(brand => (
            <TouchableOpacity
              key={brand}
              style={[s.brandChip, selectedBrand === brand && s.brandChipActive]}
              onPress={() => setSelectedBrand(brand)}
            >
              <Text style={[s.brandChipText, selectedBrand === brand && s.brandChipTextActive]}>
                {brand === 'GENERIC' ? 'STANDART (OBD)' : brand}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View >

      <TouchableOpacity
        style={[s.actionBtn, s.actionPurple, (isDiagnosticMode || isAdaptationRunning) && { opacity: 0.5 }]}
        onPress={() => guardAction(runDiagnostics)}
        disabled={isDiagnosticMode || isAdaptationRunning}
      >
        <Text style={s.actionBtnText}>{isDiagnosticMode ? '⟳ TARANIYOR...' : '⬡  EKSPERTİZ TARAMASI BAŞLAT'}</Text>
      </TouchableOpacity>

      {/* Vehicle Identity */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>ARAÇ KİMLİĞİ & KİLOMETRE</Text>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Şasi No (VIN)</Text>
          <Text style={s.tableValue}>{vin || '—'}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Orijinal KM</Text>
          <Text style={s.tableValue}>{odometer === 'UNSUPPORTED' ? 'Desteklenmiyor' : odometer !== null ? `${odometer} km` : '—'}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Arıza Silineli</Text>
          <Text style={s.tableValue}>{distanceSinceCleared !== null ? `${distanceSinceCleared} km` : '—'}</Text>
        </View>
        <View style={[s.tableRow, { borderBottomWidth: 0 }]}>
          <Text style={s.tableLabel}>Motor Işığı Yanık</Text>
          <Text style={s.tableValue}>{distanceMilOn !== null ? `${distanceMilOn} km` : '—'}</Text>
        </View>
      </View>

      {/* DTCs */}
      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelTitle}>ARIZA KODLARI (DTC)</Text>
          {dtcs.length > 0 && (
            <TouchableOpacity onPress={() => guardAction(clearDiagnostics)} disabled={isDiagnosticMode} style={s.clearBtn}>
              <Text style={s.clearBtnText}>SİL</Text>
            </TouchableOpacity>
          )}
        </View>
        {dtcs.length === 0 ? (
          <View style={s.cleanBadge}>
            <Text style={s.cleanBadgeText}>✓  HATA KODU YOK — TEMİZ</Text>
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

      <TouchableOpacity
        style={[s.actionBtn, { marginTop: 8, backgroundColor: '#1e3a5f' }]}
        onPress={() => guardAction(() => setIsFreezeFrameVisible(true))}
      >
        <Text style={s.actionBtnText}>❄️ DONDURULMUŞ VERİ (FREEZE FRAME)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.actionBtn, { marginTop: 12, backgroundColor: '#075E54' }, isDiagnosticMode && { opacity: 0.5 }]}
        onPress={handleShareReport}
        disabled={isDiagnosticMode}
      >
        <Text style={s.actionBtnText}>📤 RAPORU PAYLAŞ</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.actionBtn, { marginTop: 8, backgroundColor: '#1e40af' }]}
        onPress={() => setIsSaveModalVisible(true)}
      >
        <Text style={s.actionBtnText}>💾 SONUCU KAYDET (GARAJ)</Text>
      </TouchableOpacity>
    </ScrollView >
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

  const renderService = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Warning */}
      <View style={s.warningBanner}>
        <Text style={s.warningIcon}>⚠</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.warningTitle}>GÜVENLİK UYARISI</Text>
          <Text style={s.warningBody}>Bu işlemler sadece kontak açık, motor kapalı (Key ON / Engine OFF) konumdayken yapılmalıdır. Motor çalışırken asla bu işlemleri uygulamayın.</Text>
        </View>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>SERVİS İŞLEMLERİ</Text>
        <Text style={s.panelDesc}>
          Bu buton aşağıdaki işlemleri sırasıyla gerçekleştirir:{`\n\n`}
          • 1. Adım: Arıza kodlarını (DTC) ve Check Engine ışığını siler{`\n`}
          • 2. Adım: Yakıt trim değerlerini sıfırlar{`\n`}
          • 3. Adım: ECU Hard Reset (isteğe bağlı){`\n\n`}
          Her adımda güvenlik onayı istenir.
        </Text>
        <TouchableOpacity
          style={[s.actionBtn, s.actionCyan, isAdaptationRunning && { opacity: 0.4 }]}
          onPress={handleServiceRoutine}
          disabled={isAdaptationRunning || isDiagnosticMode}
        >
          <Text style={s.actionBtnText}>{isAdaptationRunning ? '⟳ İŞLENİYOR...' : '🔧 SERVİS ROUTİNİ BAŞLAT'}</Text>
        </TouchableOpacity>
      </View>

      {/* Battery & Alternator Test */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>⚡ AKÜ & MARŞ TESTİ</Text>
        <Text style={s.panelDesc}>
          Otomatik 3 aşamalı test:{`\n`}
          • Dinlenme voltajı (motor kapalı){`\n`}
          • Marş voltaj düşüşü (5sn ölçüm){`\n`}
          • Şarj voltajı (motor rölanti)
        </Text>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#b45309' }]}
          onPress={() => guardAction(() => setIsBatteryTestVisible(true))}
        >
          <Text style={s.actionBtnText}>⚡ AKÜ TESTİNE BAŞLA</Text>
        </TouchableOpacity>
      </View>

      {/* Performance Timer */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>🏁 PERFORMANS TESTİ</Text>
        <Text style={s.panelDesc}>
          0-60 km/h ve 0-100 km/h geçiş sürelerini ölçer.{`\n`}
          Canlı hız verisini kullanarak otomatik başlatır.
        </Text>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#0e7490' }]}
          onPress={() => guardAction(() => setIsPerformanceVisible(true))}
        >
          <Text style={s.actionBtnText}>🏁 PERFORMANS TESTİ BAŞLAT</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.panel, { borderColor: C.amber, borderWidth: 1 }]}>
        <Text style={[s.panelTitle, { color: C.amber }]}>🚨 DİKKAT</Text>
        <Text style={s.panelDesc}>
          • İşlem sırasında Bluetooth bağlantısını kesmeyin{`\n`}
          • Kontağı kapatmayın{`\n`}
          • Arıza kodu silme geri alınamaz{`\n`}
          • ECU Reset sadece desteklenen beyin ünitelerinde çalışır
        </Text>
      </View>
    </ScrollView >
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Information Tab
  // ═══════════════════════════════════════════════════════════════
  const renderInfo = () => (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={s.panel}>
        <Text style={[s.panelTitle, { color: C.cyan, fontSize: 14, marginBottom: 8 }]}>🏍️ MOTOCORTEX v7 PRO</Text>
        <Text style={s.panelDesc}>
          Profesyonel motosiklet ve hafif araç teşhis uygulaması. ELM327/vLinker adaptörü ile Bluetooth üzerinden OBD-II protokolü kullanarak araç beynine (ECU) bağlanır.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>📊 CANLI İZLEME (8 SENSÖR)</Text>
        <Text style={s.panelDesc}>
          • Motor Devri (RPM) — Anlık motor hızı{'\n'}
          • Araç Hızı (KM/H) — GPS olmadan ECU'dan{'\n'}
          • Motor Sıcaklığı (°C) — Soğutma suyu sıcaklığı{'\n'}
          • Gaz Pozisyonu (%) — Gaz kelebeği açıklığı{'\n'}
          • Devir Durumu — RPM seviye göstergesi{'\n'}
          • Akü Voltajı (ATRV) — Anlık akü durumu{'\n'}
          • Motor Yükü (%) — Motorun yüklenme oranı{'\n'}
          • Emme Hava Sıcaklığı (°C) — IAT sensörü{'\n'}
          • Manifold Basıncı (kPa) — MAP sensörü{'\n\n'}
          Tüm veriler saniyede birkaç kez güncellenir. Terminal üzerinden özel OBD/UDS komutları gönderilebilir.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>🔍 EKSPERTİZ TARAMASI</Text>
        <Text style={s.panelDesc}>
          • Şasi Numarası (VIN) — Araç kimliğini okur{'\n'}
          • Kilometre — ECU'dan orijinal mesafeyi çeker{'\n'}
          • Arıza Kodları (DTC) — Kayıtlı hata kodlarını okur{'\n'}
          • Motor Işığı Mesafesi — Check Engine yanık mesafe{'\n'}
          • Arıza Silineli Mesafe — Son silmeden bu yana km{'\n'}
          • Freeze Frame — Arıza anındaki motor verileri (Mode 02){'\n\n'}
          Rapor WhatsApp, Telegram, E-posta veya diğer uygulamalarla paylaşılabilir. Rapor tüm okunan verileri içerir.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>🔧 SERVİS İŞLEMLERİ</Text>
        <Text style={s.panelDesc}>
          • Arıza Kodu Silme (Mode 04) — Tüm DTC'leri temizler{'\n'}
          • Check Engine Işığı Söndürme — MIL resetler{'\n'}
          • Yakıt Trim Sıfırlama — Öğrenilmiş değerleri siler{'\n'}
          • ECU Hard Reset (UDS $11 01) — Beyin ünitesini yeniden başlatır
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>⚡ AKÜ & MARŞ TESTİ</Text>
        <Text style={s.panelDesc}>
          Otomatik 3 aşamalı akü/regülatör testi:{'\n\n'}
          • 1. Dinlenme voltajı (motor kapalı, ref: 12.4-12.8V){'\n'}
          • 2. Marş voltaj düşüşü (5sn ölçüm, ref: ≥9.6V){'\n'}
          • 3. Şarj voltajı (motor rölanti, ref: 13.5-14.5V){'\n\n'}
          Test sonunda otomatik akü, marş ve regülatör değerlendirmesi yapılır.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>🏁 PERFORMANS TESTİ</Text>
        <Text style={s.panelDesc}>
          0-60 km/h ve 0-100 km/h geçiş sürelerini ölçer.{'\n'}
          Canlı hız verisini kullanarak araç hareket ettiğinde otomatik başlar.{'\n'}
          Dijital kronometre 50ms çözünürlükte çalışır.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>❄️ FREEZE FRAME (ARIZA ANI)</Text>
        <Text style={s.panelDesc}>
          OBD-II Mode 02 sorguları ile Check Engine ışığı yandığı andaki motor parametrelerini okur:{'\n\n'}
          • Arıza anı RPM (PID 020C00){'\n'}
          • Arıza anı hız (PID 020D00){'\n'}
          • Arıza anı sıcaklık (PID 020500){'\n\n'}
          Bu veriler arıza teşhisinde kritik bilgi sağlar.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>📖 DESTEKLENEN HATA KODLARI</Text>
        <Text style={s.panelDesc}>
          Uygulama ~50 yaygın P-kodu tanır ve Türkçe açıklamasını gösterir:{'\n\n'}
          • P01xx — Yakıt ve Hava Sensörleri{'\n'}
          • P02xx — Enjektör Devreleri{'\n'}
          • P03xx — Ateşleme / Misfire Hataları{'\n'}
          • P04xx — Emisyon Sistemi{'\n'}
          • P05xx — Hız ve Rölanti Kontrol{'\n'}
          • P07xx — Şanzıman Sistemi{'\n\n'}
          Bilinmeyen kodlar ham olarak gösterilir.
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>📤 RAPOR PAYLAŞMA</Text>
        <Text style={s.panelDesc}>
          Ekspertiz raporunu tüm platformlardan paylaşabilirsiniz:{'\n\n'}
          • WhatsApp / Telegram / Signal{'\n'}
          • E-posta (Gmail, Outlook vb.){'\n'}
          • SMS / Not uygulamaları{'\n\n'}
          Rapor şunları içerir: VIN, KM, arıza kodları (açıklamalı), motor ışığı mesafesi, arıza silineli mesafe, tüm canlı sensör verileri (RPM, hız, sıcaklık, gaz, yük, IAT, MAP, akü voltajı).
        </Text>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>🔌 DONANIM UYUMLULUĞU</Text>
        <Text style={s.panelDesc}>
          Uygulama ELM327 Bluetooth adaptörleri ile çalışır. Piyasada iki ana sürüm bulunur:{'\n\n'}
          • <Text style={{ color: C.green, fontWeight: '900' }}>v1.5 Adaptörler (ÖNERİLEN):</Text> Orijinal komut setini destekler. Odometer okuma gibi derin teşhis işlemleri için gereklidir.{'\n'}
          • <Text style={{ color: C.red, fontWeight: '900' }}>v2.1 Adaptörler (KLON):</Text> Çoğu ucuz adaptör bu sürümdür. 'PRO' komutlarını desteklemez ve bağlantı sorunları yaratabilir.{'\n\n'}
          En iyi performans için vLinker, OBDLink veya gerçek v1.5 çipler önerilir.
        </Text>
      </View>

      <View style={[s.warningBanner, { marginBottom: 8 }]}>
        <Text style={s.warningIcon}>⚠</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.warningTitle}>ÖNEMLİ UYARILAR</Text>
          <Text style={s.warningBody}>
            • Servis işlemleri kontak AÇIK / motor KAPALI yapılmalıdır{'\n'}
            • Arıza kodu silme geri alınamaz{'\n'}
            • Bluetooth bağlantısı işlem sırasında kesilmemelidir{'\n'}
            • Her araç her komutu desteklemeyebilir{'\n'}
            • ECU Reset bazı eski modellerde çalışmaz{'\n'}
            • Uygulama yalnızca OBD-II uyumlu araçlarla çalışır
          </Text>
        </View>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>🏠 GARAJIM (KAYIT SİSTEMİ)</Text>
        <Text style={s.panelDesc}>
          Ekspertiz taramasından sonra sonuçlarınızı kaydedebilirsiniz:{'\n\n'}
          • "SONUCU KAYDET" butonuna basın{'\n'}
          • Marka ve Model bilgisini girin{'\n'}
          • VIN, Kilometre ve Arıza kodları otomatik kaydedilir{'\n'}
          • Garajım sekmesinden geçmiş kayıtlarınıza ulaşın{'\n'}
          • Detay görüntülemek için kayıda dokunun{'\n'}
          • Silmek için detay ekranında "KAYDI SİL" butonunu kullanın{'\n\n'}
          Tüm veriler cihazınızda yerel olarak saklanır.
        </Text>
      </View>

      <View style={[s.panel, { borderColor: '#7c3aed', borderWidth: 1, marginBottom: 0 }]}>
        <Text style={[s.panelTitle, { color: '#a78bfa' }]}>⭐ MOTOCORTEX PREMIUM</Text>
        <Text style={s.panelDesc}>
          Yakında aktif olacak premium özellikler:{'\n\n'}
          • Gelişmiş marka-özel derin tarama{'\n'}
          • Sınırsız garaj kaydı{'\n'}
          • PDF ekspertiz raporu oluşturma{'\n'}
          • Öncelikli teknik destek{'\n'}
          • Reklamsız kullanım
        </Text>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#7c3aed', marginTop: 8 }]}
          onPress={() => Alert.alert('Yakında!', 'Premium özellikler yakında aktif olacak. Geliştirme aşamasındadır.')}
        >
          <Text style={s.actionBtnText}>PREMIUM'İ KEŞFET</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Garage (Saved Records)
  // ═══════════════════════════════════════════════════════════════
  const renderGarage = () => (
    <View style={[s.tabContent, { flex: 1 }]}>
      {garageRecords.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ color: C.textSec, fontSize: 36, marginBottom: 12 }}>🏍️</Text>
          <Text style={{ color: C.textSec, fontSize: 12, fontFamily: C.mono, textAlign: 'center', lineHeight: 20 }}>
            Henüz kayıtlı araç yok.{'\n'}Ekspertiz taraması yapıp "Sonucu Kaydet" butonuna basın.
          </Text>
        </View>
      ) : (
        <FlatList
          data={garageRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.panel, { marginBottom: 8 }]}
              onPress={() => setSelectedRecord(item)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPri, fontSize: 14, fontWeight: '800', fontFamily: C.mono }}>
                    {item.make} {item.model}
                  </Text>
                  <Text style={{ color: C.textSec, fontSize: 10, fontFamily: C.mono, marginTop: 4 }}>
                    VIN: {item.vin} • {item.km} km
                  </Text>
                  <Text style={{ color: C.textSec, fontSize: 9, fontFamily: C.mono, marginTop: 2 }}>
                    {item.date}
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
                    {item.dtcs.length === 0 ? 'TEMİZ' : `${item.dtcs.length} ARIZA`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
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
            <TouchableOpacity
              onPress={() => setIsConnectModalVisible(true)}
              style={[s.topBadge, { borderColor: statusColor(ecuStatus), paddingHorizontal: 12 }]}
            >
              <View style={[s.topBadgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
              <Text style={[s.topBadgeText, { color: statusColor(ecuStatus) }]}>
                {ecuStatus === 'connected' ? 'BAĞLI' : 'CİHAZ SEÇ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={s.tabBar}>
          {(['dashboard', 'expertise', 'service', 'garage', 'info'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
                {tab === 'dashboard' ? 'İZLEME' : tab === 'expertise' ? 'EKSPERTİZ' : tab === 'service' ? 'SERVİS' : tab === 'garage' ? 'GARAJIM' : 'BİLGİ'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'expertise' && renderExpertise()}
        {activeTab === 'service' && renderService()}
        {activeTab === 'garage' && renderGarage()}
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
              <Text style={{ color: C.textPri, fontSize: 16, fontWeight: '800', fontFamily: C.mono }}>BAĞLANTI AYARLARI</Text>
              <TouchableOpacity onPress={() => setIsConnectModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>KAPAT</Text>
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
              <Text style={{ color: C.textPri, fontSize: 16, fontWeight: '800', fontFamily: C.mono, marginBottom: 16 }}>SONUCU KAYDET</Text>
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
                <Text style={s.actionBtnText}>KAYDET</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: C.elevated, marginTop: 8, borderWidth: 1, borderColor: C.border }]}
                onPress={() => setIsSaveModalVisible(false)}
              >
                <Text style={[s.actionBtnText, { color: C.textSec }]}>VAZGEÇ</Text>
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
              <Text style={{ color: C.textPri, fontSize: 14, fontWeight: '800', fontFamily: C.mono }}>DETAY: {selectedRecord?.make} {selectedRecord?.model}</Text>
              <TouchableOpacity onPress={() => setSelectedRecord(null)} style={{ padding: 10 }}>
                <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>KAPAT</Text>
              </TouchableOpacity>
            </View>
            {selectedRecord && (
              <ScrollView style={{ padding: 16 }}>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>ARAÇ BİLGİSİ</Text>
                  <View style={s.tableRow}><Text style={s.tableLabel}>Tarih</Text><Text style={s.tableValue}>{selectedRecord.date}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>Marka / Model</Text><Text style={s.tableValue}>{selectedRecord.make} {selectedRecord.model}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>Şasi No (VIN)</Text><Text style={s.tableValue}>{selectedRecord.vin}</Text></View>
                  <View style={[s.tableRow, { borderBottomWidth: 0 }]}><Text style={s.tableLabel}>Kilometre</Text><Text style={s.tableValue}>{selectedRecord.km} km</Text></View>
                </View>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>ARIZA KODLARI</Text>
                  {selectedRecord.dtcs.length === 0 ? (
                    <View style={s.cleanBadge}><Text style={s.cleanBadgeText}>✓ TEMİZ</Text></View>
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
                          getGarageRecords().then(setGarageRecords);
                        }
                      }
                    ]);
                  }}
                >
                  <Text style={s.actionBtnText}>KAYDI SİL</Text>
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
    </SafeAreaView >
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
});
