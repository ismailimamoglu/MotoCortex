import React, { useEffect, useState } from 'react';
import { View, Text, Platform, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { getRegisteredVehicles, deleteRegisteredVehicle, SelectedVehicle } from '../store/garageStore';
import { getLocalizedVehicleBrand, getLocalizedVehicleModel } from '../utils/vehicleStandardizer';
import { BRANDS, MODELS_BY_BRAND, YEARS } from '../data/vehicleData';
import SelectionModal from './SelectionModal';
import { triggerHaptic } from '../utils/haptics';

// Subcomponents
import VehicleSelector from './live-engine/VehicleSelector';
import RegisteredVehicleList from './live-engine/RegisteredVehicleList';
import BluetoothConnectionPanel from './live-engine/BluetoothConnectionPanel';
import EcuStatusBar from './live-engine/EcuStatusBar';

interface LiveEngineHeroProps {
  onConnectPress: () => void;
  onGoToSensors?: () => void;
  onGoToExpertise?: () => void;
  onOpenDiag?: () => void;
  
  // Bluetooth props
  status: string;
  connectionState: string;
  ecuStatus: string;
  adapterStatus: string;
  scannedDevices: any[];
  handleScan: () => Promise<void>;
  handleRealConnect: (id: string, name: string) => void;
  disconnect: () => void;
  enableBluetooth: () => Promise<boolean>;
  lastDeviceId: string | null;
  lastDeviceName: string | null;
  retryEcu: () => void;
  permissionGranted: boolean;
}

export default function LiveEngineHero({
  onConnectPress,
  onGoToSensors,
  onGoToExpertise,
  onOpenDiag,
  status,
  connectionState,
  ecuStatus,
  adapterStatus,
  scannedDevices,
  handleScan,
  handleRealConnect,
  disconnect,
  enableBluetooth,
  lastDeviceId,
  lastDeviceName,
  retryEcu,
  permissionGranted,
}: LiveEngineHeroProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const MONO = colors.mono || (Platform.OS === 'ios' ? 'System' : 'sans-serif');
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, height } = useResponsive();

  const isSmallPhone = height < 820;

  const connectionProgress = useBluetoothStore((state) => state.connectionProgress);
  const connectingDeviceId = useBluetoothStore((state) => state.connectingDeviceId);

  // Telemetry Store (Active Vehicle)
  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const setActiveSessionVehicle = useTelemetryStore((state) => state.setActiveSessionVehicle);

  // States for registered vehicle picker
  const [registeredVehicles, setRegisteredVehicles] = useState<SelectedVehicle[]>([]);
  const [showRegisteredListScreen, setShowRegisteredListScreen] = useState(false);

  // Selection states for inline vehicle builder
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Dropdown visibility
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Search queries
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [modelSearchQuery, setModelSearchQuery] = useState<string>('');

  useEffect(() => {
    getRegisteredVehicles().then(setRegisteredVehicles);
  }, [activeSessionVehicle]);

  useEffect(() => {
    if (activeSessionVehicle) {
      setShowRegisteredListScreen(false);
    }
  }, [activeSessionVehicle]);

  // Real values from Bluetooth Store to update connection status footer
  const isCloneDevice = useBluetoothStore((state) => state.isCloneDevice);
  const suggestedBrandFromVin = useBluetoothStore((state) => state.suggestedBrandFromVin);
  const setSuggestedBrandFromVin = useBluetoothStore((state) => state.setSuggestedBrandFromVin);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);
  const isPro = useAppStore((state) => state.isPro);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (suggestedBrandFromVin && !activeSessionVehicle) {
      setSelectedBrand(suggestedBrandFromVin);
      setSuggestedBrandFromVin(null);
      setShowBrandDropdown(false);
      setShowModelDropdown(true);
    }
  }, [suggestedBrandFromVin, activeSessionVehicle]);

  const isConnected = ecuStatus === 'connected';
  const isScanning = status === 'scanning';
  const isPressable = true;

  const [wasConnected, setWasConnected] = useState(isConnected);

  useEffect(() => {
    if (isConnected && !wasConnected) {
      const statusText = isCloneDevice 
        ? t('bento.settings.safeMode', 'Safe Mode / Clone Adapter') 
        : t('bento.settings.original', 'Original');
      const rateText = isCloneDevice 
        ? t('bento.settings.pollingLow', '2 Hz (Low)') 
        : t('bento.settings.pollingHigh', '4 Hz (High)');
      const protoText = isSimulationMode 
        ? t('bento.settings.simulationObd', 'Simulation OBD') 
        : 'CAN Bus (ISO-15765)';

      Alert.alert(
        t('bento.settings.hardwareHealth', 'HARDWARE HEALTH INFO').toUpperCase(),
        `${t('common.success', 'Success')}! ${t('common.connected', 'CONNECTED')}\n\n` +
        `• ${t('bento.settings.connectionType', 'Connection Type:')} BLE\n` +
        `• ${t('bento.settings.deviceName', 'Device Name:')} ${lastDeviceName || 'OBDII'}\n` +
        `• ${t('bento.settings.protocol', 'Protocol:')} ${protoText}\n` +
        `• ${t('bento.settings.deviceStatus', 'Device Status:')} ${statusText}\n` +
        `• ${t('bento.settings.pollingRate', 'Polling Rate:')} ${rateText}`,
        [{ text: t('common.ok', 'OK') }]
      );
    }
    setWasConnected(isConnected);
  }, [isConnected, wasConnected, isCloneDevice, lastDeviceName, isSimulationMode, t]);

  // Sort brands alphabetically based on localized string in current language
  const sortedBrands = React.useMemo(() => {
    return [...BRANDS]
      .filter((b) => b !== 'other')
      .sort((a, b) => t(`brands.${a}`, a).localeCompare(t(`brands.${b}`, b)))
      .concat(['other']);
  }, [t]);

  const brandOptions = React.useMemo(() => {
    return sortedBrands.map((brandKey) => ({
      label: t(`brands.${brandKey}`, brandKey),
      value: brandKey
    }));
  }, [sortedBrands, t]);

  const yearOptions = React.useMemo(() => {
    return YEARS.map((yr) => ({
      label: yr === 'other' ? t('brands.other', 'Other') : yr,
      value: yr
    }));
  }, [t]);

  // Pre-calculate model options
  const modelOptions = React.useMemo(() => {
    if (!selectedBrand) return [];
    const rawModels = MODELS_BY_BRAND[selectedBrand] || ['other'];
    return rawModels.map((m) => {
      if (m === 'other') {
        return { label: t('brands.other', 'Other'), value: 'other' };
      }
      return { label: m, value: m.toLowerCase().replace(/[^a-z0-9]/g, '_') };
    });
  }, [selectedBrand, t]);

  const handleDeleteRegistered = (v: SelectedVehicle) => {
    Alert.alert(
      t('common.confirm', 'Confirm'),
      t('vehicleSelect.deleteConfirm', 'Are you sure you want to delete this vehicle from registered vehicles?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('common.delete', 'Delete'), 
          style: 'destructive',
          onPress: async () => {
            await deleteRegisteredVehicle(v);
            const updated = await getRegisteredVehicles();
            setRegisteredVehicles(updated);
            if (activeSessionVehicle && 
                activeSessionVehicle.brand.toLowerCase() === v.brand.toLowerCase() &&
                activeSessionVehicle.model.toLowerCase() === v.model.toLowerCase() &&
                activeSessionVehicle.year === v.year) {
              setActiveSessionVehicle(null);
            }
            if (updated.length === 0) {
              setShowRegisteredListScreen(false);
            }
          }
        }
      ]
    );
  };

  // Responsive styles
  const sDyn = React.useMemo(() => {
    return {
      heroContainer: {
        borderWidth: scaleMod(2.5),
        borderRadius: scaleMod(20),
        overflow: 'visible' as const,
        marginVertical: scaleHeight(12),
      },
      mainDisplay: {
        paddingHorizontal: scaleWidth(20),
        paddingVertical: scaleHeight(20),
        zIndex: 10,
      },
      vehicleLabel: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
        letterSpacing: 1.5,
        color: colors.textSec,
        fontFamily: MONO,
        marginBottom: scaleHeight(6),
      },
      vehicleName: {
        fontSize: scaleFont(18),
        fontWeight: '900' as const,
        color: colors.textPri,
        fontFamily: MONO,
      },
      vehicleYear: {
        fontSize: scaleFont(12),
        color: colors.cyan,
        fontFamily: MONO,
        fontWeight: '700' as const,
        marginTop: scaleHeight(2),
      },
      dropdownTrigger: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(10),
        marginTop: scaleHeight(4),
      },
      dropdownTriggerText: {
        fontFamily: MONO,
        fontSize: scaleFont(11),
        fontWeight: '700' as const,
        color: colors.textPri,
      },
      footerStatus: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: scaleWidth(20),
        paddingVertical: scaleHeight(12),
        borderTopWidth: 1,
        justifyContent: 'space-between' as const,
        borderBottomLeftRadius: scaleMod(18),
        borderBottomRightRadius: scaleMod(18),
        zIndex: 1,
      },
      statusDot: {
        width: scaleMod(8),
        height: scaleMod(8),
        borderRadius: scaleMod(4),
        marginEnd: scaleWidth(10),
      },
      statusText: {
        flex: 1,
        fontSize: scaleFont(11),
        fontWeight: '800' as const,
        letterSpacing: 1,
        fontFamily: MONO,
      },
      arrow: {
        fontSize: scaleFont(16),
        fontWeight: '900' as const,
      },
      healthSection: {
        marginTop: scaleHeight(16),
        width: '100%' as const,
      },
      sectionTitle: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
        letterSpacing: 2,
        marginBottom: scaleHeight(8),
        fontFamily: MONO,
        color: colors.textSec,
      },
      healthCard: {
        backgroundColor: `${colors.textPri}05`,
        borderColor: colors.cardBorder,
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        gap: scaleMod(6),
      },
      healthRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingVertical: scaleHeight(2),
      },
      healthLabel: {
        fontSize: scaleFont(11),
        color: colors.textSec,
        fontFamily: MONO,
      },
      healthValue: {
        fontSize: scaleFont(11),
        color: colors.textPri,
        fontFamily: MONO,
        fontWeight: '700' as const,
      },
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, colors, MONO]);

  const containerStyle = [
    sDyn.heroContainer, 
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
    isSmallPhone && { marginVertical: 8, borderRadius: 12, borderWidth: 1.5 }
  ];

  const buttonColor = isConnected
    ? colors.green
    : isScanning
      ? colors.cyan
      : isPressable
        ? (isSimulationMode ? colors.green : colors.cyan)
        : colors.amber;

  const footerStatusStyle = [
    sDyn.footerStatus,
    {
      backgroundColor: isConnected 
        ? `${colors.green}0D` 
        : isScanning
          ? `${colors.cyan}0D`
          : isPressable
            ? (isSimulationMode ? `${colors.green}0D` : `${colors.cyan}0D`)
            : `${colors.amber}0D`,
      borderTopColor: isConnected 
        ? `${colors.green}26` 
        : isScanning
          ? `${colors.cyan}26`
          : isPressable
            ? (isSimulationMode ? `${colors.green}26` : `${colors.cyan}26`)
            : `${colors.amber}26`,
    },
    isSmallPhone && { paddingHorizontal: 16, paddingVertical: 8 }
  ];

  const statusTextStyle = [
    sDyn.statusText, 
    { color: buttonColor },
    isSmallPhone && { fontSize: 9, letterSpacing: 0.5 }
  ];

  const statusTextStr = isConnected
    ? t('dashboard.connectedDevice')
    : isScanning
      ? t('hub.scanningHardware')
      : isPressable
        ? (isSimulationMode 
            ? t('common.exitDemoMode', 'EXIT DEMO MODE') 
            : t('common.enableDemoMode', 'ENABLE DEMO MODE'))
        : t('vehicleSelect.selectVehiclePrompt', 'PLEASE SELECT VEHICLE FIRST');

  const localeMap: Record<string, string> = {
    tr: 'tr-TR', en: 'en-US', pt: 'pt-PT', es: 'es-ES', de: 'de-DE', fr: 'fr-FR',
    it: 'it-IT', ru: 'ru-RU', zh: 'zh-CN', nl: 'nl-NL', ja: 'ja-JP', ko: 'ko-KR',
    pl: 'pl-PL', id: 'id-ID', ar: 'ar-SA', cs: 'cs-CZ', da: 'da-DK', el: 'el-GR',
    fi: 'fi-FI', hu: 'hu-HU', no: 'no-NO', ro: 'ro-RO', sv: 'sv-SE', th: 'th-TH',
    uk: 'uk-UA'
  };

  const appLocale = localeMap[language] || language;

  return (
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingTop: scaleHeight(8), paddingBottom: scaleHeight(40) }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Animated.View style={[containerStyle, { marginVertical: 0 }]}>
        <View style={sDyn.mainDisplay}>
          {showRegisteredListScreen ? (
            <RegisteredVehicleList
              registeredVehicles={registeredVehicles}
              onSelect={(v) => {
                setActiveSessionVehicle(v);
                setShowRegisteredListScreen(false);
              }}
              onDelete={handleDeleteRegistered}
              onBack={() => setShowRegisteredListScreen(false)}
              colors={colors}
              sDyn={sDyn}
              scaleFont={scaleFont}
              scaleMod={scaleMod}
              scaleWidth={scaleWidth}
              scaleHeight={scaleHeight}
              MONO={MONO}
              appLocale={appLocale}
            />
          ) : activeSessionVehicle ? (
            <View>
              <VehicleSelector
                activeSessionVehicle={activeSessionVehicle}
                isConnected={isConnected}
                onDisconnectPress={onConnectPress}
                onChangeVehicle={() => {
                  setActiveSessionVehicle(null);
                }}
                onOpenRegisteredVehicles={() => setShowRegisteredListScreen(true)}
                colors={colors}
                sDyn={sDyn}
                scaleFont={scaleFont}
                scaleMod={scaleMod}
                scaleWidth={scaleWidth}
                scaleHeight={scaleHeight}
                MONO={MONO}
              />
              
              <EcuStatusBar
                ecuStatus={ecuStatus}
                connectionState={connectionState}
                connectionProgress={connectionProgress}
                adapterStatus={adapterStatus}
                retryEcu={retryEcu}
                disconnect={disconnect}
                colors={colors}
                scaleFont={scaleFont}
                scaleMod={scaleMod}
                scaleWidth={scaleWidth}
                scaleHeight={scaleHeight}
                MONO={MONO}
              />



              {isPro && onOpenDiag && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: scaleHeight(10),
                    paddingHorizontal: scaleWidth(14),
                    backgroundColor: `${colors.cyan}0b`,
                    borderColor: `${colors.cyan}26`,
                    borderWidth: 1.2,
                    borderRadius: scaleMod(8),
                    marginTop: scaleHeight(12),
                  }}
                  onPress={() => {
                    triggerHaptic();
                    onOpenDiag();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(8) }}>
                    <Text style={{ fontSize: scaleFont(12) }}>🛠️</Text>
                    <Text style={{
                      color: colors.cyan,
                      fontFamily: MONO,
                      fontSize: scaleFont(10.5),
                      fontWeight: '800',
                      letterSpacing: 0.5,
                    }}>
                      {t('sandbox.advancedTerminal', 'Advanced Connection Terminal (DIAG)')}
                    </Text>
                  </View>
                  <Text style={{
                    color: colors.cyan,
                    fontFamily: MONO,
                    fontSize: scaleFont(12),
                    fontWeight: '900',
                  }}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ gap: scaleHeight(12), paddingVertical: scaleHeight(8) }}>
              <Text style={sDyn.vehicleLabel}>{t('vehicleSelect.noVehicleTitle', 'VEHICLE DETECTION REQUIRED')}</Text>
              <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(11), lineHeight: scaleHeight(15) }}>
                {t('vehicleSelect.noVehicleDesc', 'Vehicle identity will be automatically discovered via OBD-II connection. Please pair and connect to your device below.')}
              </Text>
              
              <BluetoothConnectionPanel
                status={status}
                connectingDeviceId={connectingDeviceId}
                connectionProgress={connectionProgress}
                scannedDevices={scannedDevices}
                permissionGranted={permissionGranted}
                lastDeviceId={lastDeviceId}
                lastDeviceName={lastDeviceName}
                handleScan={handleScan}
                handleRealConnect={handleRealConnect}
                disconnect={disconnect}
                enableBluetooth={enableBluetooth}
                onOpenRegisteredList={() => setShowRegisteredListScreen(true)}
                colors={colors}
                sDyn={sDyn}
                scaleFont={scaleFont}
                scaleMod={scaleMod}
                scaleWidth={scaleWidth}
                scaleHeight={scaleHeight}
                MONO={MONO}
              />
            </View>
          )}
        </View>

        {/* Connection Status Indicator */}
        {isConnected && (
          <View style={footerStatusStyle}>
            <View style={[sDyn.statusDot, { backgroundColor: buttonColor }]} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={statusTextStyle}>
                {statusTextStr}
              </Text>
            </View>
            <Text style={[sDyn.arrow, { color: buttonColor }]}>›</Text>
          </View>
        )}
      </Animated.View>



      {/* Kayıtlı Araçlar button — always at the very bottom, even when no vehicles are registered */}
      {!showRegisteredListScreen && (
        <TouchableOpacity 
          style={[
            sDyn.dropdownTrigger, 
            { 
              backgroundColor: `${colors.textPri}0A`, 
              borderColor: colors.cyan,
              borderWidth: 1.5,
              paddingVertical: scaleHeight(14),
              borderRadius: 12,
              marginTop: scaleHeight(12),
            }
          ]}
          onPress={() => {
            setShowRegisteredListScreen(true);
            setShowBrandDropdown(false);
            setShowModelDropdown(false);
            setShowYearDropdown(false);
          }}
          activeOpacity={0.4}
        >
          <Text style={[sDyn.dropdownTriggerText, { color: colors.cyan, fontSize: scaleFont(11.5) }]} numberOfLines={1}>
            {t('vehicleSelect.viewRegisteredList', 'View Registered Vehicles')} ({registeredVehicles.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Selection Modals */}
      <SelectionModal
        visible={showBrandDropdown}
        onClose={() => setShowBrandDropdown(false)}
        title={t('vehicleSelect.selectBrand', 'Select Brand')}
        options={brandOptions}
        selectedValue={selectedBrand}
        onSelect={(val) => {
          setSelectedBrand(val);
          setShowBrandDropdown(false);
        }}
        showSearch={true}
        searchPlaceholder={t('vehicleSelect.searchBrand', 'Search Brand...')}
      />

      <SelectionModal
        visible={showModelDropdown}
        onClose={() => setShowModelDropdown(false)}
        title={t('vehicleSelect.selectModel', 'Select Model')}
        options={modelOptions}
        selectedValue={selectedModel}
        onSelect={(val) => {
          setSelectedModel(val);
          setShowModelDropdown(false);
        }}
        showSearch={true}
        searchPlaceholder={t('vehicleSelect.searchModel', 'Search Model...')}
      />

      <SelectionModal
        visible={showYearDropdown}
        onClose={() => setShowYearDropdown(false)}
        title={t('vehicleSelect.selectYear', 'Select Year')}
        options={yearOptions}
        selectedValue={selectedYear}
        onSelect={(val) => {
          setSelectedYear(val);
          setShowYearDropdown(false);
        }}
        showSearch={false}
      />
    </ScrollView>
  );
}
